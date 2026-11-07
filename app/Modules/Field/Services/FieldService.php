<?php

namespace App\Modules\Field\Services;

use App\Models\Device;
use App\Models\User;

class FieldService
{
    protected GeofenceService $geofenceService;

    protected PhaseWorkflowService $phaseWorkflowService;

    public function __construct(GeofenceService $geofenceService, PhaseWorkflowService $phaseWorkflowService)
    {
        $this->geofenceService = $geofenceService;
        $this->phaseWorkflowService = $phaseWorkflowService;
    }

    /**
     * Register or update mobile PWA device.
     */
    public function registerDevice(User $user, array $data): Device
    {
        $device = Device::firstOrNew(['device_uuid' => $data['device_uuid']]);
        $device->user_id = $user->id;
        $device->label = $data['label'] ?? $device->label ?? 'Mobile Device';
        $device->model = $data['model'] ?? $device->model;
        $device->platform = $data['platform'] ?? $device->platform;
        $device->last_seen_at = now();

        if (! $device->exists && (config('app.env') !== 'production' || $user->can('devices.manage'))) {
            $device->approved_at = now();
            $device->approved_by_id = $user->id;
        }

        $device->save();

        return $device;
    }

    public function geofence(): GeofenceService
    {
        return $this->geofenceService;
    }

    public function phaseWorkflow(): PhaseWorkflowService
    {
        return $this->phaseWorkflowService;
    }
}
