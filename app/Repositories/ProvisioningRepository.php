<?php

namespace App\Repositories;

use App\Models\Provisioning;

class ProvisioningRepository
{
    public function findById($id)
    {
        return Provisioning::findOrFail($id);
    }
}
