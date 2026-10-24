<?php

namespace App\Http\Middleware;

use App\Models\Task;
use App\Models\TaskAssignment;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WorkflowLogMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        // Record start time
        $startTime = microtime(true);

        // Process request
        $response = $next($request);

        // Calculate execution time
        $executionTimeMs = round((microtime(true) - $startTime) * 1000, 2);

        // Extract IDs from route parameters
        $taskId = $request->route('task') instanceof Task
                    ? $request->route('task')->id
                    : $request->route('task');

        $assignmentId = $request->route('assignment') instanceof TaskAssignment
                    ? $request->route('assignment')->id
                    : $request->route('assignment');

        // Capture user info
        $user = Auth::user();

        // Build log context
        $context = [
            'endpoint' => $request->path(),
            'method' => $request->method(),
            'task_id' => $taskId,
            'assignment_id' => $assignmentId,
            'user_id' => $user ? $user->id : null,
            'role' => $user ? $user->roles->first()?->name : 'Guest',
            'execution_time_ms' => $executionTimeMs,
        ];

        // Add request ID if available (from headers or generating one)
        $requestId = $request->header('X-Request-ID', Str::uuid()->toString());
        $context['request_id'] = $requestId;

        Log::info('Workflow Action Executed', array_filter($context));

        return $response;
    }
}
