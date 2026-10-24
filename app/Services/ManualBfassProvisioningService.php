<?php

namespace App\Services;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Events\BfassCredentialsSaved;
use App\Models\Provisioning;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\Team;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManualBfassProvisioningService
{
    /**
     * Save BFASS credentials and assign a Task (Round Robin antar tim ATAU Manual oleh Superadmin).
     * Mendukung tim dengan minimal 1 anggota aktif.
     */
    public function saveCredentialsAndAssignTask(
        Provisioning $provisioning,
        array $credentials,
        int $adminId,
        ?User $actor = null
    ): Provisioning {
        if (! empty($credentials['bfass_username'])) {
            $exists = Provisioning::where('bfass_username', $credentials['bfass_username'])
                ->where('id', '!=', $provisioning->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'bfass_username' => ['Username BFASS sudah digunakan. Silakan gunakan username lain.'],
                ]);
            }
        }

        return DB::transaction(function () use ($provisioning, $credentials, $adminId) {
            // 1. Save BFASS Credentials
            $updateData = array_filter([
                'bfass_username' => $credentials['bfass_username'] ?? null,
                'bfass_password' => $credentials['bfass_password'] ?? null,
                'vlan' => $credentials['vlan'] ?? null,
                'odp' => $credentials['odp'] ?? null,
                'onu_serial_number' => $credentials['onu_serial_number'] ?? null,
                'notes' => $credentials['notes'] ?? null,
                'credentials_saved_at' => now(),
                'status' => ProvisioningStatus::READY,
                'bfass_status' => BfassStatus::SUCCESS,
            ], fn ($value) => ! is_null($value));

            $provisioning->update($updateData);

            event(new BfassCredentialsSaved($provisioning));

            // 2. Evaluasi Penugasan: Manual ATAU Round Robin
            $selectedTechId = $credentials['technician_id'] ?? null;
            $selectedTeam = $credentials['team'] ?? null;
            $assignmentMode = $credentials['assignment_mode'] ?? null;

            $isManual = ($assignmentMode === 'manual') || ($assignmentMode !== 'round_robin' && ($selectedTechId || $selectedTeam));

            // 3. Create or reuse Parent Task
            $task = Task::where('provisioning_id', $provisioning->id)->first();
            if (! $task) {
                $task = Task::create([
                    'provisioning_id' => $provisioning->id,
                    'task_number' => 'TSK-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                    'assigned_by' => $adminId,
                    'scheduled_date' => now()->toDateString(),
                    'status' => TaskStatus::PENDING,
                ]);
            }

            $dispatchService = app(TeamDispatchService::class);

            if ($isManual) {
                $team = null;
                if (! empty($selectedTechId)) {
                    $chosenTech = User::role('Teknisi')->where('status', 'active')->find($selectedTechId);
                    if (! $chosenTech) {
                        throw ValidationException::withMessages([
                            'technician_id' => ['Teknisi tidak ditemukan atau status tidak aktif.'],
                        ]);
                    }
                    $team = $chosenTech->currentTeam ?? Team::where('name', $chosenTech->team)->first();
                    if (! $team && ! empty($chosenTech->team)) {
                        $team = Team::firstOrCreate(['name' => $chosenTech->team], ['order_index' => 999, 'is_active' => true]);
                    }
                } else {
                    $team = Team::where('name', $selectedTeam)->orWhere('id', $selectedTeam)->first();
                    if (! $team && ! empty($selectedTeam)) {
                        $hasTech = User::role('Teknisi')->where('team', $selectedTeam)->where('status', 'active')->exists();
                        if ($hasTech) {
                            $team = Team::firstOrCreate(['name' => $selectedTeam], ['order_index' => 999, 'is_active' => true]);
                        }
                    }
                }

                if (! $team) {
                    throw ValidationException::withMessages([
                        'team' => ["Tim '{$selectedTeam}' tidak ditemukan atau tidak memiliki teknisi aktif."],
                    ]);
                }

                $dispatchService->assignManual($task, 'psb', $team, 'Penugasan manual admin', $adminId);
            } else {
                if (empty($task->assigned_team_id) && empty($task->assigned_team)) {
                    $result = $dispatchService->assign($task, 'psb', [
                        'reason' => 'Penugasan otomatis PSB',
                        'actor_id' => $adminId,
                    ]);

                    if (! $result['assigned'] && Team::where('is_active', true)->doesntExist()) {
                        $causer = User::find($adminId);
                        $activity = activity();
                        if ($causer) {
                            $activity->causedBy($causer);
                        }
                        $activity->performedOn($provisioning)
                            ->log('Assignment failed: No active technician team found.');

                        throw ValidationException::withMessages([
                            'assignment' => ['Cannot create task: No active technician team available.'],
                        ]);
                    }
                } else {
                    // Task already assigned, ensure assignments exist for team members
                    $assignedTeam = $task->assignedTeam ?? ($task->assigned_team_id ? Team::find($task->assigned_team_id) : null);
                    if (! $assignedTeam && $task->assigned_team) {
                        $assignedTeam = Team::where('name', $task->assigned_team)->first();
                    }
                    if ($assignedTeam && $task->assignments()->doesntExist()) {
                        foreach ($assignedTeam->activeUsers as $member) {
                            TaskAssignment::create([
                                'task_id' => $task->id,
                                'user_id' => $member->id,
                                'status' => TaskAssignmentStatus::ASSIGNED,
                                'assigned_at' => now(),
                            ]);
                        }
                    }
                }
            }

            $task->refresh();
            $assignedTeam = $task->assignedTeam ?? ($task->assigned_team_id ? Team::find($task->assigned_team_id) : null);
            $teamMembers = $assignedTeam ? $assignedTeam->activeUsers : collect();
            if ($teamMembers->isNotEmpty()) {
                Notification::send($teamMembers, new TaskAssignedNotification($task));
            }

            return $provisioning->fresh();
        });
    }

    /**
     * Reassign an existing Task (Superadmin only).
     */
    public function reassignTask(Task $task, array $data, int $actorId): Task
    {
        if ($task->status === TaskStatus::COMPLETED) {
            throw ValidationException::withMessages([
                'task' => ['Task yang sudah selesai (Completed) tidak dapat di-reassign.'],
            ]);
        }

        return DB::transaction(function () use ($task, $data, $actorId) {
            $selectedTechId = $data['technician_id'] ?? null;
            $selectedTeam = $data['team'] ?? null;
            $assignmentMode = $data['assignment_mode'] ?? null;

            $isManual = ($assignmentMode === 'manual') || ($assignmentMode !== 'round_robin' && ($selectedTechId || $selectedTeam));

            if ($isManual) {
                $team = null;
                if (! empty($selectedTechId)) {
                    $chosenTech = User::role('Teknisi')->where('status', 'active')->find($selectedTechId);
                    if (! $chosenTech) {
                        throw ValidationException::withMessages([
                            'technician_id' => ['Teknisi tidak ditemukan atau status tidak aktif.'],
                        ]);
                    }
                    $team = $chosenTech->currentTeam ?? Team::where('name', $chosenTech->team)->first();
                    if (! $team && ! empty($chosenTech->team)) {
                        $team = Team::firstOrCreate(['name' => $chosenTech->team], ['order_index' => 999, 'is_active' => true]);
                    }
                } else {
                    $team = Team::where('name', $selectedTeam)->orWhere('id', $selectedTeam)->first();
                    if (! $team && ! empty($selectedTeam)) {
                        $hasTech = User::role('Teknisi')->where('team', $selectedTeam)->where('status', 'active')->exists();
                        if ($hasTech) {
                            $team = Team::firstOrCreate(['name' => $selectedTeam], ['order_index' => 999, 'is_active' => true]);
                        }
                    }
                }

                if (! $team) {
                    throw ValidationException::withMessages([
                        'team' => ["Tim '{$selectedTeam}' tidak ditemukan atau tidak memiliki teknisi aktif."],
                    ]);
                }

                $task->assignments()
                    ->whereNotIn('status', [TaskAssignmentStatus::APPROVED, TaskAssignmentStatus::PHASE_2_COMPLETE])
                    ->delete();

                $dispatchService = app(TeamDispatchService::class);
                $dispatchService->assignManual($task, 'psb', $team, $data['reason'] ?? 'Reassign manual', $actorId);
            } else {
                if (Team::where('is_active', true)->doesntExist()) {
                    throw ValidationException::withMessages([
                        'assignment' => ['Cannot reassign task: No active technician team available.'],
                    ]);
                }

                $task->assignments()
                    ->whereNotIn('status', [TaskAssignmentStatus::APPROVED, TaskAssignmentStatus::PHASE_2_COMPLETE])
                    ->delete();

                $dispatchService = app(TeamDispatchService::class);
                $dispatchService->assign($task, 'psb', [
                    'reason' => $data['reason'] ?? 'Reassign otomatis PSB',
                    'actor_id' => $actorId,
                ]);
            }

            $task->refresh();
            $causer = User::find($actorId);
            $activity = activity();
            if ($causer) {
                $activity->causedBy($causer);
            }
            $activity->performedOn($task)
                ->withProperties([
                    'task_id' => $task->id,
                    'reassigned_by' => $actorId,
                    'reason' => $data['reason'] ?? null,
                ])
                ->log('Task reassigned to team: '.($task->assigned_team_id ?? 'none'));

            $assignedTeam = $task->assignedTeam ?? ($task->assigned_team_id ? Team::find($task->assigned_team_id) : null);
            $teamMembers = $assignedTeam ? $assignedTeam->activeUsers : collect();
            if ($teamMembers->isNotEmpty()) {
                Notification::send($teamMembers, new TaskAssignedNotification($task));
            }

            return $task->fresh(['assignments.user', 'provisioning.submission']);
        });
    }
}
