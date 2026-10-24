<?php

namespace App\Services;

use App\Models\SlaBreach;
use App\Models\User;
use App\Notifications\SlaBreachNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Notification;

class SlaResolutionService
{
    /**
     * Report an SLA breach if one does not already exist.
     */
    public function reportBreach(string $breachType, Model $entity, string $description): ?SlaBreach
    {
        // First, check if an active breach already exists
        $exists = SlaBreach::where('breach_type', $breachType)
            ->where('entity_type', get_class($entity))
            ->where('entity_id', $entity->getKey())
            ->whereNull('resolved_at')
            ->exists();

        if ($exists) {
            return null; // Duplicate prevention
        }

        try {
            $breach = SlaBreach::create([
                'breach_type' => $breachType,
                'entity_type' => get_class($entity),
                'entity_id' => $entity->getKey(),
                'description' => $description,
                'detected_at' => now(),
            ]);

            // Dispatch notifications
            $this->notifyAdmins($breach);

            activity('sla_breach')
                ->performedOn($entity)
                ->log("{$description} for {$this->getEntityName($entity)} #{$entity->getKey()}");

            return $breach;
        } catch (UniqueConstraintViolationException $e) {
            // Caught by partial unique index if there's a race condition
            return null;
        }
    }

    /**
     * Resolve an active SLA breach.
     */
    public function resolveBreach(string $breachType, Model $entity): void
    {
        $breaches = SlaBreach::where('breach_type', $breachType)
            ->where('entity_type', get_class($entity))
            ->where('entity_id', $entity->getKey())
            ->whereNull('resolved_at')
            ->get();

        foreach ($breaches as $breach) {
            $breach->update(['resolved_at' => now()]);

            activity('sla_breach')
                ->performedOn($entity)
                ->log("SLA breach '{$breachType}' resolved for {$this->getEntityName($entity)} #{$entity->getKey()}");
        }
    }

    /**
     * Notify Admin and Superadmin users of the breach.
     */
    protected function notifyAdmins(SlaBreach $breach): void
    {
        $admins = User::role(['Admin', 'Superadmin'])->get();
        Notification::send($admins, new SlaBreachNotification($breach));
    }

    protected function getEntityName(Model $entity): string
    {
        return class_basename($entity);
    }
}
