<?php

namespace App\Modules\Psb\Services;

use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Modules\Dispatch\Services\DispatchService;
use Illuminate\Support\Facades\DB;

class PsbService
{
    protected DispatchService $dispatchService;

    public function __construct(DispatchService $dispatchService)
    {
        $this->dispatchService = $dispatchService;
    }

    /**
     * Create installation task for provisioned submission and dispatch to available team.
     */
    public function createTaskAndDispatch(Provisioning $provisioning): Task
    {
        return DB::transaction(function () use ($provisioning) {
            $task = Task::firstOrCreate([
                'provisioning_id' => $provisioning->id,
            ], [
                'task_number' => 'TSK-'.date('Ymd').'-'.sprintf('%04d', $provisioning->id),
                'scheduled_date' => now()->toDateString(),
                'status' => 'pending',
            ]);

            // Dispatch via round-robin queue 'psb'
            $this->dispatchService->assign($task, 'psb', [
                'reason' => 'Tiket PSB baru dialokasikan ke tim giliran',
            ]);

            return $task->fresh();
        });
    }
}
