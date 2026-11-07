<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Spatie\Activitylog\Models\Activity;

class AuditLogController extends Controller
{
    /**
     * Get a paginated list of all system audit logs.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('audit.view') && ! $request->user()->can('view_audit_logs')) {
            abort(403, 'Akses ditolak.');
        }

        $query = Activity::query()->with('causer');

        if ($request->has('log_name')) {
            $query->where('log_name', $request->input('log_name'));
        }

        if ($request->has('causer_id')) {
            $query->where('causer_id', $request->input('causer_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('log_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('sort_by')) {
            $sortBy = $request->input('sort_by');
            $sortOrder = strtolower($request->input('sort_order') ?? 'asc') === 'asc' ? 'asc' : 'desc';
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->latest();
        }

        $logs = $query->paginate(15);

        return $this->successResponse($logs, 'Audit logs retrieved successfully.');
    }
}
