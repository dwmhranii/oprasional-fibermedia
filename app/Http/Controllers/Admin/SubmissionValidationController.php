<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Submission\ValidateSubmissionRequest;
use App\Http\Resources\SubmissionResource;
use App\Models\Customer;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Modules\Dispatch\Services\DispatchService;
use App\Notifications\SubmissionValidatedNotification;
use App\Utils\IdentifierGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class SubmissionValidationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Submission::class);

        // Admin views all submissions, sales views their own, optionally filtered by status
        $query = Submission::query()->with(['user', 'submissionDocuments.reviews']);

        if ($user = $request->user()) {
            $query->forUser($user);
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $query->filterAndSort($request, ['submission_number', 'customer_name', 'customer_code', 'nik', 'phone', 'email']);

        return SubmissionResource::collection($query->paginate(15));
    }

    public function show(Submission $submission): JsonResponse
    {
        Gate::authorize('view', $submission);

        $submission->load(['user', 'validator', 'provisioning', 'submissionDocuments.reviews.reviewer']);

        return $this->successResponse(new SubmissionResource($submission), 'Submission retrieved successfully.');
    }

    public function validateSubmission(ValidateSubmissionRequest $request, Submission $submission): JsonResponse
    {
        Gate::authorize('validate', $submission);

        $validated = $request->validated();
        $newStatus = SubmissionStatus::from($validated['status']);

        // Explicit transition guard: Completed submissions cannot be re-validated.
        if ($submission->status === SubmissionStatus::COMPLETED) {
            return $this->errorResponse('Completed submissions cannot be validated.', 400);
        }

        // Submission Gating Rules: Prevent progressing to APPROVED if any active document is not approved.
        if ($newStatus === SubmissionStatus::APPROVED) {
            $unapprovedDocuments = $submission->submissionDocuments()
                ->where('is_active', true)
                ->where('status', '!=', 'approved')
                ->count();

            if ($unapprovedDocuments > 0) {
                return response()->json([
                    'message' => 'Submission validation failed: Required documents are pending review, rejected, or need revision.',
                    'errors' => ['documents' => ['All active documents must be approved before submission can be approved.']],
                ], 422);
            }
        }

        $submission = DB::transaction(function () use ($submission, $newStatus, $validated) {
            $submission->update([
                'status' => $newStatus,
                'validated_by' => Auth::id(),
                'validated_at' => now(),
                'validation_notes' => $validated['validation_notes'] ?? null,
                'rejection_reason' => $validated['rejection_reason'] ?? null,
            ]);

            if ($newStatus === SubmissionStatus::APPROVED) {
                // 1. Buat / Ambil Provisioning
                $provisioning = Provisioning::firstOrCreate([
                    'submission_id' => $submission->id,
                ], [
                    'provisioning_number' => IdentifierGenerator::generate('PRV'),
                    'admin_id' => Auth::id(),
                    'status' => ProvisioningStatus::PENDING,
                    'bfass_status' => BfassStatus::PENDING,
                    'retry_count' => 0,
                ]);

                // 2. Buat / Hubungkan Data Pelanggan (Customer) dengan sales_id
                if (! $submission->customer_id) {
                    $salesId = $submission->sales_id ?? $submission->user_id;
                    $customer = Customer::create([
                        'customer_code' => 'CUST-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                        'name' => $submission->customer_name,
                        'nik' => $submission->nik,
                        'phone' => $submission->phone,
                        'email' => $submission->email,
                        'address' => $submission->address,
                        'latitude' => $submission->lat,
                        'longitude' => $submission->lng,
                        'package' => $submission->package_name ?: ($submission->package_speed ? $submission->package_speed.' Mbps' : 'Standard'),
                        'service_type' => 'pppoe',
                        'monthly_price' => $submission->package_price ?? 0,
                        'sales_id' => $salesId,
                        'status' => 'active',
                        'subscribed_at' => now(),
                    ]);
                    $submission->customer_id = $customer->id;
                    $submission->save();
                }

                // 3. Buat Tiket PSB (Task) & Masukkan ke Antrean Dispatch Round Robin (Fase 2)
                $task = Task::firstOrCreate([
                    'provisioning_id' => $provisioning->id,
                ], [
                    'task_number' => 'TSK-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                    'assigned_by' => Auth::id(),
                    'scheduled_date' => now()->toDateString(),
                    'status' => TaskStatus::PENDING,
                ]);

                $dispatchService = app(DispatchService::class);
                $dispatchService->assign($task, 'psb', [
                    'reason' => 'Tiket PSB dari Pengajuan Sales Disetujui Admin',
                    'actor_id' => Auth::id(),
                ]);
            }

            return $submission;
        });

        activity('submission_approval')
            ->performedOn($submission)
            ->causedBy(Auth::user())
            ->withProperties([
                'status' => $newStatus->value,
                'rejection_reason' => $validated['rejection_reason'] ?? null,
                'validation_notes' => $validated['validation_notes'] ?? null,
            ])
            ->log("Submission {$submission->submission_number} updated to {$newStatus->value} by " . (Auth::user()?->name ?? 'System'));

        $submission->user->notify(new SubmissionValidatedNotification($submission));

        return $this->successResponse(new SubmissionResource($submission), 'Submission status updated successfully');
    }
}
