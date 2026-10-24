<?php

namespace App\Modules\Dispatch\Services;

use App\Enums\TaskAssignmentStatus;
use App\Events\TeamAssigned;
use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\DailyAttendance;
use App\Models\RoundRobinPointer;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\Team;
use App\Models\TicketEvent;
use App\Models\User;
use App\Services\WebPushService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DispatchService
{
    /**
     * Dispatch satu tiket (Task PSB atau Complaint) ke tim teknisi yang siap
     * secara bergilir (round-robin) dan aman dari race condition (lockForUpdate).
     * Sesuai Aturan Bisnis 1: Dua antrean terpisah (PSB dan Gangguan).
     *
     * @param  Task|Complaint  $ticket
     * @param  string  $queueType  'psb'|'complaint'
     */
    public function assign($ticket, string $queueType, array $options = []): array
    {
        return DB::transaction(function () use ($ticket, $queueType, $options) {
            $today = Carbon::today()->toDateString();

            // 1. Ambil pointer antrean dengan lockForUpdate di transaksi yang sama
            $pointer = RoundRobinPointer::lockForUpdate()->firstOrCreate(
                ['queue_type' => $queueType],
                ['last_team_id' => null]
            );

            // 2. Ambil konfigurasi dispatch
            $timeoutMinutes = (int) $this->getSetting($queueType, 'accept_timeout_menit', 15);
            $minMembersPresent = (int) $this->getSetting(null, 'min_members_present', 1);
            $maxOpenTickets = $this->getSetting($queueType, 'max_open_tickets_per_team', null);

            // 3. Ambil tim aktif berurutan menurut order_index
            $teams = Team::where('is_active', true)
                ->orderBy('order_index')
                ->with(['activeUsers'])
                ->get();

            if ($teams->isEmpty()) {
                $this->markAsUnassigned($ticket, 'Tidak ada tim aktif terdaftar', $queueType);

                return [
                    'assigned' => false,
                    'status' => 'unassigned',
                    'message' => 'Tidak ada tim aktif',
                ];
            }

            // Hitung kehadiran teknisi hari ini per tim (Aturan 2)
            $readyTeamMap = [];
            foreach ($teams as $team) {
                $activeUserIds = $team->activeUsers->pluck('id')->toArray();
                if (empty($activeUserIds)) {
                    continue;
                }

                $presentCount = DailyAttendance::whereIn('user_id', $activeUserIds)
                    ->whereDate('work_date', $today)
                    ->where('status', 'hadir')
                    ->whereNotNull('check_in_at')
                    ->whereNull('check_out_at')
                    ->count();

                // Cek batas tiket terbuka bila diatur
                $openTicketsCount = 0;
                if ($maxOpenTickets !== null) {
                    $openTasks = Task::where('assigned_team_id', $team->id)
                        ->whereNotIn('status', ['completed', 'cancelled'])->count();
                    $openComplaints = Complaint::where('assigned_team_id', $team->id)
                        ->whereNotIn('status', ['resolved', 'closed', 'cancelled'])->count();
                    $openTicketsCount = $openTasks + $openComplaints;
                }

                $isReady = ($presentCount >= $minMembersPresent) &&
                    ($maxOpenTickets === null || $openTicketsCount < $maxOpenTickets);

                if ($isReady) {
                    $readyTeamMap[$team->id] = $team;
                }
            }

            // Aturan 3: Tidak ada tim siap -> tiket "Belum Ditugaskan"
            if (empty($readyTeamMap)) {
                $this->markAsUnassigned($ticket, 'Tidak ada tim yang memenuhi kriteria siap hari ini', $queueType);

                return [
                    'assigned' => false,
                    'status' => 'unassigned',
                    'message' => 'Tidak ada tim siap',
                ];
            }

            // 4. Cari tim berikutnya setelah last_team_id (urutan order_index)
            $teamCount = $teams->count();
            $lastTeamIndex = -1;

            if ($pointer->last_team_id) {
                foreach ($teams as $idx => $t) {
                    if ((int) $t->id === (int) $pointer->last_team_id) {
                        $lastTeamIndex = $idx;
                        break;
                    }
                }
            }

            $selectedTeam = null;
            for ($step = 1; $step <= $teamCount; $step++) {
                $candidateIdx = ($lastTeamIndex + $step) % $teamCount;
                $candidateTeam = $teams[$candidateIdx];
                if (isset($readyTeamMap[$candidateTeam->id])) {
                    $selectedTeam = $candidateTeam;
                    break;
                }
            }

            if (! $selectedTeam) {
                $this->markAsUnassigned($ticket, 'Tidak ada tim yang memenuhi kriteria siap hari ini', $queueType);

                return [
                    'assigned' => false,
                    'status' => 'unassigned',
                    'message' => 'Tidak ada tim siap',
                ];
            }

            // 5. Update penugasan tiket
            $deadline = Carbon::now()->addMinutes($timeoutMinutes);

            $ticket->assigned_team_id = $selectedTeam->id;
            $ticket->assigned_team = $selectedTeam->name;
            $ticket->assigned_at = now();
            $ticket->response_deadline_at = $deadline;
            $ticket->status = 'assigned';
            $ticket->unassigned_since = null;
            $ticket->accepted_at = null;
            $ticket->accepted_by_id = null;

            if ($ticket instanceof Task) {
                $teamMembers = $selectedTeam->activeUsers;
                if (! $ticket->teknisi_id && $teamMembers->isNotEmpty()) {
                    $ticket->teknisi_id = $teamMembers->first()->id;
                }
                $ticket->save();

                // Pastikan anggota tim memiliki TaskAssignment
                foreach ($teamMembers as $member) {
                    TaskAssignment::firstOrCreate([
                        'task_id' => $ticket->id,
                        'user_id' => $member->id,
                    ], [
                        'status' => TaskAssignmentStatus::ASSIGNED,
                        'assigned_at' => now(),
                    ]);
                }
            } elseif ($ticket instanceof Complaint) {
                $ticket->save();

                $actorId = $options['actor_id'] ?? auth()->id() ?? $ticket->created_by_id ?? User::first()?->id;

                ComplaintAssignment::create([
                    'complaint_id' => $ticket->id,
                    'technician_id' => $selectedTeam->activeUsers->first()?->id ?? User::first()?->id,
                    'assigned_team' => $selectedTeam->name,
                    'assigned_by_id' => $actorId,
                    'assigned_by_role' => auth()->user()?->hasRole('Superadmin') ? 'superadmin' : 'system',
                    'is_manual_assignment' => false,
                    'status' => 'assigned',
                    'notes' => $options['reason'] ?? 'Penugasan otomatis round-robin',
                    'assigned_at' => now(),
                ]);
            } else {
                $ticket->save();
            }

            // 6. Geser pointer
            $pointer->last_team_id = $selectedTeam->id;
            $pointer->save();

            // 7. Catat assignment_logs
            DB::table('assignment_logs')->insert([
                'assignable_type' => get_class($ticket),
                'assignable_id' => $ticket->id,
                'ticket_type' => $queueType,
                'ticket_id' => $ticket->id,
                'team_id' => $selectedTeam->id,
                'action' => 'assigned',
                'reason' => $options['reason'] ?? 'Giliran otomatis round-robin',
                'actor_id' => $options['actor_id'] ?? auth()->id(),
                'attempt_no' => ($ticket->reassign_count ?? 0) + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 8. Catat ticket_events
            DB::table('ticket_events')->insert([
                'eventable_type' => get_class($ticket),
                'eventable_id' => $ticket->id,
                'actor_id' => $options['actor_id'] ?? auth()->id(),
                'event' => 'assigned',
                'from_status' => $ticket->getOriginal('status') ?? 'created',
                'to_status' => 'assigned',
                'payload' => json_encode([
                    'team_id' => $selectedTeam->id,
                    'team_name' => $selectedTeam->name,
                    'deadline' => $deadline->toIso8601String(),
                    'queue' => $queueType,
                ]),
                'occurred_at' => now(),
            ]);

            // 9. Realtime event (Reverb) & Web Push ke personil tim yang hadir
            $this->broadcastAndNotify($selectedTeam, $ticket, $queueType, $deadline);

            Log::info("Ticket dispatched: {$queueType} #{$ticket->id} -> Team {$selectedTeam->name}");

            return [
                'assigned' => true,
                'status' => 'assigned',
                'team' => $selectedTeam,
                'deadline' => $deadline,
            ];
        });
    }

    /**
     * Penugasan manual oleh Admin/Superadmin dengan alasan wajib.
     */
    public function assignManual($ticket, string $queueType, Team $team, string $reason, ?int $actorId = null): array
    {
        return DB::transaction(function () use ($ticket, $queueType, $team, $reason, $actorId) {
            $timeoutMinutes = (int) $this->getSetting($queueType, 'accept_timeout_menit', 15);
            $deadline = Carbon::now()->addMinutes($timeoutMinutes);

            $ticket->assigned_team_id = $team->id;
            $ticket->assigned_team = $team->name;
            $ticket->assigned_at = now();
            $ticket->response_deadline_at = $deadline;
            $ticket->status = 'assigned';
            $ticket->unassigned_since = null;
            $ticket->accepted_at = null;
            $ticket->accepted_by_id = null;

            if ($ticket instanceof Task) {
                $teamMembers = $team->activeUsers;
                if (! $ticket->teknisi_id && $teamMembers->isNotEmpty()) {
                    $ticket->teknisi_id = $teamMembers->first()->id;
                }
                $ticket->save();

                foreach ($teamMembers as $member) {
                    TaskAssignment::firstOrCreate([
                        'task_id' => $ticket->id,
                        'user_id' => $member->id,
                    ], [
                        'status' => TaskAssignmentStatus::ASSIGNED,
                        'assigned_at' => now(),
                    ]);
                }
            } elseif ($ticket instanceof Complaint) {
                $ticket->save();

                ComplaintAssignment::create([
                    'complaint_id' => $ticket->id,
                    'technician_id' => $team->activeUsers->first()?->id,
                    'assigned_team' => $team->name,
                    'assigned_by_id' => $actorId,
                    'assigned_by_role' => 'admin',
                    'is_manual_assignment' => true,
                    'status' => 'assigned',
                    'notes' => $reason,
                    'assigned_at' => now(),
                ]);
            } else {
                $ticket->save();
            }

            DB::table('assignment_logs')->insert([
                'assignable_type' => get_class($ticket),
                'assignable_id' => $ticket->id,
                'ticket_type' => $queueType,
                'ticket_id' => $ticket->id,
                'team_id' => $team->id,
                'action' => 'assigned',
                'reason' => 'Penugasan manual: '.$reason,
                'actor_id' => $actorId ?? auth()->id(),
                'attempt_no' => ($ticket->reassign_count ?? 0) + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            TicketEvent::record(
                ticket: $ticket,
                event: 'manual_assigned',
                fromStatus: $fromStatus ?? null,
                toStatus: 'assigned',
                payload: [
                    'team_id' => $team->id,
                    'team_name' => $team->name,
                    'reason' => $reason,
                ],
                actorId: $actorId ?? auth()->id()
            );

            $this->broadcastAndNotify($team, $ticket, $queueType, $deadline);

            return [
                'assigned' => true,
                'status' => 'assigned',
                'team' => $team,
                'deadline' => $deadline,
            ];
        });
    }

    /**
     * Terima tiket oleh personil tim yang hadir di PWA (Aturan: Siapa pun anggota hadir boleh menerima).
     */
    public function acceptTicket($ticket, string $queueType, User $user): array
    {
        return DB::transaction(function () use ($ticket, $queueType, $user) {
            $assignedTeamId = $ticket->assigned_team_id;
            $team = $ticket->assignedTeam ?? ($assignedTeamId ? Team::find($assignedTeamId) : null);

            if (! $team) {
                throw new \DomainException('Tiket belum ditugaskan ke tim.');
            }

            // Validasi: User harus anggota tim terkait (atau admin)
            $isMember = $team->members()->where('user_id', $user->id)->whereNull('left_at')->exists()
                || $user->teams()->where('teams.id', $team->id)->exists()
                || (int) $user->team_id === (int) $team->id
                || $user->team === $team->name;

            if (! $isMember && ! $user->hasRole(['Admin', 'Superadmin'])) {
                throw new \DomainException('Hanya personil tim terkait yang dapat menerima tiket.');
            }

            // Validasi: User harus sudah absen masuk hari ini
            $today = Carbon::today()->toDateString();
            $hasCheckedIn = DailyAttendance::where('user_id', $user->id)
                ->whereDate('work_date', $today)
                ->where('status', 'hadir')
                ->whereNotNull('check_in_at')
                ->whereNull('check_out_at')
                ->exists();

            if (! $hasCheckedIn && ! $user->hasRole(['Admin', 'Superadmin'])) {
                throw new \DomainException('Anda harus absen masuk hari ini sebelum menerima tiket.');
            }

            $ticket->accepted_at = now();
            $ticket->accepted_by_id = $user->id;
            $ticket->status = 'in_progress';
            $ticket->save();

            DB::table('assignment_logs')->insert([
                'assignable_type' => get_class($ticket),
                'assignable_id' => $ticket->id,
                'ticket_type' => $queueType,
                'ticket_id' => $ticket->id,
                'team_id' => $team->id,
                'action' => 'accepted',
                'reason' => "Tiket diterima oleh teknisi {$user->name}",
                'actor_id' => $user->id,
                'attempt_no' => ($ticket->reassign_count ?? 0) + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('ticket_events')->insert([
                'eventable_type' => get_class($ticket),
                'eventable_id' => $ticket->id,
                'actor_id' => $user->id,
                'event' => 'accepted',
                'from_status' => 'assigned',
                'to_status' => 'in_progress',
                'payload' => json_encode(['accepted_by' => $user->name]),
                'occurred_at' => now(),
            ]);

            return [
                'success' => true,
                'status' => 'in_progress',
                'message' => 'Tiket berhasil diterima oleh '.$user->name,
                'ticket' => $ticket->fresh(),
            ];
        });
    }

    /**
     * Tolak tiket oleh personil tim di PWA dengan alasan wajib, langsung oper ke tim berikutnya.
     */
    public function declineTicket($ticket, string $queueType, User $user, string $reason): array
    {
        return DB::transaction(function () use ($ticket, $queueType, $user, $reason) {
            $team = $ticket->assignedTeam ?? ($ticket->assigned_team_id ? Team::find($ticket->assigned_team_id) : null);
            $previousTeamId = $ticket->assigned_team_id;

            DB::table('assignment_logs')->insert([
                'assignable_type' => get_class($ticket),
                'assignable_id' => $ticket->id,
                'ticket_type' => $queueType,
                'ticket_id' => $ticket->id,
                'team_id' => $previousTeamId,
                'action' => 'declined',
                'reason' => $reason,
                'actor_id' => $user->id,
                'attempt_no' => ($ticket->reassign_count ?? 0) + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $maxOper = (int) $this->getSetting($queueType, 'max_oper', 3);
            $ticket->increment('reassign_count');

            if ($ticket->reassign_count >= $maxOper) {
                $this->escalateToAdmin($ticket, "Batas oper tercapai setelah penolakan: {$reason}", $queueType);

                return [
                    'success' => true,
                    'status' => 'escalated_to_admin',
                    'message' => 'Tiket dielevasi ke admin karena batas oper maksimal telah tercapai.',
                ];
            }

            $reassignResult = $this->assign($ticket, $queueType, [
                'reason' => "Oper otomatis karena ditolak oleh tim {$team?->name}: {$reason}",
                'actor_id' => $user->id,
            ]);

            return [
                'success' => true,
                'status' => $reassignResult['status'],
                'message' => 'Tiket berhasil ditolak dan dioper ke tim berikutnya.',
                'team' => $reassignResult['team'] ?? null,
            ];
        });
    }

    /**
     * Reassign tiket yang melewati response_deadline_at (Aturan 4).
     * Jika melebihi batas oper (default 3), tiket dioper ke admin.
     */
    public function reassignOnTimeout($ticket, string $queueType): array
    {
        $maxOper = (int) $this->getSetting($queueType, 'max_oper', 3);
        $currentReassigns = (int) ($ticket->reassign_count ?? 0);

        if ($currentReassigns >= $maxOper) {
            $this->escalateToAdmin($ticket, "Batas oper tercapai ({$currentReassigns}/{$maxOper} kali tidak direspons)", $queueType);

            return [
                'reassigned' => false,
                'status' => 'escalated_to_admin',
                'message' => 'Tiket dielevasi ke admin',
            ];
        }

        $ticket->increment('reassign_count');

        DB::table('assignment_logs')->insert([
            'assignable_type' => get_class($ticket),
            'assignable_id' => $ticket->id,
            'ticket_type' => $queueType,
            'ticket_id' => $ticket->id,
            'team_id' => $ticket->assigned_team_id,
            'action' => 'timeout',
            'reason' => 'Batas waktu penerimaan habis (oper otomatis)',
            'actor_id' => null,
            'attempt_no' => $ticket->reassign_count,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('ticket_events')->insert([
            'eventable_type' => get_class($ticket),
            'eventable_id' => $ticket->id,
            'actor_id' => null,
            'event' => 'timeout_reassigned',
            'from_status' => $ticket->status,
            'to_status' => 'assigned',
            'payload' => json_encode([
                'previous_team_id' => $ticket->assigned_team_id,
                'reassign_count' => $ticket->reassign_count,
            ]),
            'occurred_at' => now(),
        ]);

        return $this->assign($ticket, $queueType, [
            'reason' => 'Oper otomatis karena batas waktu respons tim sebelumnya habis',
        ]);
    }

    /**
     * Dispatch semua tiket "Belum Ditugaskan" (Aturan 3).
     * Dipanggil setiap 2 menit oleh scheduler dan otomatis saat teknisi absen masuk.
     */
    public function dispatchUnassigned(): array
    {
        $dispatched = ['psb' => 0, 'complaint' => 0];

        // 1. Unassigned PSB tasks
        $unassignedTasks = Task::where('status', 'unassigned')
            ->orWhere(function ($q) {
                $q->whereNull('assigned_team_id')
                    ->whereIn('status', ['created', 'pending', 'unassigned']);
            })
            ->orderBy('created_at')
            ->get();

        foreach ($unassignedTasks as $task) {
            $result = $this->assign($task, 'psb', ['reason' => 'Diproses otomatis dari antrean tiket belum ditugaskan']);
            if ($result['assigned']) {
                $dispatched['psb']++;
            }
        }

        // 2. Unassigned Complaints
        $unassignedComplaints = Complaint::where('status', 'unassigned')
            ->orWhere(function ($q) {
                $q->whereNull('assigned_team_id')
                    ->whereIn('status', ['submitted', 'open', 'unassigned']);
            })
            ->orderBy('created_at')
            ->get();

        foreach ($unassignedComplaints as $complaint) {
            $result = $this->assign($complaint, 'complaint', ['reason' => 'Diproses otomatis dari antrean tiket belum ditugaskan']);
            if ($result['assigned']) {
                $dispatched['complaint']++;
            }
        }

        return $dispatched;
    }

    /**
     * Hitung daftar tim yang siap beroperasi berdasarkan kehadiran hari ini.
     *
     * @return Team[]
     */
    public function getReadyTeams(?string $date = null): array
    {
        $targetDate = $date ?? Carbon::today()->toDateString();
        $minMembersPresent = (int) $this->getSetting(null, 'min_members_present', 1);

        $teams = Team::where('is_active', true)
            ->orderBy('order_index')
            ->with(['activeUsers'])
            ->get();

        $readyTeams = [];
        foreach ($teams as $team) {
            $activeUserIds = $team->activeUsers->pluck('id')->toArray();
            if (empty($activeUserIds)) {
                continue;
            }

            $presentCount = DailyAttendance::whereIn('user_id', $activeUserIds)
                ->whereDate('work_date', $targetDate)
                ->where('status', 'hadir')
                ->whereNotNull('check_in_at')
                ->whereNull('check_out_at')
                ->count();

            if ($presentCount >= $minMembersPresent) {
                $readyTeams[] = $team;
            }
        }

        return $readyTeams;
    }

    public function markAsUnassigned($ticket, string $reason, string $queueType = 'ticket'): void
    {
        $fromStatus = $ticket->status;
        $ticket->status = 'unassigned';
        $ticket->assigned_team_id = null;
        $ticket->assigned_team = null;
        $ticket->response_deadline_at = null;
        $ticket->unassigned_since = now();
        $ticket->save();

        DB::table('assignment_logs')->insert([
            'assignable_type' => get_class($ticket),
            'assignable_id' => $ticket->id,
            'ticket_type' => $queueType,
            'ticket_id' => $ticket->id,
            'team_id' => null,
            'action' => 'pending',
            'reason' => $reason,
            'actor_id' => auth()->id(),
            'attempt_no' => ($ticket->reassign_count ?? 0) + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('ticket_events')->insert([
            'eventable_type' => get_class($ticket),
            'eventable_id' => $ticket->id,
            'actor_id' => auth()->id(),
            'event' => 'marked_unassigned',
            'from_status' => $fromStatus,
            'to_status' => 'unassigned',
            'payload' => json_encode(['reason' => $reason]),
            'occurred_at' => now(),
        ]);
    }

    public function escalateToAdmin($ticket, string $reason, string $queueType = 'ticket'): void
    {
        $fromStatus = $ticket->status;
        $ticket->status = 'escalated_to_admin';
        $ticket->assigned_team_id = null;
        $ticket->assigned_team = null;
        $ticket->response_deadline_at = null;
        $ticket->save();

        DB::table('assignment_logs')->insert([
            'assignable_type' => get_class($ticket),
            'assignable_id' => $ticket->id,
            'ticket_type' => $queueType,
            'ticket_id' => $ticket->id,
            'team_id' => null,
            'action' => 'timeout',
            'reason' => 'Dielevasi ke Admin: '.$reason,
            'actor_id' => null,
            'attempt_no' => $ticket->reassign_count,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('ticket_events')->insert([
            'eventable_type' => get_class($ticket),
            'eventable_id' => $ticket->id,
            'actor_id' => null,
            'event' => 'escalated_to_admin',
            'from_status' => $fromStatus,
            'to_status' => 'escalated_to_admin',
            'payload' => json_encode(['reason' => $reason]),
            'occurred_at' => now(),
        ]);

        Log::warning('Ticket escalated to admin: '.get_class($ticket)." #{$ticket->id} reason: {$reason}");
    }

    /**
     * Broadcast realtime event via Reverb and send Web Push to present team members.
     */
    protected function broadcastAndNotify(Team $team, $ticket, string $queueType, Carbon $deadline): void
    {
        // 1. Reverb realtime event
        try {
            event(new TeamAssigned($team, $ticket, $queueType, $deadline->toIso8601String()));
        } catch (\Throwable $e) {
            Log::warning('Reverb broadcasting failed: '.$e->getMessage());
        }

        // 2. Web Push ke personil yang hadir
        try {
            $today = Carbon::today()->toDateString();
            $activeUserIds = $team->activeUsers->pluck('id')->toArray();
            $presentMembers = User::whereIn('id', $activeUserIds)
                ->whereHas('dailyAttendances', function ($q) use ($today) {
                    $q->whereDate('work_date', $today)
                        ->where('status', 'hadir')
                        ->whereNotNull('check_in_at')
                        ->whereNull('check_out_at');
                })->get();

            $webPush = app(WebPushService::class);
            $ticketNumber = $ticket->task_number ?? $ticket->ticket_number ?? "#{$ticket->id}";

            foreach ($presentMembers as $member) {
                $webPush->sendToUser(
                    $member,
                    "Tiket Baru Ditugaskan ({$queueType})",
                    "Tiket {$ticketNumber} telah ditugaskan ke {$team->name}. Harap konfirmasi penerimaan di aplikasi.",
                    "/field/tickets/{$queueType}/{$ticket->id}"
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Web push notification failed: '.$e->getMessage());
        }
    }

    public function getSetting(?string $ticketType, string $key, $default = null)
    {
        // Check direct columns on dispatch_settings table first if key matches
        $columnMap = [
            'min_members_present' => 'min_members_present',
            'accept_timeout_menit' => 'accept_timeout_menit',
            'response_timeout_minutes' => 'accept_timeout_menit',
            'max_oper' => 'max_oper',
            'max_handover_count' => 'max_oper',
        ];

        if (isset($columnMap[$key])) {
            $col = $columnMap[$key];
            if (DB::getSchemaBuilder()->hasColumn('dispatch_settings', $col)) {
                $row = DB::table('dispatch_settings')->whereNull('ticket_type')->whereNull('key')->first();
                if ($row && ! is_null($row->{$col})) {
                    return $row->{$col};
                }
            }
        }

        // Fallback to key-value rows
        $query = DB::table('dispatch_settings')->where('key', $key);
        if ($ticketType !== null) {
            $val = (clone $query)->where('ticket_type', $ticketType)->value('value');
            if ($val !== null) {
                return json_decode($val, true);
            }
        }

        $globalVal = $query->whereNull('ticket_type')->value('value');
        if ($globalVal !== null) {
            return json_decode($globalVal, true);
        }

        return $default;
    }
}
