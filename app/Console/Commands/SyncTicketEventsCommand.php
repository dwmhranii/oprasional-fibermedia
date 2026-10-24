<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SyncTicketEventsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ticket-events:sync-legacy';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Salin riwayat dari assignment_logs dan complaint_logs ke tabel ticket_events secara idempoten';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Memulai sinkronisasi log historis ke ticket_events...');

        $assignmentCopied = 0;
        $complaintCopied = 0;

        // 1. Salin dari assignment_logs
        if (Schema::hasTable('assignment_logs') && Schema::hasTable('ticket_events')) {
            $assignmentLogs = DB::table('assignment_logs')->get();
            foreach ($assignmentLogs as $log) {
                $alreadyExists = DB::table('ticket_events')
                    ->where('eventable_type', $log->assignable_type)
                    ->where('eventable_id', $log->assignable_id)
                    ->where('event', $log->action)
                    ->where('occurred_at', $log->created_at)
                    ->exists();

                if (! $alreadyExists) {
                    DB::table('ticket_events')->insert([
                        'eventable_type' => $log->assignable_type,
                        'eventable_id' => $log->assignable_id,
                        'actor_id' => $log->actor_id,
                        'event' => $log->action,
                        'from_status' => null,
                        'to_status' => $log->action,
                        'payload' => json_encode([
                            'source' => 'assignment_logs',
                            'team_id' => $log->team_id,
                            'reason' => $log->reason,
                            'attempt_no' => $log->attempt_no,
                        ]),
                        'occurred_at' => $log->created_at,
                    ]);
                    $assignmentCopied++;
                }
            }
        }

        // 2. Salin dari complaint_logs
        if (Schema::hasTable('complaint_logs') && Schema::hasTable('ticket_events')) {
            $complaintLogs = DB::table('complaint_logs')->get();
            foreach ($complaintLogs as $cLog) {
                $alreadyExists = DB::table('ticket_events')
                    ->where('eventable_type', 'App\Models\Complaint')
                    ->where('eventable_id', $cLog->complaint_id)
                    ->where('event', $cLog->action)
                    ->where('occurred_at', $cLog->created_at)
                    ->exists();

                if (! $alreadyExists) {
                    DB::table('ticket_events')->insert([
                        'eventable_type' => 'App\Models\Complaint',
                        'eventable_id' => $cLog->complaint_id,
                        'actor_id' => $cLog->actor_id,
                        'event' => $cLog->action,
                        'from_status' => $cLog->from_status,
                        'to_status' => $cLog->to_status,
                        'payload' => json_encode([
                            'source' => 'complaint_logs',
                            'actor_role' => $cLog->actor_role,
                            'notes' => $cLog->notes,
                        ]),
                        'occurred_at' => $cLog->created_at,
                    ]);
                    $complaintCopied++;
                }
            }
        }

        $this->info("Sinkronisasi selesai: {$assignmentCopied} dari assignment_logs, {$complaintCopied} dari complaint_logs disalin.");

        return Command::SUCCESS;
    }
}
