<?php

namespace App\Http\Controllers\Admin;

use App\Events\DocumentReviewed;
use App\Http\Controllers\Controller;
use App\Models\SubmissionDocument;
use App\Notifications\DocumentReviewNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class SubmissionDocumentController extends Controller
{
    /**
     * Review a specific submission document.
     */
    public function review(Request $request, SubmissionDocument $document): JsonResponse
    {
        Gate::authorize('review', $document);

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected,needs_revision',
            'review_notes' => 'required_if:status,rejected,needs_revision|string|nullable',
        ]);

        $document = DB::transaction(function () use ($document, $validated) {
            $document->update([
                'status' => $validated['status'],
            ]);

            $document->reviews()->create([
                'status' => $validated['status'],
                'review_notes' => $validated['review_notes'] ?? null,
                'reviewed_by' => Auth::id(),
                'reviewed_at' => now(),
            ]);

            return $document;
        });

        // Add explicit activity log
        $actionMap = [
            'approved' => 'approved',
            'rejected' => 'rejected',
            'needs_revision' => 'marked for revision',
        ];

        $action = $actionMap[$validated['status']];
        activity()
            ->causedBy(Auth::user())
            ->performedOn($document->submission)
            ->log("Document {$document->document_type} {$action} by Admin ".Auth::user()->name);

        // Dispatch Realtime Event
        event(new DocumentReviewed($document));

        // Send Notification if rejected or needs revision
        if (in_array($validated['status'], ['rejected', 'needs_revision'])) {
            $document->submission->user->notify(new DocumentReviewNotification($document));
        }

        return $this->successResponse($document->load('reviews'), 'Document reviewed successfully');
    }
}
