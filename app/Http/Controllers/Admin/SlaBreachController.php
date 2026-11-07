<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SlaBreach;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SlaBreachController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAccess();
        $query = SlaBreach::with('entity')->latest('detected_at');

        if ($request->filled('breach_type')) {
            $query->where('breach_type', $request->breach_type);
        }

        if ($request->has('resolved')) {
            if (filter_var($request->resolved, FILTER_VALIDATE_BOOLEAN)) {
                $query->whereNotNull('resolved_at');
            } else {
                $query->whereNull('resolved_at');
            }
        }

        if ($request->filled('start_date')) {
            $query->whereDate('detected_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('detected_at', '<=', $request->end_date);
        }

        return response()->json([
            'success' => true,
            'data' => $query->paginate(15),
        ]);
    }

    public function show($id)
    {
        $this->authorizeAccess();
        $breach = SlaBreach::with('entity')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $breach,
        ]);
    }

    public function summary()
    {
        $this->authorizeAccess();
        $totalOpen = SlaBreach::whereNull('resolved_at')->count();
        $totalResolved = SlaBreach::whereNotNull('resolved_at')->count();

        $pendingValidationCount = SlaBreach::where('breach_type', 'pending_validation')->whereNull('resolved_at')->count();
        $provisioningFailureCount = SlaBreach::where('breach_type', 'provisioning_failure')->whereNull('resolved_at')->count();
        $delayedInstallationCount = SlaBreach::where('breach_type', 'delayed_installation')->whereNull('resolved_at')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'open_count' => $totalOpen,
                'resolved_count' => $totalResolved,
                'pending_validation_count' => $pendingValidationCount,
                'provisioning_failure_count' => $provisioningFailureCount,
                'delayed_installation_count' => $delayedInstallationCount,
            ],
        ]);
    }

    private function authorizeAccess(): void
    {
        if (! Gate::allows('view_sla') && ! Gate::allows('kpi.view')) {
            abort(403, 'Akses ke SLA breach ditolak.');
        }
    }
}
