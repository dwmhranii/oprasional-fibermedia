<?php

use App\Models\Complaint;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['prefix' => 'api', 'middleware' => ['auth:sanctum']]);

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('admins', function ($user) {
    return $user->hasRole(['Admin', 'Superadmin']);
});

Broadcast::channel('sales.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id && $user->hasRole('Sales');
});

Broadcast::channel('technician.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id && $user->hasRole('Teknisi');
});

Broadcast::channel('teknisi.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('complaints.admin', function ($user) {
    return $user->hasRole(['Admin', 'Superadmin']);
});

Broadcast::channel('complaint.{id}', function ($user, $id) {
    if ($user->hasRole(['Admin', 'Superadmin'])) {
        return true;
    }

    $complaint = Complaint::find($id);
    if (! $complaint) {
        return false;
    }

    return $complaint->assignments()
        ->where('technician_id', $user->id)
        ->exists();
});

Broadcast::channel('team.{id}', function ($user, $id) {
    if ($user->hasRole(['Admin', 'Superadmin'])) {
        return true;
    }

    return $user->teams()->where('teams.id', $id)->exists()
        || (int) $user->team_id === (int) $id;
});
