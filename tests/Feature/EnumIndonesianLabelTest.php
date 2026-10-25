<?php

namespace Tests\Feature;

use App\Enums\BfassStatus;
use App\Enums\ComplaintCategory;
use App\Enums\ComplaintPriority;
use App\Enums\ComplaintStatus;
use App\Enums\DocumentType;
use App\Enums\ProvisioningStatus;
use App\Enums\ResolutionCategory;
use App\Enums\SubmissionStatus;
use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use Tests\TestCase;

class EnumIndonesianLabelTest extends TestCase
{
    public function test_all_backend_enums_have_indonesian_labels(): void
    {
        $enums = [
            BfassStatus::class,
            ComplaintCategory::class,
            ComplaintPriority::class,
            ComplaintStatus::class,
            DocumentType::class,
            ProvisioningStatus::class,
            ResolutionCategory::class,
            SubmissionStatus::class,
            TaskAssignmentStatus::class,
            TaskStatus::class,
        ];

        foreach ($enums as $enumClass) {
            $cases = $enumClass::cases();
            $this->assertNotEmpty($cases, "Enum {$enumClass} should have cases");

            foreach ($cases as $case) {
                $this->assertTrue(method_exists($case, 'label'), "Enum case {$enumClass}::{$case->name} must have label() method");
                $label = $case->label();
                $this->assertIsString($label);
                $this->assertNotEmpty($label, "Enum {$enumClass}::{$case->name} label must not be empty");
            }

            $options = $enumClass::options();
            $this->assertCount(count($cases), $options);
            foreach ($options as $opt) {
                $this->assertArrayHasKey('value', $opt);
                $this->assertArrayHasKey('label', $opt);
                $this->assertNotEmpty($opt['label']);
            }
        }
    }

    public function test_api_enums_endpoint_returns_all_labels(): void
    {
        $response = $this->getJson('/api/enums');
        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'complaint_status',
                'task_status',
                'complaint_priority',
                'complaint_category',
                'provisioning_status',
                'submission_status',
                'resolution_category',
                'task_assignment_status',
                'bfass_status',
                'document_type',
                'customer_status',
                'network_status',
                'review_status',
                'geofence_status',
                'attendance_status',
            ],
        ]);
    }
}

