<?php

namespace App\Modules\Network\Services;

use App\Models\CableTrack;
use App\Models\NetworkCable;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use App\Models\User;
use Illuminate\Support\Collection;

class MassOutageService
{
    public function __construct(
        protected AffectedCustomersResolver $resolver,
        protected IncidentService $incidentService
    ) {}

    /**
     * Dapatkan model elemen jaringan berdasarkan tipe dan ID.
     */
    public function getElement(string $elementType, int $elementId)
    {
        return match (strtolower($elementType)) {
            'olt' => Olt::findOrFail($elementId),
            'odc' => Odc::findOrFail($elementId),
            'odp' => Odp::findOrFail($elementId),
            'cable', 'network_cable', 'cable_track' => NetworkCable::find($elementId) ?? CableTrack::findOrFail($elementId),
            default => throw new \InvalidArgumentException("Tipe elemen jaringan tidak valid: {$elementType}"),
        };
    }

    /**
     * Tampilkan seluruh pelanggan terdampak dari OLT/ODC/ODP/Kabel terkait.
     */
    public function getAffectedCustomers(string $elementType, int $elementId): Collection
    {
        $resolved = $this->resolver->resolve($elementType, $elementId);

        return $resolved['customers'];
    }

    /**
     * Dapatkan metadata rincian pelanggan terdampak (per ODP, terisolir, dll).
     */
    public function getAffectedDetails(string $elementType, int $elementId): array
    {
        return $this->resolver->resolve($elementType, $elementId);
    }

    /**
     * Picu gangguan massal bila status ODC/ODP/kabel menjadi disrupted atau cut.
     * Membuat SATU tiket (Complaint) untuk banyak pelanggan terdampak,
     * dan menautkan seluruh pelanggan ke tiket tersebut lewat IncidentService.
     */
    public function triggerMassOutage(
        string $elementType,
        int $elementId,
        string $status,
        ?string $notes = null,
        ?User $actor = null,
        bool $dryRun = false
    ): array {
        return $this->incidentService->openFromStatusChange(
            nodeType: $elementType,
            nodeId: $elementId,
            status: $status,
            reason: $notes,
            actor: $actor,
            dryRun: $dryRun
        );
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
        return $this->incidentService->resolveMassOutage(
            nodeType: $elementType,
            nodeId: $elementId,
            resolutionNotes: $resolutionNotes,
            actor: $actor
        );
    }

    /**
     * Pisahkan pelanggan dari tiket massal ke tiket mandiri.
     */
    public function splitCustomer(
        int $incidentId,
        int $customerId,
        ?string $reason = null,
        ?User $actor = null
    ): array {
        return $this->incidentService->splitCustomer(
            incidentId: $incidentId,
            customerId: $customerId,
            reason: $reason,
            actor: $actor
        );
    }
}
