<?php

namespace App\Listeners;

use App\Events\ProvisioningCompleted;
use App\Events\SubmissionApproved;
use App\Events\SubmissionRejected;
use App\Events\TaskCompleted;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Services\SlaResolutionService;
use Illuminate\Events\Dispatcher;

class SlaResolutionSubscriber
{
    protected SlaResolutionService $slaService;

    public function __construct(SlaResolutionService $slaService)
    {
        $this->slaService = $slaService;
    }

    public function handleSubmissionResolved($event): void
    {
        $submission = Submission::find($event->submissionId);
        if ($submission) {
            $this->slaService->resolveBreach('pending_validation', $submission);
        }
    }

    public function handleProvisioningResolved($event): void
    {
        $provisioning = Provisioning::find($event->provisioningId);
        if ($provisioning) {
            $this->slaService->resolveBreach('provisioning_failure', $provisioning);
        }
    }

    public function handleTaskResolved($event): void
    {
        $task = Task::find($event->taskId);
        if ($task) {
            $this->slaService->resolveBreach('delayed_installation', $task);
        }
    }

    public function subscribe(Dispatcher $events): array
    {
        return [
            SubmissionApproved::class => 'handleSubmissionResolved',
            SubmissionRejected::class => 'handleSubmissionResolved',
            ProvisioningCompleted::class => 'handleProvisioningResolved',
            TaskCompleted::class => 'handleTaskResolved',
        ];
    }
}
