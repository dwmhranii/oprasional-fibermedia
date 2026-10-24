<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoundRobinPointer extends Model
{
    protected $fillable = [
        'queue_type',
        'last_team_id',
    ];

    public function lastTeam()
    {
        return $this->belongsTo(Team::class, 'last_team_id');
    }
}
