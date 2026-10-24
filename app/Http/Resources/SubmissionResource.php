<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class SubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        return [
            'id' => $this->id,
            'submission_number' => $this->submission_number,
            'customer_name' => $this->customer_name,
            'nik' => $this->maskNik($this->nik),
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'district' => $this->district,
            'city' => $this->city,
            'province' => $this->province,
            'village' => $this->village,
            'postal_code' => $this->postal_code,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'location' => [
                'address' => $this->address,
                'village' => $this->village,
                'district' => $this->district,
                'city' => $this->city,
                'province' => $this->province,
                'postal_code' => $this->postal_code,
                'lat' => $this->lat,
                'lng' => $this->lng,
            ],
            'maps_url' => ($this->lat !== null && $this->lng !== null)
                ? "https://www.google.com/maps?q={$this->lat},{$this->lng}"
                : null,
            'package_name' => $this->package_name,
            'package_speed' => $this->package_speed,
            'package_price' => $this->package_price,
            'installation_fee' => $this->installation_fee,
            'total_price' => $this->total_price,
            'status' => $this->status?->value ?? $this->status,
            'validation_notes' => $this->validation_notes,
            'documents' => $this->whenLoaded('submissionDocuments', function () use ($formatDate) {
                return $this->submissionDocuments->map(function ($doc) use ($formatDate) {
                    return [
                        'id' => $doc->id,
                        'document_type' => $doc->document_type,
                        'original_name' => $doc->original_name,
                        'path' => $doc->path,
                        'url' => Storage::url($doc->path),
                        'status' => $doc->status,
                        'is_active' => $doc->is_active,
                        'review_notes' => $doc->relationLoaded('reviews') ? $doc->reviews->last()?->review_notes : null,
                        'uploaded_at' => $formatDate($doc->created_at),
                    ];
                });
            }),
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
            'user' => $this->whenLoaded('user'),
            'sales_id' => $this->sales_id,
            'sales' => $this->whenLoaded('sales'),
            'validator' => $this->whenLoaded('validator'),
            'provisioning' => new ProvisioningResource($this->whenLoaded('provisioning')),
            'customer_id' => $this->customer_id,
            'customer_code' => $this->customer_code,
            'nomor_pelanggan' => $this->customer_code,
            'rejection_reason' => $this->rejection_reason,
            'duplicate_warnings' => $this->duplicate_warnings ?? [],
            'service_chain' => $this->service_chain,
            'timeline' => $this->getTimelineArray(),
            'audit_logs' => $this->getTimelineArray(),
        ];
    }

    private function maskNik(?string $nik): ?string
    {
        if (empty($nik)) {
            return $nik;
        }

        if (strlen($nik) < 4) {
            return $nik;
        }

        return substr($nik, 0, 4).str_repeat('*', strlen($nik) - 8).substr($nik, -4);
    }
}
