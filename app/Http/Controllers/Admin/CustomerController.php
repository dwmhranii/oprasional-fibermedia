<?php

namespace App\Http\Controllers\Admin;

use App\Exports\CustomersExport;
use App\Exports\CustomerTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\CustomerStoreRequest;
use App\Http\Requests\Customer\CustomerUpdateRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\CustomerSecretResource;
use App\Imports\CustomersImport;
use App\Models\Customer;
use App\Models\Package;
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
     * Export customers to Excel (.xlsx) dengan 35 kolom.
     * NIK dan Password hanya disertakan jika pengguna memiliki izin 'customers.view_secret'.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $status = $request->query('status');
        $search = $request->query('search');
        $filename = 'data-pelanggan-fibermedia-'.date('Y-m-d').'.xlsx';

        $user = $request->user();
        $canViewSecrets = $user && ($user->can('customers.view_secret') || $user->hasRole(['Superadmin', 'superadmin']));

        return Excel::download(new CustomersExport($status, $search, $canViewSecrets), $filename);
    }

    /**
     * Download sample Excel template for customer import
     */
    public function importTemplate(): BinaryFileResponse
    {
        return Excel::download(new CustomerTemplateExport, 'template-import-pelanggan.xlsx');
    }

    /**
     * Import customers from Excel / CSV file with 35 columns and error report
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

            $msg = "Import selesai: {$imported} pelanggan baru ditambahkan";
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
                    'errors' => $errors,
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
     * Display a listing of customers with 35-column filtering, search, sorting, and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->ensureSynced();

        $query = Customer::query()->with([
            'servicePackage',
            'odp.odc',
            'bras',
            'installedByTeam',
            'sales',
            'complaints',
        ]);

        // Filter: Status
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        // Filter: Wilayah
        if ($request->filled('wilayah') && $request->input('wilayah') !== 'all') {
            $query->where('wilayah', $request->input('wilayah'));
        }

        // Filter: Paket
        if ($request->filled('package_id')) {
            $query->where('package_id', $request->input('package_id'));
        }

        // Filter: ODP
        if ($request->filled('odp_id')) {
            $query->where('odp_id', $request->input('odp_id'));
        }

        // Filter: Tipe Layanan
        if ($request->filled('service_type')) {
            $query->where('service_type', $request->input('service_type'));
        }

        // Filter: Sales
        if ($request->filled('sales_id')) {
            $query->where('sales_id', $request->input('sales_id'));
        }

        // Filter: Tim Pemasang / Teknisi
        if ($request->filled('installed_by_team_id')) {
            $query->where('installed_by_team_id', $request->input('installed_by_team_id'));
        }

        // Filter: Hutang > 0
        if ($request->boolean('has_debt') || $request->input('debt_gt_zero') === 'true' || $request->input('debt_gt_zero') === '1') {
            $query->where('debt', '>', 0);
        }

        // Filter: Rentang Expired Date
        if ($request->filled('expires_from')) {
            $query->whereDate('expires_at', '>=', $request->input('expires_from'));
        }
        if ($request->filled('expires_to')) {
            $query->whereDate('expires_at', '<=', $request->input('expires_to'));
        }

        // Pencarian trigram / fuzzy (nama, ID, telepon, username, ODP)
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('customer_code', 'like', "%{$s}%")
                    ->orWhere('name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('phone_normalized', 'like', "%{$s}%")
                    ->orWhere('username', 'like', "%{$s}%")
                    ->orWhere('address', 'like', "%{$s}%")
                    ->orWhereHas('odp', function ($oq) use ($s) {
                        $oq->where('code', 'like', "%{$s}%")
                            ->orWhere('name', 'like', "%{$s}%");
                    });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSort = [
            'id', 'customer_code', 'name', 'status', 'expires_at', 'subscribed_at',
            'monthly_price', 'debt', 'service_type', 'wilayah', 'created_at',
        ];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('id', 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        $customers = $query->paginate($perPage);

        return CustomerResource::collection($customers);
    }

    /**
     * Store a newly created customer with full 35 columns validation.
     */
    public function store(CustomerStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Buat ID Pelanggan otomatis (IdentifierGenerator)
        $customerCode = IdentifierGenerator::generateCustomerCode(null, now());
        while (Customer::where('customer_code', $customerCode)->exists()) {
            $customerCode = 'FM-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));
        }
        $validated['customer_code'] = $customerCode;

        // Auto-fill harga jika paket dipilih dan harga belum diisi
        if (! empty($validated['package_id']) && empty($validated['monthly_price'])) {
            $package = Package::find($validated['package_id']);
            if ($package) {
                $validated['monthly_price'] = (float) $package->price;
                $validated['package'] = $package->name;
            }
        }

        $customer = Customer::create($validated);

        activity('customer')
            ->performedOn($customer)
            ->causedBy($request->user())
            ->withProperties(['customer_code' => $customer->customer_code, 'name' => $customer->name])
            ->log("Pelanggan baru {$customer->customer_code} ({$customer->name}) berhasil ditambahkan.");

        return (new CustomerResource($customer))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified customer detail.
     */
    public function show(Customer $customer): CustomerResource
    {
        $customer->load([
            'servicePackage',
            'odp.odc',
            'bras',
            'installedByTeam',
            'sales',
            'complaints',
            'submission.user',
            'submission.provisioning.tasks.teknisi',
            'submission.provisioning.tasks.assignments.evidence',
        ]);

        return new CustomerResource($customer);
    }

    /**
     * Endpoint terpisah untuk melihat NIK mentah dan password pelanggan.
     * Wajib memiliki izin 'customers.view_secret'.
     * Setiap akses dicatat di Spatie Activitylog.
     */
    public function showSecrets(Request $request, Customer $customer): CustomerSecretResource
    {
        $user = $request->user();

        $canView = false;
        if ($user) {
            if ($user->hasRole(['Superadmin', 'superadmin'])) {
                $canView = true;
            } else {
                try {
                    $canView = $user->hasPermissionTo('customers.view_secret', 'web')
                        || $user->can('customers.view_secret')
                        || $user->getAllPermissions()->contains('name', 'customers.view_secret');
                } catch (\Throwable) {
                    $canView = false;
                }
            }
        }

        if (! $canView) {
            abort(403, 'Anda tidak memiliki izin (customers.view_secret) untuk melihat data sensitif pelanggan.');
        }

        activity('customer_security')
            ->performedOn($customer)
            ->causedBy($user)
            ->withProperties([
                'customer_id' => $customer->id,
                'customer_code' => $customer->customer_code,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ])
            ->log("Pengguna {$user->name} membuka kredensial rahasia (NIK/Password) pelanggan {$customer->customer_code}");

        return new CustomerSecretResource($customer);
    }

    /**
     * Update customer status (active, suspended, terminated).
     */
    public function updateStatus(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:active,suspended,inactive,terminated',
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
            ->log("Status pelanggan {$customer->customer_code} diubah menjadi {$validated['status']}");

        return response()->json([
            'success' => true,
            'message' => "Status pelanggan berhasil diubah menjadi {$validated['status']}.",
            'data' => new CustomerResource($customer),
        ]);
    }

    /**
     * Update customer details. ID Pelanggan tidak dapat diubah.
     */
    public function update(CustomerUpdateRequest $request, Customer $customer): JsonResponse
    {
        $validated = $request->validated();

        // Pastikan customer_code tidak dapat diubah
        unset($validated['customer_code']);

        // Jika package_id berubah dan monthly_price kosong, ambil dari harga paket bawaan
        if (! empty($validated['package_id']) && ! isset($validated['monthly_price'])) {
            $package = Package::find($validated['package_id']);
            if ($package) {
                $validated['package'] = $package->name;
            }
        }

        $customer->update($validated);

        activity('customer')
            ->performedOn($customer)
            ->causedBy($request->user())
            ->withProperties(['customer_code' => $customer->customer_code, 'name' => $customer->name])
            ->log("Data pelanggan {$customer->customer_code} diperbarui.");

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
                'status' => 'active',
            ]);

            $submission->update([
                'customer_id' => $customer->id,
                'customer_code' => $customer->customer_code,
            ]);
        }
    }
}
