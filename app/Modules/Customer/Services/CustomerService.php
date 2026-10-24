<?php

namespace App\Modules\Customer\Services;

use App\Models\Customer;
use Illuminate\Pagination\LengthAwarePaginator;

class CustomerService
{
    /**
     * Get paginated customer list with eager loading of relations.
     */
    public function getPaginatedCustomers(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Customer::query()->with([
            'submission.provisioning.tasks',
            'servicePackage',
            'odp',
            'bras',
            'installedByTeam',
            'sales',
        ]);

        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('customer_code', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('odp_code', 'like', "%{$search}%");
            });
        }

        return $query->latest('id')->paginate($perPage);
    }

    /**
     * Update customer status with activity log.
     */
    public function updateStatus(Customer $customer, string $status, ?string $note = null): Customer
    {
        $oldStatus = $customer->status;
        $customer->status = $status;
        if ($note) {
            $customer->notes = $customer->notes ? ($customer->notes."\n".$note) : $note;
        }
        $customer->save();

        activity()
            ->performedOn($customer)
            ->causedBy(auth()->user())
            ->withProperties(['old_status' => $oldStatus, 'new_status' => $status, 'note' => $note])
            ->log("Customer status updated from {$oldStatus} to {$status}");

        return $customer;
    }

    /**
     * Get customer statistics for admin dashboard.
     */
    public function getCustomerStats(): array
    {
        return [
            'total' => Customer::count(),
            'active' => Customer::where('status', 'active')->count(),
            'suspended' => Customer::where('status', 'suspended')->count(),
            'terminated' => Customer::where('status', 'terminated')->count(),
            'total_debt' => (float) Customer::sum('debt'),
        ];
    }
}
