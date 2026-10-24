<?php

namespace App\Http\Controllers\Admin;

use App\Exports\SubmissionsExport;
use App\Http\Controllers\Controller;
use App\Models\Submission;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function exportExcel(Request $request)
    {
        Gate::authorize('viewAny', Submission::class);
        $status = $request->input('status');

        return Excel::download(new SubmissionsExport($status), 'submissions.xlsx');
    }

    public function exportPdf(Submission $submission)
    {
        Gate::authorize('view', $submission);
        $submission->load(['user', 'validator', 'provisioning.tasks.teknisi', 'provisioning.tasks.assignments.user']);

        $pdf = Pdf::loadView('reports.submission-detail', ['submission' => $submission]);

        return $pdf->download("submission_{$submission->submission_number}.pdf");
    }

    public function exportBast(Submission $submission)
    {
        Gate::authorize('view', $submission);
        $submission->load([
            'user',
            'validator',
            'provisioning.tasks.assignments.user',
            'provisioning.tasks.assignments.evidence',
        ]);

        $pdf = Pdf::loadView('reports.bast', ['submission' => $submission]);

        return $pdf->download("BAST_{$submission->submission_number}.pdf");
    }
}
