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
    return $user->can('submissions.approve') || $user->can('complaints.view');
});

Broadcast::channel('sales.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id && ($user->can('submissions.create') || $user->can('submissions.view_own'));
});

Broadcast::channel('technician.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id && $user->can('tasks.view_assigned');
});

Broadcast::channel('teknisi.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('complaints.admin', function ($user) {
    return $user->can('complaints.view') || $user->can('complaints.view_own');
});

Broadcast::channel('complaint.{id}', function ($user, $id) {
    if ($user->can('complaints.view')) {
        return true;
    }

    $complaint = Complaint::find($id);
    if (! $complaint) {
        return false;
    }

    if ($user->can('complaints.view_own') && ((int) $complaint->created_by_id === (int) $user->id || $complaint->created_by === $user->name)) {
        return true;
    }

    return $complaint->assignments()
        ->where('technician_id', $user->id)
        ->exists();
});

Broadcast::channel('team.{id}', function ($user, $id) {
    if ($user->can('teams.view') || $user->can('teams.manage')) {
        return true;
    }

    return $user->teams()->where('teams.id', $id)->exists()
        || (int) $user->team_id === (int) $id;
});
