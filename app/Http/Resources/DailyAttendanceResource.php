<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyAttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $user = $this->relationLoaded('user') ? $this->user : $this->user()->first();

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'team' => $user->currentTeam?->name ?? $user->team,
            ] : null,
            'work_date' => $this->work_date instanceof Carbon ? $this->work_date->toDateString() : (string) $this->work_date,
            'track' => $this->track ?? 'office', // office, field
            'status' => $this->status ?? 'alpa', // hadir, field_checkin, izin, sakit, alpa
            'check_in_at' => $formatDate($this->check_in_at),
            'check_in_lat' => $this->check_in_lat !== null ? (float) $this->check_in_lat : null,
            'check_in_lng' => $this->check_in_lng !== null ? (float) $this->check_in_lng : null,
            'check_in_accuracy' => $this->check_in_accuracy !== null ? (float) $this->check_in_accuracy : null,
            'check_in_media_id' => $this->check_in_media_id,
            'check_in_photo_url' => $this->checkInMedia ? $this->checkInMedia->getUrl() : null,
            'check_out_at' => $formatDate($this->check_out_at),
            'check_out_lat' => $this->check_out_lat !== null ? (float) $this->check_out_lat : null,
            'check_out_lng' => $this->check_out_lng !== null ? (float) $this->check_out_lng : null,
            'check_out_accuracy' => $this->check_out_accuracy !== null ? (float) $this->check_out_accuracy : null,
            'check_out_media_id' => $this->check_out_media_id,
            'check_out_photo_url' => $this->checkOutMedia ? $this->checkOutMedia->getUrl() : null,
            'device_id' => $this->device_id,
            'device' => $this->device ? [
                'id' => $this->device->id,
                'device_name' => $this->device->device_name,
                'status' => $this->device->status,
            ] : null,
            'client_ip' => $this->client_ip,
            'is_manual' => (bool) $this->is_manual,
            'is_suspicious' => (bool) $this->is_suspicious,
            'suspicious_reason' => $this->suspicious_reason,
            'review_status' => $this->review_status,
            'reviewed_by' => $this->reviewedBy ? [
                'id' => $this->reviewedBy->id,
                'name' => $this->reviewedBy->name,
            ] : null,
            'reviewed_at' => $formatDate($this->reviewed_at),
            'review_notes' => $this->review_notes,
            'set_by' => $this->setBy ? [
                'id' => $this->setBy->id,
                'name' => $this->setBy->name,
            ] : null,
            'office_id' => $this->office_id,
            'office' => $this->office ? [
                'id' => $this->office->id,
                'name' => $this->office->name,
            ] : null,
            'office_distance_meters' => $this->office_distance_meters !== null ? (float) $this->office_distance_meters : null,
            'late_minutes' => (int) ($this->late_minutes ?? 0),
            'note' => $this->note,
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
