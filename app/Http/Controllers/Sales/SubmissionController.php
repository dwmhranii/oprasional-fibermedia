<?php

namespace App\Http\Controllers\Sales;

use App\Enums\SubmissionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Submission\StoreSubmissionRequest;
use App\Http\Requests\Submission\UpdateSubmissionRequest;
use App\Http\Requests\Submission\UploadSubmissionDocumentRequest;
use App\Http\Resources\SubmissionResource;
use App\Models\Submission;
use App\Models\User;
use App\Modules\Customer\Services\DuplicateCheckService;
use App\Notifications\SubmissionCreatedNotification;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class SubmissionController extends Controller
{
    protected FileUploadService $fileUploadService;

    protected DuplicateCheckService $duplicateCheckService;

    public function __construct(FileUploadService $fileUploadService, DuplicateCheckService $duplicateCheckService)
    {
        $this->fileUploadService = $fileUploadService;
        $this->duplicateCheckService = $duplicateCheckService;
    }

    /**
     * Cek duplikat NIK, nomor telepon, dan lokasi sebelum submit (real-time PWA check).
     */
    public function checkDuplicate(Request $request): JsonResponse
    {
        $result = $this->duplicateCheckService->check($request->all(), $request->input('exclude_submission_id'));

        return response()->json([
            'success' => true,
            'is_duplicate' => $result['has_duplicate'],
            'has_duplicate' => $result['has_duplicate'],
            'warnings' => $result['warnings'],
            'matched_customers' => $result['matched_customers'],
            'matched_submissions' => $result['matched_submissions'],
            'data' => $result,
        ]);
    }

    /**
     * Display a listing of submissions.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Submission::class);

        $submissions = Submission::query()
            ->with(['submissionDocuments.reviews', 'sales', 'user'])
            ->forUser(Auth::user())
            ->filterAndSort($request, ['submission_number', 'customer_name', 'customer_code', 'nik', 'phone', 'email'])
            ->paginate(15);

        return SubmissionResource::collection($submissions);
    }

    public function store(StoreSubmissionRequest $request): JsonResponse
    {
        Gate::authorize('create', Submission::class);

        $uploadedPaths = [];

        // 1. Cek potensi duplikasi (NIK, telepon, jarak lokasi/alamat)
        $dupResult = $this->duplicateCheckService->check($request->all());

        try {
            $submission = DB::transaction(function () use ($request, &$uploadedPaths, $dupResult) {
                $data = $request->safe()->except(['documents', 'ktp', 'rumah', 'kk', 'lainnya', 'ktp_base64', 'kk_base64', 'rumah_base64']);
                $data['sales_id'] = Auth::id() ?? $request->input('sales_id');
                $data['duplicate_warnings'] = $dupResult['warnings'];

                $submission = Submission::create($data);
                $directory = "submissions/{$submission->id}";

                // Helper Upload File
                $handleUpload = function (UploadedFile $file, string $type) use ($submission, $directory, &$uploadedPaths) {
                    $path = $this->fileUploadService->uploadFile($file, $directory);
                    if (! $path) {
                        throw new \RuntimeException("Failed to upload document: {$type}");
                    }
                    $uploadedPaths[] = $path;
                    $submission->addDocument($type, $path, $file->getClientOriginalName());
                };

                // Helper Upload Base64 (Dari Kamera PWA Kompresi)
                $handleBase64 = function (string $base64Data, string $type) use ($submission, &$uploadedPaths) {
                    if (str_contains($base64Data, ';base64,')) {
                        [, $base64Data] = explode(';base64,', $base64Data);
                    }
                    $decoded = base64_decode($base64Data);
                    if ($decoded === false) {
                        return;
                    }

                    $filename = "{$type}_".time().'_'.uniqid().'.jpg';
                    $path = "submissions/{$submission->id}/{$filename}";
                    Storage::disk('public')->put($path, $decoded);
                    $uploadedPaths[] = $path;
                    $submission->addDocument($type, $path, $filename);
                };

                // 1. Dokumen array
                if ($request->hasFile('documents')) {
                    $docs = $request->file('documents');
                    if (is_array($docs)) {
                        foreach ($docs as $type => $item) {
                            if ($item instanceof UploadedFile) {
                                $handleUpload($item, is_string($type) ? $type : 'lainnya');
                            } elseif (is_array($item) && isset($item['file']) && $item['file'] instanceof UploadedFile) {
                                $docType = $item['document_type'] ?? 'lainnya';
                                $handleUpload($item['file'], $docType);
                            }
                        }
                    }
                }

                // 2. Berkas File biasa
                $docTypes = ['ktp', 'rumah', 'kk', 'lainnya'];
                foreach ($docTypes as $docType) {
                    if ($request->hasFile($docType)) {
                        $file = $request->file($docType);
                        if ($file instanceof UploadedFile) {
                            $handleUpload($file, $docType);
                        }
                    }
                }

                // 3. Berkas Base64 (Kamera PWA)
                foreach ($docTypes as $docType) {
                    $base64Field = "{$docType}_base64";
                    if ($request->filled($base64Field)) {
                        $handleBase64($request->input($base64Field), $docType);
                    } elseif ($request->filled($docType) && is_string($request->input($docType)) && str_contains($request->input($docType), 'base64')) {
                        $handleBase64($request->input($docType), $docType);
                    }
                }

                return $submission;
            });
        } catch (\Throwable $e) {
            foreach ($uploadedPaths as $path) {
                $this->fileUploadService->deleteFile($path);
            }

            Log::error('Submission creation failed during document upload / transaction', [
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse('Failed to create submission: '.$e->getMessage(), 500);
        }

        $admins = User::role(['Admin', 'Superadmin'])->get();
        Notification::send($admins, new SubmissionCreatedNotification($submission));

        $resource = new SubmissionResource($submission->load(['submissionDocuments.reviews', 'sales', 'user']));

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan berhasil dibuat.'.($dupResult['has_duplicate'] ? ' (Peringatan potensi duplikasi dicatat)' : ''),
            'data' => $resource,
            'duplicate_warnings' => $dupResult['warnings'],
            'has_duplicate' => $dupResult['has_duplicate'],
        ], 201);
    }

    /**
     * Display the specified submission.
     */
    public function show(Submission $submission): JsonResponse
    {
        Gate::authorize('view', $submission);

        return $this->successResponse(
            new SubmissionResource($submission->load(['user', 'validator', 'provisioning', 'submissionDocuments.reviews.reviewer']))
        );
    }

    /**
     * Update the specified submission in storage.
     *
     * Accepts the full editable field set. When the submission is in
     * need_info status the update atomically:
     *   1. Applies all validated field changes.
     *   2. Recalculates total_price if price-related fields are sent.
     *   3. Resets status → pending_validation and clears previous review annotations.
     */
    public function update(UpdateSubmissionRequest $request, Submission $submission): JsonResponse
    {
        Gate::authorize('update', $submission);

        if (! $submission->isEditable()) {
            return $this->errorResponse('Cannot update submission in this status', 400);
        }

        $validated = $request->validated();

        return DB::transaction(function () use ($submission, $validated) {
            // Recalculate total_price whenever either price field is included in the payload.
            // Uses the incoming value when present; falls back to the existing stored value.
            if (array_key_exists('package_price', $validated) || array_key_exists('installation_fee', $validated)) {
                $validated['total_price'] = (float) ($validated['package_price'] ?? $submission->package_price)
                    + (float) ($validated['installation_fee'] ?? $submission->installation_fee);
            }

            // Resubmit after need_info: advance to pending_validation so admin can distinguish
            // a resubmission from a brand-new pending submission, and clear stale review notes.
            // validated_by / validated_at are preserved as historical record (per spec).
            if (in_array($submission->status, [SubmissionStatus::NEED_INFO, SubmissionStatus::REJECTED])) {
                $validated['status'] = SubmissionStatus::PENDING_VALIDATION;
                $validated['validation_notes'] = null;
                $validated['rejection_reason'] = null;
            }

            $submission->update($validated);

            return $this->successResponse(
                new SubmissionResource(
                    $submission->load(['user', 'validator', 'provisioning', 'submissionDocuments.reviews'])
                ),
                'Submission updated successfully'
            );
        });
    }

    /**
     * Upload a document for a submission.
     */
    public function uploadDocument(UploadSubmissionDocumentRequest $request, Submission $submission): JsonResponse
    {
        Gate::authorize('uploadDocument', $submission);

        $file = $request->file('file');
        $documentType = $request->input('document_type');

        $directory = "submissions/{$submission->id}";
        $path = $this->fileUploadService->uploadFile($file, $directory);

        if (! $path) {
            return $this->errorResponse('Failed to upload document', 500);
        }

        try {
            $submission->addDocument($documentType, $path, $file->getClientOriginalName());
        } catch (\Throwable $e) {
            // Roll back the uploaded file if database write fails to prevent orphaned file leak
            $this->fileUploadService->deleteFile($path);

            Log::error('Failed to add document to submission database record', [
                'submission_id' => $submission->id,
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse('Failed to save document record', 500);
        }

        return $this->successResponse([
            'document_type' => $documentType,
            'path' => $path,
            'url' => $this->fileUploadService->getFileUrl($path),
        ], 'Document uploaded successfully');
    }

    /**
     * Delete a submission (Superadmin only).
     */
    public function destroy(Submission $submission): JsonResponse
    {
        Gate::authorize('delete', $submission);

        $submission->delete();

        return $this->successResponse(null, 'Submission deleted successfully');
    }
}
