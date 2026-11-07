<?php

namespace App\Policies;

use App\Models\Provisioning;
use App\Models\User;

class ProvisioningPolicy
{
    /**
     * Determine whether the user can view any provisionings.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('psb.view') || $user->can('manage_provisioning');
    }

    /**
     * Determine whether the user can view the provisioning.
     */
    public function view(User $user, Provisioning $provisioning): bool
    {
        return $user->can('psb.view') || $user->can('manage_provisioning');
    }

    /**
     * Determine whether the user can create provisionings.
     */
    public function create(User $user): bool
    {
        return $user->can('psb.view') || $user->can('manage_provisioning');
    }

    /**
     * Determine whether the user can update the provisioning.
     */
    public function update(User $user, Provisioning $provisioning): bool
    {
        return $user->can('psb.view') || $user->can('manage_provisioning');
    }

    /**
     * Determine whether the user can retry the provisioning.
     */
    public function retry(User $user, Provisioning $provisioning): bool
    {
        return $user->can('psb.view') || $user->can('manage_provisioning');
    }
}
