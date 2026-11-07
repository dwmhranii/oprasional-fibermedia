<?php

namespace App\Modules\Network\Services;

use App\Enums\ComplaintCategory;
use App\Enums\ComplaintPriority;
use App\Enums\ComplaintStatus;
use App\Models\CableTrack;
use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DispatchSetting;
use App\Models\Incident;
use App\Models\IncidentCustomer;
use App\Models\NetworkCable;
use App\Models\NetworkStatusLog;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use App\Models\User;
use App\Modules\Dispatch\Services\DispatchService;
use App\Utils\IdentifierGenerator;
use Illuminate\Support\Facades\DB;

class IncidentService
{
    public function __construct(
        protected AffectedCustomersResolver $resolver,
        protected DispatchService $dispatchService
    ) {}

    /**
     * Dapatkan model elemen jaringan fisik.
     */
    public function getNode(string $nodeType, int $nodeId)
    {
        return match (strtolower($nodeType)) {
            'olt' => Olt::findOrFail($nodeId),
            'odc' => Odc::findOrFail($nodeId),
            'odp' => Odp::findOrFail($nodeId),
            'cable', 'network_cable', 'cable_track' => NetworkCable::find($nodeId) ?? CableTrack::findOrFail($nodeId),
            default => throw new \InvalidArgumentException("Tipe simpul tidak valid: {$nodeType}"),
        };
    }

    /**
     * Pratinjau (dry run) dampak gangguan massal sebelum dikonfirmasi.
     */
    public function preview(string $nodeType, int $nodeId): array
    {
        $resolved = $this->resolver->resolve($nodeType, $nodeId);
        $ancestorIncident = $this->findAncestorOpenIncident($nodeType, $nodeId);
        $descendantIncidents = $this->findDescendantOpenIncidents($nodeType, $nodeId);
        $currentIncident = Incident::where('node_type', $nodeType)
            ->where('node_id', $nodeId)
            ->where('status', 'open')
            ->first();

        return [
            'total_affected' => $resolved['total_affected'],
            'isolated_count' => $resolved['isolated_count'],
            'per_odp' => $resolved['per_odp'],
            'customers' => $resolved['customers'],
            'node_info' => $resolved['node_info'],
            'current_incident' => $currentIncident,
            'ancestor_incident' => $ancestorIncident,
            'descendant_incidents' => $descendantIncidents,
        ];
    }

    /**
     * Buka insiden atau pratinjau saat status simpul menjadi disrupted atau cut.
     */
    public function openFromStatusChange(
        string $nodeType,
        int $nodeId,
        string $status,
        ?string $reason = null,
        ?User $actor = null,
        bool $dryRun = false
    ): array {
        $nodeType = strtolower($nodeType);
        if (! in_array($status, ['disrupted', 'cut'])) {
            throw new \InvalidArgumentException("Status gangguan harus 'disrupted' atau 'cut'. Diberikan: {$status}");
        }

        // Cek setting auto-create jika dryRun tidak dipaksa
        $dispatchSetting = DispatchSetting::first();
        $autoCreate = (bool) ($dispatchSetting?->incident_auto_create ?? false);

        if ($dryRun && ! $autoCreate) {
            return array_merge(['mode' => 'preview'], $this->preview($nodeType, $nodeId));
        }

        return DB::transaction(function () use ($nodeType, $nodeId, $status, $reason, $actor) {
            $node = $this->getNode($nodeType, $nodeId);
            $fromStatus = $node->status ?? $node->operational_status ?? 'normal';

            // 1. Perbarui status operasional simpul fisik
            if (isset($node->status)) {
                $node->update(['status' => $status]);
            }
            if (isset($node->operational_status)) {
                $node->update(['operational_status' => $status]);
            }

            // Catat log perubahan status jaringan
            NetworkStatusLog::create([
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'from_status' => $fromStatus,
                'to_status' => $status,
                'reason' => $reason ?? 'Perubahan status operasional ke '.$status,
                'source' => 'manual',
                'user_id' => $actor?->id,
            ]);

            // 2. Cek idempotensi: bila exact node ini sudah punya incident open
            $existingIncident = Incident::where('node_type', $nodeType)
                ->where('node_id', $nodeId)
                ->where('status', 'open')
                ->first();

            if ($existingIncident) {
                return [
                    'mode' => 'existing',
                    'incident' => $existingIncident->load(['complaint', 'customers']),
                    'complaint' => $existingIncident->complaint,
                    'message' => "Insiden terbuka sudah ada untuk {$nodeType} #{$nodeId}",
                ];
            }

            // 3. Cek aturan penggabungan ke atas: apakah ada insiden terbuka pada simpul induk (ancestor)?
            $ancestorIncident = $this->findAncestorOpenIncident($nodeType, $nodeId);
            if ($ancestorIncident) {
                // Tautkan pelanggan baru ke insiden induk tanpa membuat tiket baru
                $resolved = $this->resolver->resolve($nodeType, $nodeId);
                $this->attachCustomersToIncident($ancestorIncident, $resolved['customers']);

                return [
                    'mode' => 'merged_to_ancestor',
                    'incident' => $ancestorIncident->load(['complaint', 'customers']),
                    'complaint' => $ancestorIncident->complaint,
                    'message' => "Pelanggan ditautkan ke gangguan massal induk: {$ancestorIncident->code}",
                ];
            }

            // 4. Hitung pelanggan terdampak
            $resolved = $this->resolver->resolve($nodeType, $nodeId);
            $customers = $resolved['customers'];
            $totalCount = $resolved['total_affected'];
            $nodeInfo = $resolved['node_info'];

            // 5. Buat entri Incident baru
            $code = IdentifierGenerator::generateIncidentCode();
            $incident = Incident::create([
                'code' => $code,
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'status' => 'open',
                'severity' => $status,
                'started_at' => now(),
                'detected_at' => now(),
                'source' => 'manual',
                'summary' => $reason ?? "Gangguan massal pada {$nodeType} {$nodeInfo['name']}",
                'created_by' => $actor?->id,
            ]);

            // Tautkan seluruh pelanggan ke incident_customers
            $this->attachCustomersToIncident($incident, $customers);

            // 6. Cek aturan penggabungan ke bawah: jika simpul ini adalah induk dari insiden terbuka lain
            $descendantIncidents = $this->findDescendantOpenIncidents($nodeType, $nodeId);
            foreach ($descendantIncidents as $childIncident) {
                $childIncident->update([
                    'status' => 'merged',
                    'merged_into_id' => $incident->id,
                    'resolved_at' => now(),
                ]);

                // Pindah / tautkan pelanggan anak ke insiden induk
                $childCustomers = $childIncident->customers;
                $this->attachCustomersToIncident($incident, $childCustomers);

                // Tutup tiket anak dengan alasan "digabung"
                if ($childComplaint = $childIncident->complaint) {
                    $childComplaint->update([
                        'status' => ComplaintStatus::CLOSED,
                        'status_reason' => "Tiket digabung ke gangguan massal induk: {$incident->code}",
                        'closed_at' => now(),
                    ]);
                }
            }

            // 7. Buat SATU tiket pengaduan gangguan massal (Complaint)
            $typeLabel = strtoupper($nodeType === 'cable' ? 'Kabel' : $nodeType);
            $firstCustomer = $customers->first();
            $custNameDisplay = $totalCount > 1
                ? "{$firstCustomer?->name} (+".($totalCount - 1).' pelanggan terdampak)'
                : ($firstCustomer?->name ?? "Pelanggan Jalur {$nodeInfo['name']}");

            $ticketNumber = IdentifierGenerator::generate('CMP');
            $complaint = Complaint::create([
                'ticket_number' => $ticketNumber,
                'incident_id' => $incident->id,
                'is_mass' => true,
                'is_mass_outage' => true,
                'customer_id' => $firstCustomer?->id,
                'customer_code' => $firstCustomer?->customer_code ?? "MASS-{$nodeInfo['code']}",
                'customer_name' => $custNameDisplay,
                'customer_phone' => $firstCustomer?->phone ?? '-',
                'customer_address' => $nodeInfo['address'] ?? ($firstCustomer?->address ?? '-'),
                'customer_lat' => $nodeInfo['latitude'] ?? $firstCustomer?->latitude,
                'customer_lng' => $nodeInfo['longitude'] ?? $firstCustomer?->longitude,
                'area' => $firstCustomer?->wilayah ?? 'Wilayah Jaringan',
                'category' => ComplaintCategory::MASS_OUTAGE,
                'subject' => "Gangguan Massal: {$typeLabel} {$nodeInfo['name']} ({$status})",
                'description' => "Terjadi gangguan massal pada {$typeLabel} {$nodeInfo['name']} (Kode: {$nodeInfo['code']}). Status: {$status}. Total pelanggan terdampak: {$totalCount}. Alasan: {$reason}",
                'priority' => ComplaintPriority::CRITICAL,
                'status' => ComplaintStatus::OPEN,
                'affected_element_type' => $nodeType,
                'affected_element_id' => $nodeId,
                'created_by_id' => $actor?->id,
            ]);

            // Tautkan juga ke tabel pivot lama complaint_affected_customers untuk kompatibilitas
            if ($customers->isNotEmpty()) {
                $pivotData = $customers->map(function ($cust) use ($complaint) {
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

            // 8. Masukkan ke antrean dispatch teknisi lapangan (Fase 2)
            $this->dispatchService->assign($complaint, 'complaint', [
                'reason' => "Gangguan Massal {$typeLabel} {$nodeInfo['name']} ({$status})",
                'actor_id' => $actor?->id,
            ]);

            // 9. Catat riwayat ke ticket_events
            DB::table('ticket_events')->insert([
                'eventable_type' => Complaint::class,
                'eventable_id' => $complaint->id,
                'actor_id' => $actor?->id,
                'event' => 'mass_outage_created',
                'from_status' => null,
                'to_status' => 'open',
                'payload' => json_encode([
                    'incident_id' => $incident->id,
                    'incident_code' => $incident->code,
                    'node_type' => $nodeType,
                    'node_id' => $nodeId,
                    'node_name' => $nodeInfo['name'],
                    'status' => $status,
                    'affected_customers_count' => $totalCount,
                ]),
                'occurred_at' => now(),
            ]);

            return [
                'mode' => 'created',
                'incident' => $incident->fresh(['complaint', 'customers']),
                'complaint' => $complaint->fresh(['affectedCustomers', 'assignedTeam']),
                'affected_count' => $totalCount,
                'element' => $node,
            ];
        });
    }

    /**
     * Pulihkan gangguan massal: ubah status simpul kembali ke normal,
     * set incident ke resolved, dan seluruh incident_customers menjadi restored.
     */
    public function resolveMassOutage(
        string $nodeType,
        int $nodeId,
        ?string $resolutionNotes = null,
        ?User $actor = null
    ): array {
        return DB::transaction(function () use ($nodeType, $nodeId, $resolutionNotes, $actor) {
            $node = $this->getNode($nodeType, $nodeId);
            $fromStatus = $node->status ?? $node->operational_status ?? 'disrupted';

            if (isset($node->status)) {
                $node->update(['status' => 'normal']);
            }
            if (isset($node->operational_status)) {
                $node->update(['operational_status' => 'normal']);
            }

            NetworkStatusLog::create([
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'from_status' => $fromStatus,
                'to_status' => 'normal',
                'reason' => $resolutionNotes ?? 'Infrastruktur jaringan normal kembali',
                'source' => 'manual',
                'user_id' => $actor?->id,
            ]);

            // Selesaikan incident terbuka untuk node ini
            $incidents = Incident::where('node_type', $nodeType)
                ->where('node_id', $nodeId)
                ->where('status', 'open')
                ->get();

            $resolvedCount = 0;
            foreach ($incidents as $incident) {
                $incident->update([
                    'status' => 'resolved',
                    'resolved_at' => now(),
                ]);

                // Tandai semua pelanggan terdampak menjadi restored
                IncidentCustomer::where('incident_id', $incident->id)
                    ->where('state', 'affected')
                    ->update([
                        'state' => 'restored',
                        'restored_at' => now(),
                    ]);

                if ($complaint = $incident->complaint) {
                    $complaint->update([
                        'status' => ComplaintStatus::RESOLVED,
                        'resolved_at' => now(),
                        'status_reason' => $resolutionNotes ?? 'Infrastruktur jaringan normal kembali',
                    ]);

                    DB::table('ticket_events')->insert([
                        'eventable_type' => Complaint::class,
                        'eventable_id' => $complaint->id,
                        'actor_id' => $actor?->id,
                        'event' => 'mass_outage_resolved',
                        'from_status' => 'in_progress',
                        'to_status' => 'resolved',
                        'payload' => json_encode([
                            'incident_id' => $incident->id,
                            'incident_code' => $incident->code,
                            'node_type' => $nodeType,
                            'node_id' => $nodeId,
                            'notes' => $resolutionNotes,
                        ]),
                        'occurred_at' => now(),
                    ]);
                    $resolvedCount++;
                }
            }

            // Tangani juga keluhan terbuka lama berbasis affected_element
            $legacyComplaints = Complaint::where('affected_element_type', $nodeType)
                ->where('affected_element_id', $nodeId)
                ->where('is_mass_outage', true)
                ->whereIn('status', [ComplaintStatus::OPEN, ComplaintStatus::ASSIGNED, ComplaintStatus::IN_PROGRESS])
                ->get();

            foreach ($legacyComplaints as $leg) {
                $leg->update([
                    'status' => ComplaintStatus::RESOLVED,
                    'resolved_at' => now(),
                    'status_reason' => $resolutionNotes ?? 'Infrastruktur jaringan normal kembali',
                ]);
                $resolvedCount++;
            }

            return [
                'element' => $node,
                'resolved_incidents_count' => $incidents->count(),
                'resolved_complaints_count' => $resolvedCount,
            ];
        });
    }

    /**
     * Pisahkan pelanggan terdampak ke tiket mandiri baru (action "Pisahkan ke tiket sendiri").
     */
    public function splitCustomer(
        int $incidentId,
        int $customerId,
        ?string $reason = null,
        ?User $actor = null
    ): array {
        return DB::transaction(function () use ($incidentId, $customerId, $reason, $actor) {
            $incident = Incident::findOrFail($incidentId);
            $customer = Customer::findOrFail($customerId);

            $link = IncidentCustomer::where('incident_id', $incidentId)
                ->where('customer_id', $customerId)
                ->firstOrFail();

            // Buat tiket individual baru
            $ticketNumber = IdentifierGenerator::generate('CMP');
            $complaint = Complaint::create([
                'ticket_number' => $ticketNumber,
                'is_mass' => false,
                'is_mass_outage' => false,
                'customer_id' => $customer->id,
                'customer_code' => $customer->customer_code,
                'customer_name' => $customer->name,
                'customer_phone' => $customer->phone ?? '-',
                'customer_address' => $customer->address ?? '-',
                'customer_lat' => $customer->latitude,
                'customer_lng' => $customer->longitude,
                'area' => $customer->wilayah ?? 'Wilayah Jaringan',
                'category' => ComplaintCategory::NO_SIGNAL,
                'subject' => "Pengaduan Lanjutan: {$customer->name} (dari {$incident->code})",
                'description' => $reason ?? "Gangguan berlanjut setelah insiden {$incident->code} ditangani",
                'priority' => ComplaintPriority::HIGH,
                'status' => ComplaintStatus::OPEN,
                'created_by_id' => $actor?->id,
            ]);

            // Update status link ke split
            $link->update([
                'state' => 'split',
                'split_complaint_id' => $complaint->id,
            ]);

            // Dispatch tiket individual baru
            $this->dispatchService->assign($complaint, 'complaint', [
                'reason' => "Pemisahan dari gangguan massal {$incident->code}",
                'actor_id' => $actor?->id,
            ]);

            DB::table('ticket_events')->insert([
                'eventable_type' => Complaint::class,
                'eventable_id' => $complaint->id,
                'actor_id' => $actor?->id,
                'event' => 'split_from_mass_outage',
                'from_status' => null,
                'to_status' => 'open',
                'payload' => json_encode([
                    'incident_id' => $incident->id,
                    'incident_code' => $incident->code,
                    'customer_id' => $customer->id,
                    'reason' => $reason,
                ]),
                'occurred_at' => now(),
            ]);

            return [
                'success' => true,
                'complaint' => $complaint->fresh(['assignedTeam']),
                'link' => $link->fresh(),
            ];
        });
    }

    /**
     * Cari insiden terbuka pada simpul leluhur (ancestor).
     */
    protected function findAncestorOpenIncident(string $nodeType, int $nodeId): ?Incident
    {
        switch ($nodeType) {
            case 'odp':
                $odp = Odp::find($nodeId);
                if ($odp && $odp->odc_id) {
                    $odcInc = Incident::where('node_type', 'odc')
                        ->where('node_id', $odp->odc_id)
                        ->where('status', 'open')
                        ->first();
                    if ($odcInc) {
                        return $odcInc;
                    }

                    $odc = Odc::find($odp->odc_id);
                    if ($odc && $odc->olt_id) {
                        return Incident::where('node_type', 'olt')
                            ->where('node_id', $odc->olt_id)
                            ->where('status', 'open')
                            ->first();
                    }
                }
                break;

            case 'odc':
                $odc = Odc::find($nodeId);
                if ($odc && $odc->olt_id) {
                    return Incident::where('node_type', 'olt')
                        ->where('node_id', $odc->olt_id)
                        ->where('status', 'open')
                        ->first();
                }
                break;

            case 'cable':
                $cable = NetworkCable::find($nodeId) ?? CableTrack::find($nodeId);
                if ($cable && $cable->from_type && $cable->from_id) {
                    return Incident::where('node_type', $cable->from_type)
                        ->where('node_id', $cable->from_id)
                        ->where('status', 'open')
                        ->first();
                }
                break;
        }

        return null;
    }

    /**
     * Cari insiden terbuka pada simpul turunan (descendants).
     */
    protected function findDescendantOpenIncidents(string $nodeType, int $nodeId)
    {
        switch ($nodeType) {
            case 'olt':
                $odcIds = Odc::where('olt_id', $nodeId)->pluck('id');
                $odpIds = Odp::whereIn('odc_id', $odcIds)->pluck('id');

                return Incident::where('status', 'open')
                    ->where(function ($q) use ($odcIds, $odpIds) {
                        $q->where(function ($sq) use ($odcIds) {
                            $sq->where('node_type', 'odc')->whereIn('node_id', $odcIds);
                        })->orWhere(function ($sq) use ($odpIds) {
                            $sq->where('node_type', 'odp')->whereIn('node_id', $odpIds);
                        });
                    })
                    ->get();

            case 'odc':
                $odpIds = Odp::where('odc_id', $nodeId)->pluck('id');

                return Incident::where('node_type', 'odp')
                    ->whereIn('node_id', $odpIds)
                    ->where('status', 'open')
                    ->get();

            default:
                return collect([]);
        }
    }

    /**
     * Tautkan kumpulan pelanggan ke suatu insiden (tanpa duplikat).
     */
    protected function attachCustomersToIncident(Incident $incident, $customers): void
    {
        if ($customers->isEmpty()) {
            return;
        }

        $now = now();
        $records = [];
        foreach ($customers as $c) {
            $records[] = [
                'incident_id' => $incident->id,
                'customer_id' => $c->id,
                'state' => 'affected',
                'first_seen_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('incident_customers')->insertOrIgnore($records);
    }
}
