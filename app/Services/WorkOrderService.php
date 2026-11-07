<?php

namespace App\Services;

use App\Models\Complaint;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class WorkOrderService
{
    /**
     * Dapatkan timeout penerimaan dispatch dalam menit (default: 15).
     */
    public function getAcceptTimeoutMinutes(): int
    {
        $setting = DB::table('dispatch_settings')
            ->where('key', 'accept_timeout_menit')
            ->value('value');

        return $setting !== null ? (int) json_decode($setting, true) : 15;
    }

    /**
     * Ambil feed Work Order gabungan (PSB + Komplain) untuk teknisi atau admin.
     * Mendukung tab TAMBAHAN FASE 2:
     * - all (Semua)
     * - unassigned (Belum Ditugaskan)
     * - waiting_acceptance (Menunggu Diterima - dengan hitung mundur)
     * - in_progress (Dikerjakan)
     * - needs_review (Perlu Ditinjau)
     * - completed (Selesai)
     */
    public function getTechnicianWorkOrders(User $user, array $filters = []): Collection
    {
        $isPrivileged = $user->can('workorders.view');
        $team = $user->team;
        $userId = $user->id;

        $typeFilter = $filters['type'] ?? 'all';
        $tabFilter = $filters['tab'] ?? ($filters['status'] ?? 'all');
        $search = $filters['search'] ?? null;
        $dateFilter = $filters['date'] ?? null;
        $timeoutMinutes = $this->getAcceptTimeoutMinutes();

        $allWorkOrders = collect();

        // 1. Ambil Tasks (PSB)
        if ($typeFilter === 'all' || $typeFilter === 'psb') {
            $taskQuery = Task::with(['provisioning.submission', 'assignments.user']);

            if (! $isPrivileged) {
                $taskQuery->where(function ($q) use ($team, $userId) {
                    if ($team) {
                        $q->where('assigned_team', $team)
                            ->orWhere('assigned_team_id', function ($sub) use ($team) {
                                $sub->select('id')->from('teams')->where('name', $team)->limit(1);
                            });
                    }
                    $q->orWhere('teknisi_id', $userId)
                        ->orWhereHas('assignments', fn ($sub) => $sub->where('user_id', $userId));
                });
            } elseif (! empty($filters['team']) && $filters['team'] !== 'all') {
                $taskQuery->where(function ($q) use ($filters) {
                    $q->where('assigned_team', $filters['team'])
                        ->orWhere('assigned_team_id', $filters['team']);
                });
            }

            if ($dateFilter) {
                $taskQuery->whereDate('created_at', $dateFilter);
            }

            $tasks = $taskQuery->latest('updated_at')->get();

            foreach ($tasks as $task) {
                $submission = $task->provisioning?->submission;
                if ($search && $submission) {
                    $s = strtolower($search);
                    $match = str_contains(strtolower($task->task_number ?? ''), $s) ||
                             str_contains(strtolower($submission->customer_name ?? ''), $s) ||
                             str_contains(strtolower($submission->customer_phone ?? ''), $s) ||
                             str_contains(strtolower($submission->address ?? ''), $s);
                    if (! $match) {
                        continue;
                    }
                }

                $allWorkOrders->push($this->formatTaskAsWorkOrder($task, $timeoutMinutes));
            }
        }

        // 2. Ambil Complaints (Gangguan)
        if ($typeFilter === 'all' || $typeFilter === 'complaint') {
            $complaintQuery = Complaint::with(['customer', 'attendances.technician', 'currentAssignment.technician']);

            if (! $isPrivileged) {
                $complaintQuery->where(function ($q) use ($team, $userId) {
                    if ($team) {
                        $q->where('assigned_team', $team)
                            ->orWhere('assigned_team_id', function ($sub) use ($team) {
                                $sub->select('id')->from('teams')->where('name', $team)->limit(1);
                            });
                    }
                    $q->orWhereHas('currentAssignment', function ($sub) use ($team, $userId) {
                        $sub->where('technician_id', $userId);
                        if ($team) {
                            $sub->orWhere('assigned_team', $team);
                        }
                    });
                });
            } elseif (! empty($filters['team']) && $filters['team'] !== 'all') {
                $complaintQuery->where(function ($q) use ($filters) {
                    $q->where('assigned_team', $filters['team'])
                        ->orWhere('assigned_team_id', $filters['team']);
                });
            }

            if ($dateFilter) {
                $complaintQuery->whereDate('created_at', $dateFilter);
            }

            $complaints = $complaintQuery->latest('updated_at')->get();

            foreach ($complaints as $complaint) {
                if ($search) {
                    $s = strtolower($search);
                    $match = str_contains(strtolower($complaint->ticket_number ?? ''), $s) ||
                             str_contains(strtolower($complaint->customer_name ?? ''), $s) ||
                             str_contains(strtolower($complaint->customer_phone ?? ''), $s) ||
                             str_contains(strtolower($complaint->subject ?? ''), $s) ||
                             str_contains(strtolower($complaint->customer_address ?? ''), $s);
                    if (! $match) {
                        continue;
                    }
                }

                $allWorkOrders->push($this->formatComplaintAsWorkOrder($complaint, $timeoutMinutes));
            }
        }

        // Saring berdasarkan Tab Status
        if ($tabFilter && $tabFilter !== 'all') {
            $allWorkOrders = $allWorkOrders->filter(function ($item) use ($tabFilter) {
                return $item['tab_category'] === $tabFilter;
            });
        }

        // Urutkan berdasarkan tingkat urgensi
        return $allWorkOrders->sortBy('urgency_rank')->values();
    }

    /**
     * Hitung total tiket per tab status untuk badge tab di frontend.
     */
    public function getWorkOrderCounts(User $user, array $filters = []): array
    {
        // Ambil semua tanpa memfilter tab
        $all = $this->getTechnicianWorkOrders($user, array_merge($filters, ['tab' => 'all']));

        return [
            'all' => $all->count(),
            'unassigned' => $all->where('tab_category', 'unassigned')->count(),
            'waiting_acceptance' => $all->where('tab_category', 'waiting_acceptance')->count(),
            'in_progress' => $all->where('tab_category', 'in_progress')->count(),
            'needs_review' => $all->where('tab_category', 'needs_review')->count(),
            'completed' => $all->where('tab_category', 'completed')->count(),
        ];
    }

    /**
     * Normalisasi Task (PSB) ke format WorkOrder standar.
     */
    private function formatTaskAsWorkOrder(Task $task, int $timeoutMinutes = 15): array
    {
        $submission = $task->provisioning?->submission;
        $statusVal = $task->status?->value ?? (string) $task->status;

        // Tentukan tab category
        $hasTeam = ! empty($task->assigned_team_id) || ! empty($task->assigned_team);
        $tabCategory = 'in_progress';

        if ($task->review_status === 'needs_review') {
            $tabCategory = 'needs_review';
        } elseif (in_array($statusVal, ['unassigned', 'pending']) || ! $hasTeam) {
            $tabCategory = 'unassigned';
        } elseif ($statusVal === 'assigned') {
            $tabCategory = 'waiting_acceptance';
        } elseif (in_array($statusVal, ['in_progress', 'on_the_way'])) {
            $tabCategory = 'in_progress';
        } elseif (in_array($statusVal, ['phase_1_submitted'])) {
            $tabCategory = 'needs_review';
        } elseif (in_array($statusVal, ['completed'])) {
            $tabCategory = 'completed';
        }

        // Hitung mundur oper otomatis
        $autoReassignDueAt = null;
        if ($statusVal === 'assigned' && $task->assigned_at) {
            $autoReassignDueAt = Carbon::parse($task->assigned_at)->addMinutes($timeoutMinutes)->toIso8601String();
        }

        $urgencyRank = match ($statusVal) {
            'in_progress' => 2,
            'on_the_way' => 3,
            'phase_1_submitted' => 4,
            default => 5,
        };

        return [
            'id' => 'WO-TSK-'.$task->id,
            'raw_id' => $task->id,
            'type' => 'psb',
            'type_label' => 'Pasang Baru (PSB)',
            'ticket_number' => $task->task_number ?? ($submission?->registration_number ?? 'TSK-'.$task->id),
            'title' => 'Instalasi PSB — '.($submission?->package_name ?? 'Internet Fibermedia'),
            'category' => 'installation',
            'customer_name' => $submission?->customer_name ?? 'Pelanggan PSB',
            'customer_phone' => $submission?->phone ?? $submission?->customer_phone ?? '-',
            'customer_address' => $submission?->address ?? '-',
            'area' => $submission?->area ?? ($submission?->village ? "{$submission->village}, {$submission->district}" : 'Malang Raya'),
            'coordinates' => [
                'lat' => $submission?->lat ? (float) $submission->lat : null,
                'lng' => $submission?->lng ? (float) $submission->lng : null,
            ],
            'priority' => 'medium',
            'status' => $statusVal,
            'tab_category' => $tabCategory,
            'review_status' => $task->review_status ?? 'none',
            'review_flags' => $task->review_flags ?? [],
            'assigned_team' => $task->assignedTeam?->name ?? $task->assigned_team ?? 'Belum Ditugaskan',
            'assigned_team_id' => $task->assigned_team_id,
            'assigned_at' => $task->assigned_at?->toIso8601String(),
            'auto_reassign_due_at' => $autoReassignDueAt,
            'is_two_phase' => true,
            'phase_1_done' => (bool) ($task->phase_1_submitted_at || ($task->customer_signature_path && isset($task->photos['after']))),
            'phase_2_done' => $statusVal === 'completed',
            'sla_due_at' => null,
            'sla_due_timestamp' => PHP_INT_MAX,
            'is_sla_breached' => false,
            'created_at' => $task->created_at?->toIso8601String(),
            'updated_at' => $task->updated_at?->toIso8601String(),
            'urgency_rank' => $urgencyRank,
        ];
    }

    /**
     * Normalisasi Complaint (Gangguan) ke format WorkOrder standar.
     */
    private function formatComplaintAsWorkOrder(Complaint $complaint, int $timeoutMinutes = 15): array
    {
        $statusVal = $complaint->status?->value ?? (string) $complaint->status;
        $priorityVal = $complaint->priority?->value ?? (string) $complaint->priority;

        $hasTeam = ! empty($complaint->assigned_team_id) || ! empty($complaint->assigned_team);
        $tabCategory = 'in_progress';

        if ($complaint->review_status === 'needs_review') {
            $tabCategory = 'needs_review';
        } elseif (in_array($statusVal, ['unassigned', 'open']) && ! $hasTeam) {
            $tabCategory = 'unassigned';
        } elseif ($statusVal === 'assigned') {
            $tabCategory = 'waiting_acceptance';
        } elseif (in_array($statusVal, ['in_progress', 'pending_customer'])) {
            $tabCategory = 'in_progress';
        } elseif (in_array($statusVal, ['phase_1_completed'])) {
            $tabCategory = 'needs_review';
        } elseif (in_array($statusVal, ['resolved', 'closed'])) {
            $tabCategory = 'completed';
        }

        // Hitung mundur oper otomatis
        $autoReassignDueAt = null;
        if ($statusVal === 'assigned' && $complaint->assigned_at) {
            $autoReassignDueAt = Carbon::parse($complaint->assigned_at)->addMinutes($timeoutMinutes)->toIso8601String();
        }

        $urgencyRank = match ($priorityVal) {
            'critical' => 1,
            'high' => 2,
            'medium' => 3,
            default => 4,
        };

        if ($statusVal === 'in_progress') {
            $urgencyRank -= 0.5;
        }

        $dueTs = $complaint->sla_resolve_due_at ? $complaint->sla_resolve_due_at->timestamp : PHP_INT_MAX;

        return [
            'id' => 'WO-CMP-'.$complaint->id,
            'raw_id' => $complaint->id,
            'type' => 'complaint',
            'type_label' => 'Gangguan (Komplain)',
            'ticket_number' => $complaint->ticket_number,
            'title' => $complaint->subject ?? 'Gangguan Layanan Internet',
            'category' => $complaint->category?->value ?? (string) $complaint->category,
            'customer_name' => $complaint->customer_name,
            'customer_phone' => $complaint->customer_phone,
            'customer_address' => $complaint->customer_address,
            'area' => $complaint->area,
            'coordinates' => [
                'lat' => $complaint->customer_lat ? (float) $complaint->customer_lat : null,
                'lng' => $complaint->customer_lng ? (float) $complaint->customer_lng : null,
            ],
            'priority' => $priorityVal,
            'status' => $statusVal,
            'tab_category' => $tabCategory,
            'review_status' => $complaint->review_status ?? 'none',
            'review_flags' => $complaint->review_flags ?? [],
            'assigned_team' => $complaint->assignedTeam?->name ?? $complaint->assigned_team ?? 'Belum Ditugaskan',
            'assigned_team_id' => $complaint->assigned_team_id,
            'assigned_at' => $complaint->assigned_at?->toIso8601String(),
            'auto_reassign_due_at' => $autoReassignDueAt,
            'is_two_phase' => true,
            'phase_1_done' => (bool) ($complaint->phase_1_completed_at || $complaint->evidence),
            'phase_2_done' => $complaint->allTeamMembersAttended(),
            'sla_due_at' => $complaint->sla_resolve_due_at?->toIso8601String(),
            'sla_due_timestamp' => $dueTs,
            'is_sla_breached' => (bool) $complaint->is_sla_breached,
            'created_at' => $complaint->created_at?->toIso8601String(),
            'updated_at' => $complaint->updated_at?->toIso8601String(),
            'urgency_rank' => $urgencyRank,
        ];
    }
}
