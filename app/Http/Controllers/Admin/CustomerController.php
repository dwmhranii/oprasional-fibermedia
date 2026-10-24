<?php

namespace App\Http\Controllers\Admin;

use App\Exports\CustomersExport;
use App\Exports\CustomerTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Imports\CustomersImport;
use App\Models\Customer;
use App\Models\Submission;
use App\Utils\IdentifierGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CustomerController extends Controller
{
    /**
     * Export customers to Excel (.xlsx)
     */
    public function export(Request $request): BinaryFileResponse
    {
        $status = $request->query('status');
        $search = $request->query('search');
        $filename = 'data-pelanggan-fibermedia-'.date('Y-m-d').'.xlsx';

        return Excel::download(new CustomersExport($status, $search), $filename);
    }

    /**
     * Download sample Excel template for customer import
     */
    public function importTemplate(): BinaryFileResponse
    {
        return Excel::download(new CustomerTemplateExport, 'template-import-pelanggan.xlsx');
    }

    /**
     * Import customers from Excel / CSV file
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        $file = $request->file('file');
        $import = new CustomersImport;

        try {
            Excel::import($import, $file);

            $imported = $import->getImportedCount();
            $updated = $import->getUpdatedCount();
            $skipped = $import->getSkippedCount();
            $errors = $import->getErrors();

            $msg = "Import berhasil: {$imported} pelanggan baru ditambahkan";
            if ($updated > 0) {
                $msg .= ", {$updated} diperbarui";
            }
            if ($skipped > 0) {
                $msg .= ", {$skipped} dilewati";
            }
            $msg .= '.';

            return response()->json([
                'success' => true,
                'message' => $msg,
                'data' => [
                    'imported' => $imported,
                    'updated' => $updated,
                    'skipped' => $skipped,
                    'total_processed' => $imported + $updated + $skipped,
                    'errors' => array_slice($errors, 0, 10),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses file Excel: '.$e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display a listing of finalized customers.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->ensureSynced();

        $query = Customer::query()->with([
            'servicePackage',
            'odp',
            'bras',
            'installedByTeam',
            'sales',
            'submission.user',
            'submission.provisioning.tasks.teknisi',
            'submission.provisioning.tasks.assignments.evidence',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $query->filterAndSort($request, ['customer_code', 'name', 'phone', 'package', 'odp_code', 'address']);

        $perPage = $request->input('per_page', 15);
        $customers = $query->paginate($perPage);

        return CustomerResource::collection($customers);
    }

    /**
     * Get summary metrics for customers.
     */
    public function stats(): JsonResponse
    {
        $this->ensureSynced();

        $total = Customer::count();
        $active = Customer::where('status', 'active')->count();
        $suspended = Customer::where('status', 'suspended')->count();
        $terminated = Customer::where('status', 'terminated')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $active,
                'suspended' => $suspended,
                'terminated' => $terminated,
            ],
        ]);
    }

    /**
     * Automatically ensure any completed/approved submissions are populated into customers table.
     */
    private function ensureSynced(): void
    {
        $submissions = Submission::whereIn('status', ['completed', 'provisioned', 'approved'])
            ->whereNull('customer_id')
            ->get();

        foreach ($submissions as $submission) {
            $customerCode = $submission->customer_code
                ?? IdentifierGenerator::generateCustomerCode($submission->id, $submission->created_at);

            $customer = Customer::firstOrCreate([
                'customer_code' => $customerCode,
            ], [
                'name' => $submission->customer_name,
                'address' => $submission->address,
                'phone' => $submission->phone,
                'package' => $submission->package_name,
                'odp_code' => $submission->provisioning?->odp ?? 'ODP-01',
                'status' => 'active',
            ]);

            $submission->update([
                'customer_id' => $customer->id,
                'customer_code' => $customer->customer_code,
            ]);
        }
    }

    /**
     * Display the specified customer detail.
     */
    public function show(Customer $customer): JsonResponse
    {
        $customer->load([
            'submission.user',
            'submission.provisioning.tasks.teknisi',
            'submission.provisioning.tasks.assignments.evidence',
        ]);

        return response()->json([
            'success' => true,
            'data' => new CustomerResource($customer),
        ]);
    }

    /**
     * Update customer status (active, suspended, terminated).
     */
    public function updateStatus(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:active,suspended,terminated',
            'notes' => 'nullable|string|max:500',
        ]);

        $oldStatus = $customer->status;
        $customer->update([
            'status' => $validated['status'],
        ]);

        activity('customer')
            ->performedOn($customer)
            ->causedBy($request->user())
            ->withProperties(['old_status' => $oldStatus, 'new_status' => $validated['status'], 'notes' => $validated['notes'] ?? null])
            ->log("Customer status updated to {$validated['status']}");

        return response()->json([
            'success' => true,
            'message' => "Status pelanggan berhasil diubah menjadi {$validated['status']}.",
            'data' => new CustomerResource($customer),
        ]);
    }

    /**
     * Update customer profile details.
     */
    public function update(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'address' => 'sometimes|required|string',
            'phone' => 'sometimes|required|string|max:30',
            'package' => 'sometimes|required|string|max:100',
            'odp_code' => 'nullable|string|max:50',
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data pelanggan berhasil diperbarui.',
            'data' => new CustomerResource($customer),
        ]);
    }

    /**
     * Delete the customer record (Superadmin only).
     */
    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        if (! $request->user()->hasRole('Superadmin') && ! $request->user()->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Superadmin yang memiliki izin untuk menghapus data pelanggan.',
            ], 403);
        }

        // Disassociate related submission if any
        Submission::where('customer_id', $customer->id)
            ->update(['customer_id' => null, 'customer_code' => null]);

        activity('customer')
            ->performedOn($customer)
            ->causedBy($request->user())
            ->withProperties(['customer_code' => $customer->customer_code, 'name' => $customer->name])
            ->log("Customer {$customer->customer_code} deleted by {$request->user()->name}");

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data pelanggan berhasil dihapus.',
        ]);
    }
}
