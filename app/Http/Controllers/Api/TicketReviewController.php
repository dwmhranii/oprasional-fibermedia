<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Task;
use App\Modules\Field\Services\PhaseWorkflowService;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TicketReviewController extends Controller
{
    public function __construct(protected PhaseWorkflowService $workflowService) {}

    /**
     * Memastikan user memiliki izin tickets.review.
     */
    protected function authorizeReview(Request $request): void
    {
        $user = $request->user();

        // Ensure permission exists in DB and default assign to Admin role
        try {
            $perm = Permission::firstOrCreate(['name' => 'tickets.review', 'guard_name' => 'web']);
            $adminRole = Role::where('name', 'Admin')->first();
            if ($adminRole && ! $adminRole->hasPermissionTo('tickets.review')) {
                $adminRole->givePermissionTo($perm);
            }
        } catch (\Throwable) {
            // Ignored if table not ready or permission caching
        }

        $hasPermission = false;
        try {
            $hasPermission = $user->hasPermissionTo('tickets.review') || $user->hasRole('Superadmin');
        } catch (\Throwable) {
            $hasPermission = false;
        }

        if (! $hasPermission) {
            abort(403, 'Anda tidak memiliki izin tickets.review untuk melakukan tindakan peninjauan tiket.');
        }
    }

    /**
     * Resolves task or complaint ticket by type and id.
     */
    protected function resolveTicket(string $type, $id)
    {
        return $type === 'psb'
            ? Task::findOrFail($id)
            : Complaint::findOrFail($id);
    }

    /**
     * Setujui hasil pekerjaan tiket.
     */
    public function approve(Request $request, string $type, $id)
    {
        $this->authorizeReview($request);
        $ticket = $this->resolveTicket($type, $id);

        $request->validate([
            'note' => 'nullable|string|max:1000',
        ]);

        $this->workflowService->approveReview($ticket, $request->user(), $request->input('note'));

        return response()->json([
            'success' => true,
            'message' => 'Tiket berhasil disetujui.',
            'data' => $ticket->fresh(),
        ]);
    }

    /**
     * Minta ulang pengerjaan tiket (rework). Tiket kembali ke tim dengan status Dikerjakan.
     */
    public function rework(Request $request, string $type, $id)
    {
        $this->authorizeReview($request);
        $ticket = $this->resolveTicket($type, $id);

        $request->validate([
            'reason' => 'required|string|min:5|max:1000',
        ], [
            'reason.required' => 'Alasan minta ulang pengerjaan tiket wajib diisi.',
            'reason.min' => 'Alasan minta ulang minimal 5 karakter.',
        ]);

        $this->workflowService->reworkReview($ticket, $request->user(), $request->input('reason'));

        return response()->json([
            'success' => true,
            'message' => 'Tiket dikembalikan ke tim dengan status Dikerjakan untuk pengerjaan ulang.',
            'data' => $ticket->fresh(),
        ]);
    }

    /**
     * Tandai tiket bermasalah (flagged).
     */
    public function flag(Request $request, string $type, $id)
    {
        $this->authorizeReview($request);
        $ticket = $this->resolveTicket($type, $id);

        $request->validate([
            'reason' => 'required|string|min:5|max:1000',
        ], [
            'reason.required' => 'Alasan penandaan tiket bermasalah wajib diisi.',
            'reason.min' => 'Alasan penandaan minimal 5 karakter.',
        ]);

        $this->workflowService->flagReview($ticket, $request->user(), $request->input('reason'));

        return response()->json([
            'success' => true,
            'message' => 'Tiket berhasil ditandai bermasalah.',
            'data' => $ticket->fresh(),
        ]);
    }

    /**
     * Bebaskan anggota dari absensi Fase 2 dengan alasan wajib.
     */
    public function waive(Request $request, string $type, $id)
    {
        $this->authorizeReview($request);
        $ticket = $this->resolveTicket($type, $id);

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'reason' => 'required|string|min:5|max:1000',
        ], [
            'reason.required' => 'Alasan pembebasan teknisi wajib diisi.',
            'reason.min' => 'Alasan pembebasan minimal 5 karakter.',
        ]);

        $req = $this->workflowService->waivePhase2Requirement(
            $ticket,
            (int) $request->user_id,
            $request->user(),
            $request->input('reason')
        );

        return response()->json([
            'success' => true,
            'message' => 'Teknisi berhasil dibebaskan dari persyaratan absensi tiket.',
            'data' => $req,
            'is_fully_completed' => $this->workflowService->isPhase2FullyCompleted($ticket),
            'ticket' => $ticket->fresh(),
        ]);
    }
}
