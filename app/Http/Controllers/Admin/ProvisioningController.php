<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Provisioning\StoreProvisioningRequest;
use App\Http\Resources\ProvisioningResource;
use App\Http\Resources\TaskResource;
use App\Jobs\CreateBFASSAccount;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Services\ManualBfassProvisioningService;
use App\Utils\IdentifierGenerator;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ProvisioningController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Provisioning::class);

        $query = Provisioning::query()->with(['submission', 'admin', 'tasks.assignments.user', 'tasks.assignments.evidence']);

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $query->filterAndSort($request, ['provisioning_number', 'nas_server', 'nas_ip', 'submission.customer_name']);

        return ProvisioningResource::collection($query->paginate(15));
    }

    public function store(StoreProvisioningRequest $request): JsonResponse
    {
        Gate::authorize('create', Provisioning::class);

        $validated = $request->validated();
        $submission = Submission::findOrFail($validated['submission_id']);

        // Explicit Enum comparison
        if ($submission->status !== SubmissionStatus::APPROVED) {
            return $this->errorResponse('Submission must be approved to start provisioning.', 400);
        }

        $idempotencyKey = $request->header('Idempotency-Key', 'sub_'.$submission->id);

        if (Provisioning::where('submission_id', $submission->id)
            ->orWhere('idempotency_key', $idempotencyKey)
            ->exists()) {

            activity()
                ->causedBy(Auth::user())
                ->performedOn($submission)
                ->log('Attempted duplicate provisioning creation rejected');

            return $this->errorResponse('Provisioning already exists for this submission.', 409);
        }

        try {
            $provisioning = DB::transaction(function () use ($validated, $idempotencyKey) {
                $validated['provisioning_number'] = IdentifierGenerator::generate('PRV');
                $validated['admin_id'] = Auth::id();
                $validated['status'] = ProvisioningStatus::PENDING;
                $validated['bfass_status'] = BfassStatus::PENDING;
                $validated['retry_count'] = 0;
                $validated['idempotency_key'] = $idempotencyKey;

                $provisioning = Provisioning::create($validated);

                return $provisioning;
            });
        } catch (UniqueConstraintViolationException $e) {
            activity()->causedBy(Auth::user())->performedOn($submission)->log('Attempted duplicate provisioning creation rejected at DB level');

            return $this->errorResponse('Provisioning already exists for this submission.', 409);
        } catch (QueryException $e) {
            // PostgreSQL code for unique violation
            if ($e->getCode() === '23505') {
                activity()->causedBy(Auth::user())->performedOn($submission)->log('Attempted duplicate provisioning creation rejected at DB level');

                return $this->errorResponse('Provisioning already exists for this submission.', 409);
            }
            throw $e;
        }

        $provisioning->load(['submission', 'admin', 'tasks.assignments.user', 'tasks.assignments.evidence']);

        return $this->successResponse(new ProvisioningResource($provisioning), 'Provisioning created successfully.', 201);
    }

    public function updateBfassCredentials(Request $request, Provisioning $provisioning, ManualBfassProvisioningService $service): JsonResponse
    {
        Gate::authorize('update', $provisioning);

        if ($provisioning->status === ProvisioningStatus::SUCCESS) {
            return $this->errorResponse('Provisioning is already completed.', 400);
        }

        $user = $request->user();

        // RBAC Enforcement: Role Admin dilarang memilih manual, wajib Round Robin
        if ($user && ! $user->hasRole('Superadmin') && ($request->filled('team') || $request->filled('technician_id') || $request->input('assignment_mode') === 'manual')) {
            return $this->errorResponse('Hak akses ditolak: Role Admin wajib menggunakan penugasan otomatis Round Robin Antar Tim. Pemilihan manual teknisi hanya dapat dilakukan oleh Superadmin.', 403);
        }

        $validated = $request->validate([
            'bfass_username' => 'required|string|max:255',
            'bfass_password' => 'required|string|max:255',
            'vlan' => 'required|string|max:255',
            'odp' => 'required|string|max:255',
            'onu_serial_number' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'assignment_mode' => 'nullable|string|in:round_robin,manual',
            'team' => 'nullable|string|max:50',
            'technician_id' => 'nullable|integer|exists:users,id',
        ]);

        try {
            $provisioning = $service->saveCredentialsAndAssignTask($provisioning, $validated, Auth::id(), $user);
        } catch (ValidationException $e) {
            $errors = $e->errors();
            if (isset($errors['bfass_username'])) {
                return $this->errorResponse('Username BFASS sudah digunakan.', 422, $errors);
            }

            return $this->errorResponse('Failed to process assignment', 422, $errors);
        } catch (UniqueConstraintViolationException $e) {
            return $this->errorResponse('Username BFASS sudah digunakan.', 422, [
                'bfass_username' => ['Username BFASS sudah digunakan. Silakan gunakan username lain.'],
            ]);
        } catch (QueryException $e) {
            if ($e->getCode() == '23505' || str_contains($e->getMessage(), 'unique constraint') || str_contains($e->getMessage(), 'bfass_username_unique')) {
                return $this->errorResponse('Username BFASS sudah digunakan.', 422, [
                    'bfass_username' => ['Username BFASS sudah digunakan. Silakan gunakan username lain.'],
                ]);
            }
            throw $e;
        }

        return $this->successResponse(
            new ProvisioningResource($provisioning),
            'BFASS credentials saved and Task assigned successfully.'
        );
    }

    /**
     * Reassign an existing Task (Superadmin only).
     */
    public function reassignTask(Request $request, Task $task, ManualBfassProvisioningService $service): JsonResponse
    {
        $user = $request->user();

        if ($user && ! $user->hasRole('Superadmin')) {
            return $this->errorResponse('Hak akses ditolak: Hanya Superadmin yang berhak melakukan penugasan ulang (reassign) tugas teknisi.', 403);
        }

        $validated = $request->validate([
            'assignment_mode' => 'nullable|string|in:round_robin,manual',
            'team' => 'nullable|string|max:50',
            'technician_id' => 'nullable|integer|exists:users,id',
        ]);

        try {
            $updatedTask = $service->reassignTask($task, $validated, $user->id);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        }

        return $this->successResponse(
            new TaskResource($updatedTask),
            "Tugas berhasil dialihkan ke tim {$updatedTask->assigned_team}."
        );
    }

    public function retry(Provisioning $provisioning): JsonResponse
    {
        Gate::authorize('retry', $provisioning);

        if ($provisioning->status === ProvisioningStatus::PROCESSING ||
            $provisioning->bfass_status === BfassStatus::PROCESSING ||
            $provisioning->status === ProvisioningStatus::PENDING ||
            $provisioning->bfass_status === BfassStatus::PENDING) {
            return $this->errorResponse('Provisioning is still being processed. Please wait or run the queue worker.', 400);
        }

        if ($provisioning->status === ProvisioningStatus::SUCCESS ||
            $provisioning->bfass_status === BfassStatus::SUCCESS ||
            $provisioning->status === ProvisioningStatus::COMPLETED ||
            $provisioning->bfass_status === BfassStatus::COMPLETED ||
            $provisioning->status === ProvisioningStatus::READY ||
            $provisioning->bfass_status === BfassStatus::READY) {
            return $this->errorResponse('Provisioning has already been completed.', 400);
        }

        $provisioning = DB::transaction(function () use ($provisioning) {
            $provisioning->update([
                'status' => ProvisioningStatus::PENDING,
                'bfass_status' => BfassStatus::PENDING,
                'retry_count' => $provisioning->retry_count + 1,
                'error_log' => null,
            ]);

            DB::afterCommit(function () use ($provisioning) {
                CreateBFASSAccount::dispatch($provisioning);
            });

            return $provisioning;
        });

        return $this->successResponse(new ProvisioningResource($provisioning), 'Provisioning queued for retry.');
    }

    public function show(Provisioning $provisioning): JsonResponse
    {
        Gate::authorize('view', $provisioning);

        $provisioning->load(['submission', 'admin', 'tasks.assignments.user', 'tasks.assignments.evidence']);

        return $this->successResponse(new ProvisioningResource($provisioning), 'Provisioning detail retrieved.');
    }
}
