<?php

namespace App\Modules\Network\Services;

use App\Enums\ComplaintCategory;
use App\Enums\ComplaintPriority;
use App\Enums\ComplaintStatus;
use App\Models\CableTrack;
use App\Models\Complaint;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\User;
use App\Modules\Dispatch\Services\DispatchService;
use App\Utils\IdentifierGenerator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MassOutageService
{
    protected DispatchService $dispatchService;

    public function __construct(DispatchService $dispatchService)
    {
        $this->dispatchService = $dispatchService;
    }

    /**
     * Dapatkan model elemen jaringan berdasarkan tipe dan ID.
     */
    public function getElement(string $elementType, int $elementId)
    {
        return match ($elementType) {
            'odc' => Odc::findOrFail($elementId),
            'odp' => Odp::findOrFail($elementId),
            'cable_track', 'cable' => CableTrack::findOrFail($elementId),
            default => throw new \InvalidArgumentException("Tipe elemen jaringan tidak valid: {$elementType}"),
        };
    }

    /**
     * Tampilkan seluruh pelanggan terdampak (lewat odp_id) dari ODC/ODP/Kabel terkait.
     */
    public function getAffectedCustomers(string $elementType, int $elementId): Collection
    {
        $element = $this->getElement($elementType, $elementId);

        return $element->getAffectedCustomers();
    }

    /**
     * Picu gangguan massal bila status ODC/ODP/kabel menjadi disrupted atau cut.
     * Membuat SATU tiket (Complaint) untuk banyak pelanggan terdampak,
     * dan menautkan seluruh pelanggan ke tiket tersebut.
     */
    public function triggerMassOutage(
        string $elementType,
        int $elementId,
        string $status,
        ?string $notes = null,
        ?User $actor = null
    ): array {
        if (! in_array($status, ['disrupted', 'cut'])) {
            throw new \InvalidArgumentException("Status gangguan harus 'disrupted' atau 'cut'. Diberikan: {$status}");
        }

        return DB::transaction(function () use ($elementType, $elementId, $status, $notes, $actor) {
            $element = $this->getElement($elementType, $elementId);

            // 1. Perbarui status operasional elemen jaringan
            $element->update([
                'operational_status' => $status,
            ]);

            // 2. Ambil seluruh pelanggan terdampak melalui odp_id
            $affectedCustomers = $element->getAffectedCustomers();
            $firstCustomer = $affectedCustomers->first();
            $count = $affectedCustomers->count();

            $typeLabel = strtoupper($elementType === 'cable_track' ? 'Kabel' : $elementType);
            $ticketNumber = IdentifierGenerator::generate('CMP');

            $custNameDisplay = $count > 1
                ? "{$firstCustomer->name} (+".($count - 1).' pelanggan terdampak)'
                : ($firstCustomer?->name ?? "Pelanggan Jalur {$element->name}");

            // 3. Buat SATU tiket pengaduan gangguan massal (Complaint)
            $complaint = Complaint::create([
                'ticket_number' => $ticketNumber,
                'customer_id' => $firstCustomer?->id,
                'customer_code' => $firstCustomer?->customer_code ?? "MASS-{$element->code}",
                'customer_name' => $custNameDisplay,
                'customer_phone' => $firstCustomer?->phone ?? '-',
                'customer_address' => $element->address ?? ($firstCustomer?->address ?? '-'),
                'customer_lat' => $element->latitude ? (float) $element->latitude : $firstCustomer?->latitude,
                'customer_lng' => $element->longitude ? (float) $element->longitude : $firstCustomer?->longitude,
                'area' => $element->wilayah ?? $firstCustomer?->wilayah ?? 'Wilayah Jaringan',
                'category' => ComplaintCategory::MASS_OUTAGE,
                'subject' => "Gangguan Massal: {$typeLabel} {$element->name} ({$status})",
                'description' => "Terjadi gangguan massal pada {$typeLabel} {$element->name} (Kode: {$element->code}). Status: {$status}. Total pelanggan terdampak: {$count}. Catatan admin: {$notes}",
                'priority' => ComplaintPriority::CRITICAL,
                'status' => ComplaintStatus::OPEN,
                'is_mass_outage' => true,
                'affected_element_type' => $elementType,
                'affected_element_id' => $elementId,
                'created_by_id' => $actor?->id,
            ]);

            // 4. Tautkan SEMUA pelanggan terdampak ke tiket tersebut (pivot complaint_affected_customers)
            if ($affectedCustomers->isNotEmpty()) {
                $pivotData = $affectedCustomers->map(function ($cust) use ($complaint) {
                    return [
                        'complaint_id' => $complaint->id,
                        'customer_id' => $cust->id,
                        'odp_id' => $cust->odp_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                })->toArray();

                DB::table('complaint_affected_customers')->insertOrIgnore($pivotData);
            }

            // 5. Masukkan tiket ke antrean dispatch teknisi lapangan (Fase 2)
            $this->dispatchService->assign($complaint, 'complaint', [
                'reason' => "Gangguan Massal {$typeLabel} {$element->name} ({$status})",
                'actor_id' => $actor?->id,
            ]);

            // 6. Catat riwayat ke ticket_events
            DB::table('ticket_events')->insert([
                'eventable_type' => Complaint::class,
                'eventable_id' => $complaint->id,
                'actor_id' => $actor?->id,
                'event' => 'mass_outage_created',
                'from_status' => null,
                'to_status' => 'open',
                'payload' => json_encode([
                    'element_type' => $elementType,
                    'element_id' => $elementId,
                    'element_name' => $element->name,
                    'status' => $status,
                    'affected_customers_count' => $count,
                    'customer_ids' => $affectedCustomers->pluck('id')->toArray(),
                ]),
                'occurred_at' => now(),
            ]);

            return [
                'complaint' => $complaint->fresh(['affectedCustomers', 'assignedTeam']),
                'affected_customers' => $affectedCustomers,
                'affected_count' => $count,
                'element' => $element,
            ];
        });
    }

    /**
     * Pulihkan status elemen jaringan ke normal dan tandai tiket gangguan massal selesai/teratasi.
     */
    public function resolveMassOutage(
        string $elementType,
        int $elementId,
        ?string $resolutionNotes = null,
        ?User $actor = null
    ): array {
        return DB::transaction(function () use ($elementType, $elementId, $resolutionNotes, $actor) {
            $element = $this->getElement($elementType, $elementId);
            $element->update(['operational_status' => 'normal']);

            $activeComplaints = Complaint::where('affected_element_type', $elementType)
                ->where('affected_element_id', $elementId)
                ->where('is_mass_outage', true)
                ->whereIn('status', [ComplaintStatus::OPEN, ComplaintStatus::ASSIGNED, ComplaintStatus::IN_PROGRESS])
                ->get();

            foreach ($activeComplaints as $complaint) {
                $complaint->update([
                    'status' => ComplaintStatus::RESOLVED,
                    'resolved_at' => now(),
                    'status_reason' => $resolutionNotes ?: 'Infrastruktur jaringan normal kembali',
                ]);

                DB::table('ticket_events')->insert([
                    'eventable_type' => Complaint::class,
                    'eventable_id' => $complaint->id,
                    'actor_id' => $actor?->id,
                    'event' => 'mass_outage_resolved',
                    'from_status' => 'in_progress',
                    'to_status' => 'resolved',
                    'payload' => json_encode([
                        'element_type' => $elementType,
                        'element_id' => $elementId,
                        'notes' => $resolutionNotes,
                    ]),
                    'occurred_at' => now(),
                ]);
            }

            return [
                'element' => $element,
                'resolved_complaints_count' => $activeComplaints->count(),
            ];
        });
    }
}
