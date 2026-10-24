<?php

namespace App\Modules\Complaint\Services;

use App\Models\Complaint;
use App\Modules\Dispatch\Services\DispatchService;
use Illuminate\Support\Facades\DB;

class ComplaintService
{
    protected DispatchService $dispatchService;

    public function __construct(DispatchService $dispatchService)
    {
        $this->dispatchService = $dispatchService;
    }

    /**
     * Create complaint ticket and dispatch to available team.
     */
    public function createComplaintAndDispatch(array $data, ?int $reportedById = null): Complaint
    {
        return DB::transaction(function () use ($data, $reportedById) {
            $ticketNumber = 'CMP-'.date('Ymd').'-'.sprintf('%04d', rand(1000, 9999));

            $complaint = Complaint::create([
                'ticket_number' => $ticketNumber,
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                'address' => $data['address'],
                'village' => $data['village'] ?? null,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'category' => $data['category'],
                'priority' => $data['priority'] ?? 'medium',
                'description' => $data['description'],
                'status' => 'open',
                'reported_by_id' => $reportedById,
            ]);

            // Dispatch via round-robin queue 'complaint'
            $this->dispatchService->assign($complaint, 'complaint', [
                'reason' => 'Tiket gangguan dialokasikan ke tim giliran',
            ]);

            return $complaint->fresh();
        });
    }
}
