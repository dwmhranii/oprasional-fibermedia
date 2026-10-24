<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AnalyticsController extends Controller
{
    /**
     * Get the current cache version key.
     */
    private function getCacheKey(string $prefix, Request $request): string
    {
        $version = Cache::get('analytics_cache_version', 1);
        $start = $request->query('start_date', '');
        $end = $request->query('end_date', '');

        return "{$prefix}:v{$version}:{$start}:{$end}";
    }

    public function kpi(Request $request)
    {
        Gate::authorize('view_analytics');

        $cacheKey = $this->getCacheKey('analytics:kpi', $request);

        return Cache::remember($cacheKey, 600, function () use ($request) {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            $subQuery = DB::table('submissions');
            $provQuery = DB::table('provisionings');
            $taskQuery = DB::table('tasks');
            $slaQuery = DB::table('sla_breaches');

            if ($startDate && $endDate) {
                $subQuery->whereBetween('created_at', [$startDate, $endDate]);
                $provQuery->whereBetween('created_at', [$startDate, $endDate]);
                $taskQuery->whereBetween('created_at', [$startDate, $endDate]);
                $slaQuery->whereBetween('detected_at', [$startDate, $endDate]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'submissions' => [
                        'total' => (clone $subQuery)->count(),
                        'pending' => (clone $subQuery)->where('status', SubmissionStatus::PENDING->value)->count(),
                        'approved' => (clone $subQuery)->where('status', SubmissionStatus::APPROVED->value)->count(),
                        'rejected' => (clone $subQuery)->where('status', SubmissionStatus::REJECTED->value)->count(),
                    ],
                    'provisionings' => [
                        'total' => (clone $provQuery)->count(),
                        'successful' => (clone $provQuery)->where('status', ProvisioningStatus::SUCCESS->value)->count(),
                        'failed' => (clone $provQuery)->where('status', ProvisioningStatus::FAILED->value)->count(),
                    ],
                    'installations' => [
                        'total' => (clone $taskQuery)->count(),
                        'completed' => (clone $taskQuery)->where('status', TaskStatus::COMPLETED->value)->count(),
                        'pending' => (clone $taskQuery)->whereIn('status', [TaskStatus::ASSIGNED->value, TaskStatus::ON_THE_WAY->value, TaskStatus::IN_PROGRESS->value])->count(),
                    ],
                    'sla_breaches' => [
                        'open' => (clone $slaQuery)->whereNull('resolved_at')->count(),
                        'resolved' => (clone $slaQuery)->whereNotNull('resolved_at')->count(),
                    ],
                ],
            ]);
        });
    }

    public function funnel(Request $request)
    {
        Gate::authorize('view_analytics');

        $cacheKey = $this->getCacheKey('analytics:funnel', $request);

        return Cache::remember($cacheKey, 600, function () use ($request) {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            // Funnel is based on the initial cohort of Submissions.
            $query = DB::table('submissions as s')
                ->leftJoin('provisionings as p', 's.id', '=', 'p.submission_id')
                ->leftJoin('tasks as t', 'p.id', '=', 't.provisioning_id');

            if ($startDate && $endDate) {
                $query->whereBetween('s.created_at', [$startDate, $endDate]);
            }

            $approvedStatus = SubmissionStatus::APPROVED->value;
            $completedStatus = SubmissionStatus::COMPLETED->value;
            $provSuccess = ProvisioningStatus::SUCCESS->value;
            $taskCompleted = TaskStatus::COMPLETED->value;

            $results = $query->select(
                DB::raw('COUNT(DISTINCT s.id) as total_submissions'),
                DB::raw("COUNT(DISTINCT CASE WHEN s.status IN ('{$approvedStatus}', '{$completedStatus}') THEN s.id END) as total_validated"),
                DB::raw("COUNT(DISTINCT CASE WHEN p.status = '{$provSuccess}' THEN s.id END) as total_provisioned"),
                DB::raw('COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN s.id END) as total_task_assigned'),
                DB::raw("COUNT(DISTINCT CASE WHEN t.status = '{$taskCompleted}' THEN s.id END) as total_installed")
            )->first();

            $total = $results->total_submissions ?: 1; // Prevent division by zero

            $funnel = [
                'total_submissions' => $results->total_submissions,
                'validated' => $results->total_validated,
                'provisioned' => $results->total_provisioned,
                'task_assigned' => $results->total_task_assigned,
                'installed' => $results->total_installed,
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'raw_counts' => $funnel,
                    'conversion_percentages' => [
                        'validated' => round(($funnel['validated'] / $total) * 100, 2),
                        'provisioned' => round(($funnel['provisioned'] / $total) * 100, 2),
                        'task_assigned' => round(($funnel['task_assigned'] / $total) * 100, 2),
                        'installed' => round(($funnel['installed'] / $total) * 100, 2),
                    ],
                ],
            ]);
        });
    }

    public function regional(Request $request)
    {
        Gate::authorize('view_analytics');

        $groupByParam = $request->query('group_by', 'district');
        $validGroupBys = ['district', 'city', 'province'];
        $groupBy = in_array($groupByParam, $validGroupBys) ? $groupByParam : 'district';

        $cacheKey = $this->getCacheKey("analytics:regional:{$groupBy}", $request);

        return Cache::remember($cacheKey, 600, function () use ($request, $groupBy) {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            $query = DB::table('submissions as s')
                ->leftJoin('provisionings as p', 's.id', '=', 'p.submission_id')
                ->leftJoin('tasks as t', 'p.id', '=', 't.provisioning_id')
                ->whereNotNull("s.{$groupBy}")
                ->groupBy("s.{$groupBy}");

            if ($startDate && $endDate) {
                $query->whereBetween('s.created_at', [$startDate, $endDate]);
            }

            $provSuccess = ProvisioningStatus::SUCCESS->value;
            $taskCompleted = TaskStatus::COMPLETED->value;

            $regions = $query->select(
                "s.{$groupBy} as region",
                DB::raw('COUNT(DISTINCT s.id) as total_submissions'),
                DB::raw("COUNT(DISTINCT CASE WHEN p.status = '{$provSuccess}' THEN s.id END) as successful_provisionings"),
                DB::raw("COUNT(DISTINCT CASE WHEN t.status = '{$taskCompleted}' THEN s.id END) as completed_installations")
            )->get();

            $data = $regions->map(function ($region) {
                $total = $region->total_submissions ?: 1;

                return [
                    'region' => $region->region,
                    'total_submissions' => $region->total_submissions,
                    'provisioning_success_rate' => round(($region->successful_provisionings / $total) * 100, 2),
                    'installation_completion_rate' => round(($region->completed_installations / $total) * 100, 2),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        });
    }

    public function trends(Request $request)
    {
        Gate::authorize('view_analytics');

        $cacheKey = $this->getCacheKey('analytics:trends', $request);

        return Cache::remember($cacheKey, 600, function () use ($request) {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            $query = DB::table('submissions')
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(id) as total'))
                ->groupBy('date')
                ->orderBy('date', 'ASC');

            if ($startDate && $endDate) {
                $query->whereBetween('created_at', [$startDate, $endDate]);
            }

            $trends = $query->get();

            return response()->json([
                'success' => true,
                'data' => $trends,
            ]);
        });
    }
}
