<?php

namespace App\Repositories;

use App\Models\Task;

class TaskRepository
{
    public function findById($id)
    {
        return Task::findOrFail($id);
    }
}
