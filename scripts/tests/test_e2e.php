<?php

use GuzzleHttp\Client;

require __DIR__.'/vendor/autoload.php';
$client = new Client(['base_uri' => 'http://localhost:8000/api/', 'http_errors' => false]);
$baseUrl = '';

echo "Running E2E API Test...\n\n";

function post($client, $url, $data = [], $token = null)
{
    $options = ['json' => $data];
    if ($token) {
        $options['headers'] = ['Authorization' => "Bearer $token", 'Accept' => 'application/json'];
    } else {
        $options['headers'] = ['Accept' => 'application/json'];
    }
    $response = $client->post($url, $options);

    return json_decode($response->getBody(), true);
}
function put($client, $url, $data = [], $token = null)
{
    $options = ['json' => $data];
    if ($token) {
        $options['headers'] = ['Authorization' => "Bearer $token", 'Accept' => 'application/json'];
    } else {
        $options['headers'] = ['Accept' => 'application/json'];
    }
    $response = $client->put($url, $options);

    return json_decode($response->getBody(), true);
}
function get($client, $url, $token = null)
{
    $options = [];
    if ($token) {
        $options['headers'] = ['Authorization' => "Bearer $token", 'Accept' => 'application/json'];
    } else {
        $options['headers'] = ['Accept' => 'application/json'];
    }
    $response = $client->get($url, $options);

    return ['status' => $response->getStatusCode(), 'body' => json_decode($response->getBody(), true)];
}
function upload($client, $url, $filePath, $fieldName, $data, $token)
{
    $multipart = [];
    foreach ($data as $k => $v) {
        $multipart[] = ['name' => $k, 'contents' => $v];
    }
    $multipart[] = [
        'name' => $fieldName,
        'contents' => fopen($filePath, 'r'),
        'filename' => basename($filePath),
    ];
    $response = $client->post($url, [
        'headers' => ['Authorization' => "Bearer $token", 'Accept' => 'application/json'],
        'multipart' => $multipart,
    ]);

    return json_decode($response->getBody(), true);
}

// 1. Login
echo "1. Testing Login (Admin)...\n";
$response = post($client, 'login', [
    'email' => 'admin@example.com',
    'password' => 'password',
]);
$adminToken = $response['data']['access_token'] ?? null;
echo "Login Response:\n".json_encode($response, JSON_PRETTY_PRINT)."\n\n";

if (! $adminToken) {
    echo "Failed to get admin token. Exiting.\n";
    exit(1);
}

// 2. Create Submission (as Sales - we'll just login as sales)
echo "2. Testing Login (Sales)...\n";
$salesResponse = post($client, 'login', [
    'email' => 'sales@example.com',
    'password' => 'password',
]);
$salesToken = $salesResponse['data']['access_token'] ?? null;
echo "Sales Login Response:\n".json_encode($salesResponse, JSON_PRETTY_PRINT)."\n\n";

echo "3. Create Submission with coordinates...\n";
$submissionResponse = post($client, 'sales/submissions', [
    'customer_name' => 'John Doe Refactor',
    'nik' => '1234567890123456',
    'phone' => '081234567890',
    'email' => 'john.refactor@example.com',
    'address' => 'Jl. Kebon Jeruk No 1',
    'district' => 'Kebon Jeruk',
    'city' => 'Jakarta Barat',
    'province' => 'DKI Jakarta',
    'lat' => -7.714529,
    'lng' => 110.008408,
    'package_name' => 'Fiber 50Mbps',
    'package_speed' => 50,
    'package_price' => 300000,
    'installation_fee' => 150000,
], $salesToken);
echo "Create Submission Response:\n".json_encode($submissionResponse, JSON_PRETTY_PRINT)."\n\n";
$submissionId = $submissionResponse['data']['id'] ?? null;

// Verify coordinates and maps_url in response
if (
    ! isset($submissionResponse['data']['lat']) || floatval($submissionResponse['data']['lat']) !== -7.714529 ||
    ! isset($submissionResponse['data']['lng']) || floatval($submissionResponse['data']['lng']) !== 110.008408 ||
    ! isset($submissionResponse['data']['location']['lat']) || floatval($submissionResponse['data']['location']['lat']) !== -7.714529 ||
    ! isset($submissionResponse['data']['maps_url']) || strpos($submissionResponse['data']['maps_url'], '-7.714529,110.008408') === false
) {
    echo "ERROR: Coordinates or maps_url are missing or incorrect in creation response!\n";
    exit(1);
}
echo "SUCCESS: Coordinates and maps_url are present in response.\n\n";

// 3b. Verify getting submission detail as Sales
echo "3b. Testing Get Sales Submission Detail...\n";
$salesDetail = get($client, "sales/submissions/$submissionId", $salesToken);
echo "Sales Detail Response:\n".json_encode($salesDetail, JSON_PRETTY_PRINT)."\n\n";

// 3c. Verify getting submission detail as Admin
echo "3c. Testing Get Admin Submission Detail...\n";
$adminDetail = get($client, "admin/submissions/$submissionId", $adminToken);
echo "Admin Detail Response:\n".json_encode($adminDetail, JSON_PRETTY_PRINT)."\n\n";

// 3d. Validate coordinate constraint validation
echo "3d. Testing coordinate validation constraints...\n";

// 1. Without lat/lng should succeed
echo " - Submitting without coordinates...\n";
$subNoCoords = post($client, 'sales/submissions', [
    'customer_name' => 'No Coords',
    'nik' => '1234567890123457',
    'phone' => '081234567891',
    'email' => 'nocoords@example.com',
    'address' => 'Jl. Kebon Jeruk No 2',
    'district' => 'Kebon Jeruk',
    'city' => 'Jakarta Barat',
    'province' => 'DKI Jakarta',
    'package_name' => 'Fiber 50Mbps',
    'package_speed' => 50,
    'package_price' => 300000,
    'installation_fee' => 150000,
], $salesToken);
if (! ($subNoCoords['success'] ?? false)) {
    echo "ERROR: Submission without coordinates failed!\n";
    exit(1);
}
echo "   Pass.\n";

// 2. lat > 90 should fail (422)
echo " - Submitting with lat = 95 (invalid)...\n";
$subLatInvalid = post($client, 'sales/submissions', [
    'customer_name' => 'Invalid Lat',
    'nik' => '1234567890123456',
    'phone' => '081234567890',
    'address' => 'Jl. Kebon Jeruk No 1',
    'district' => 'Kebon Jeruk',
    'city' => 'Jakarta Barat',
    'province' => 'DKI Jakarta',
    'lat' => 95,
    'lng' => 110,
    'package_name' => 'Fiber 50Mbps',
    'package_speed' => 50,
    'package_price' => 300000,
    'installation_fee' => 150000,
], $salesToken);
if (($subLatInvalid['success'] ?? false) || ! isset($subLatInvalid['errors']['lat'])) {
    echo "ERROR: Invalid lat was not rejected!\n";
    exit(1);
}
echo "   Pass.\n";

// 3. lng > 180 should fail (422)
echo " - Submitting with lng = 185 (invalid)...\n";
$subLngInvalid = post($client, 'sales/submissions', [
    'customer_name' => 'Invalid Lng',
    'nik' => '1234567890123456',
    'phone' => '081234567890',
    'address' => 'Jl. Kebon Jeruk No 1',
    'district' => 'Kebon Jeruk',
    'city' => 'Jakarta Barat',
    'province' => 'DKI Jakarta',
    'lat' => -7.714529,
    'lng' => 185,
    'package_name' => 'Fiber 50Mbps',
    'package_speed' => 50,
    'package_price' => 300000,
    'installation_fee' => 150000,
], $salesToken);
if (($subLngInvalid['success'] ?? false) || ! isset($subLngInvalid['errors']['lng'])) {
    echo "ERROR: Invalid lng was not rejected!\n";
    exit(1);
}
echo "   Pass.\n";

// 4. lat without lng should fail (422) with custom message
echo " - Submitting with lat without lng...\n";
$subLatWithoutLng = post($client, 'sales/submissions', [
    'customer_name' => 'Lat without Lng',
    'nik' => '1234567890123456',
    'phone' => '081234567890',
    'address' => 'Jl. Kebon Jeruk No 1',
    'district' => 'Kebon Jeruk',
    'city' => 'Jakarta Barat',
    'province' => 'DKI Jakarta',
    'lat' => -7.714529,
    'package_name' => 'Fiber 50Mbps',
    'package_speed' => 50,
    'package_price' => 300000,
    'installation_fee' => 150000,
], $salesToken);
if (($subLatWithoutLng['success'] ?? false) || ! isset($subLatWithoutLng['errors']['lng'])) {
    echo "ERROR: lat without lng was not rejected!\n";
    exit(1);
}
if (($subLatWithoutLng['errors']['lng'][0] ?? '') !== 'Latitude and longitude must be provided together.') {
    echo 'ERROR: Custom validation message for missing lat/lng is incorrect: '.json_encode($subLatWithoutLng['errors'])."\n";
    exit(1);
}
echo "   Pass.\n";

// 5. lng without lat should fail (422) with custom message
echo " - Submitting with lng without lat...\n";
$subLngWithoutLat = post($client, 'sales/submissions', [
    'customer_name' => 'Lng without Lat',
    'nik' => '1234567890123456',
    'phone' => '081234567890',
    'address' => 'Jl. Kebon Jeruk No 1',
    'district' => 'Kebon Jeruk',
    'city' => 'Jakarta Barat',
    'province' => 'DKI Jakarta',
    'lng' => 110.008408,
    'package_name' => 'Fiber 50Mbps',
    'package_speed' => 50,
    'package_price' => 300000,
    'installation_fee' => 150000,
], $salesToken);
if (($subLngWithoutLat['success'] ?? false) || ! isset($subLngWithoutLat['errors']['lat'])) {
    echo "ERROR: lng without lat was not rejected!\n";
    exit(1);
}
if (($subLngWithoutLat['errors']['lat'][0] ?? '') !== 'Latitude and longitude must be provided together.') {
    echo 'ERROR: Custom validation message for missing lat/lng is incorrect: '.json_encode($subLngWithoutLat['errors'])."\n";
    exit(1);
}
echo "   Pass.\n";

// 4. Validation Error Example (generic check for response format verification)
echo "4. Testing Generic Validation Error (422)...\n";
$validationErrorResponse = post($client, 'sales/submissions', [
    'customer_name' => '', // Empty name to trigger error
], $salesToken);
echo "Validation Error Response:\n".json_encode($validationErrorResponse, JSON_PRETTY_PRINT)."\n\n";
if (($validationErrorResponse['message'] ?? '') !== 'Validation failed') {
    echo "ERROR: Response validation message is not standardized to 'Validation failed'!\n";
    exit(1);
}

// 5. Upload Documents (KTP & House photo)
echo "5. Testing Upload Documents (KTP & House/Location photo)...\n";
echo " - Uploading KTP...\n";
$uploadKtp = upload($client, "sales/submissions/$submissionId/upload-document", __DIR__.'/test-files/ktp.jpg', 'file', [
    'document_type' => 'ktp',
], $salesToken);
echo "Upload KTP Response:\n".json_encode($uploadKtp, JSON_PRETTY_PRINT)."\n\n";

echo " - Uploading House Photo...\n";
$uploadRumah = upload($client, "sales/submissions/$submissionId/upload-document", __DIR__.'/test-files/modem.jpg', 'file', [
    'document_type' => 'rumah',
], $salesToken);
echo "Upload House Photo Response:\n".json_encode($uploadRumah, JSON_PRETTY_PRINT)."\n\n";

echo " - Uploading Invalid Document Type...\n";
$uploadInvalidType = upload($client, "sales/submissions/$submissionId/upload-document", __DIR__.'/test-files/ktp.jpg', 'file', [
    'document_type' => 'pasfoto',
], $salesToken);
echo "Upload Invalid Type Response:\n".json_encode($uploadInvalidType, JSON_PRETTY_PRINT)."\n\n";
if (($uploadInvalidType['success'] ?? true) === true || ($uploadInvalidType['message'] ?? '') !== 'Validation failed') {
    echo "ERROR: Upload invalid type did not fail with Validation failed!\n";
    exit(1);
}
echo "   Pass.\n";

// Get sales submission details to verify the documents array
echo " - Verifying documents in submission details...\n";
$subDetails = get($client, "sales/submissions/$submissionId", $salesToken);
$documents = $subDetails['body']['data']['documents'] ?? [];
echo "Submission Documents:\n".json_encode($documents, JSON_PRETTY_PRINT)."\n\n";

if (! is_array($documents) || count($documents) < 2) {
    echo "ERROR: Expected at least 2 documents in the array!\n";
    exit(1);
}

$ktpDoc = null;
$rumahDoc = null;
foreach ($documents as $doc) {
    if (($doc['document_type'] ?? '') === 'ktp') {
        $ktpDoc = $doc;
    }
    if (($doc['document_type'] ?? '') === 'rumah') {
        $rumahDoc = $doc;
    }
}

if (! $ktpDoc || ! isset($ktpDoc['original_name']) || ! isset($ktpDoc['path']) || ! isset($ktpDoc['url']) || ! isset($ktpDoc['uploaded_at'])) {
    echo "ERROR: KTP document metadata is missing or incomplete!\n";
    exit(1);
}

if (! $rumahDoc || ! isset($rumahDoc['original_name']) || ! isset($rumahDoc['path']) || ! isset($rumahDoc['url']) || ! isset($rumahDoc['uploaded_at'])) {
    echo "ERROR: House document metadata is missing or incomplete!\n";
    exit(1);
}

echo "SUCCESS: Documents metadata is verified successfully.\n\n";

// 6. Approve Submission
echo "6. Testing Approve Submission (Admin)...\n";
$approveResponse = put($client, "admin/submissions/$submissionId/validate", [
    'status' => 'approved',
    'validation_notes' => 'Looking good',
], $adminToken);
echo "Approve Submission Response:\n".json_encode($approveResponse, JSON_PRETTY_PRINT)."\n\n";

// 7. Trigger Provisioning
echo "7. Testing Trigger Provisioning...\n";
$provisioningResponse = post($client, 'admin/provisionings', [
    'submission_id' => $submissionId,
    'service_type' => 'FTTH',
    'nas_server' => 'Mikrotik-Core',
    'nas_ip' => '10.0.0.1',
    'bandwidth_profile' => '50M-Profile',
    'bandwidth_up' => 50,
    'bandwidth_down' => 50,
], $adminToken);
echo "Trigger Provisioning Response:\n".json_encode($provisioningResponse, JSON_PRETTY_PRINT)."\n\n";
$provisioningId = $provisioningResponse['data']['id'] ?? null;

// Verify coordinates and maps_url in provisioning response
if (
    ! isset($provisioningResponse['data']['submission']['location']['lat']) ||
    floatval($provisioningResponse['data']['submission']['location']['lat']) !== -7.714529
) {
    echo "ERROR: Coordinates/location object is missing or incorrect in provisioning response!\n";
    exit(1);
}
echo "SUCCESS: Location coordinates are present in provisioning detail.\n\n";

// 8. Assign Task
echo "8. Testing Assign Task...\n";
// Let's find a teknisi user first
$teknisiResponse = post($client, 'login', [
    'email' => 'teknisi@example.com',
    'password' => 'password',
]);
$teknisiToken = $teknisiResponse['data']['access_token'] ?? null;
$teknisiId = $teknisiResponse['data']['user']['id'] ?? null;

// Update BFASS Status directly to success so assignment passes
echo "Update BFASS Status directly to success...\n";
shell_exec('php artisan tinker --execute="App\Models\Provisioning::find('.$provisioningId.')->update([\'bfass_status\' => \'success\', \'status\' => \'success\']);"');

$assignTaskResponse = post($client, "admin/provisionings/$provisioningId/assign-task", [
    'teknisi_id' => $teknisiId,
    'scheduled_date' => date('Y-m-d', strtotime('+1 day')),
    'scheduled_start' => '10:00',
    'scheduled_end' => '12:00',
], $adminToken);
echo "Assign Task Response:\n".json_encode($assignTaskResponse, JSON_PRETTY_PRINT)."\n\n";
$taskId = $assignTaskResponse['data']['id'] ?? null;

// 8b. Get Task Detail
echo "8b. Testing Get Task Detail (Teknisi)...\n";
$taskDetailResponse = get($client, "teknisi/tasks/$taskId", $teknisiToken);
echo "Task Detail Response:\n".json_encode($taskDetailResponse, JSON_PRETTY_PRINT)."\n\n";

if (
    ! isset($taskDetailResponse['body']['data']['customer']['lat']) ||
    floatval($taskDetailResponse['body']['data']['customer']['lat']) !== -7.714529 ||
    ! isset($taskDetailResponse['body']['data']['customer']['maps_url']) ||
    strpos($taskDetailResponse['body']['data']['customer']['maps_url'], '-7.714529,110.008408') === false
) {
    echo "ERROR: Customer location coordinates or maps_url are missing or incorrect in task detail response!\n";
    exit(1);
}
echo "SUCCESS: Customer location and maps_url are present in task detail.\n\n";

// 9. Update Task Status
echo "9. Testing Update Task Status (Teknisi)...\n";
$taskStatusResponse = put($client, "teknisi/tasks/$taskId/status", [
    'status' => 'completed',
    'completion_notes' => 'All done nicely',
    'result' => 'success',
], $teknisiToken);
echo "Update Task Status Response:\n".json_encode($taskStatusResponse, JSON_PRETTY_PRINT)."\n\n";

// 10. Upload Photo
echo "10. Testing Upload Task Photo...\n";
$photoUploadResponse = upload($client, "teknisi/tasks/$taskId/upload-photo", __DIR__.'/test-files/modem.jpg', 'photo', [
    'photo_type' => 'modem',
], $teknisiToken);
echo "Upload Task Photo Response:\n".json_encode($photoUploadResponse, JSON_PRETTY_PRINT)."\n\n";

// 11. Unauthorized Example (403)
echo "11. Testing Forbidden 403...\n";
$forbiddenResponse = post($client, 'admin/provisionings', [], $teknisiToken);
echo "Forbidden 403 Response:\n".json_encode($forbiddenResponse, JSON_PRETTY_PRINT)."\n\n";

// 12. Not Found Example (404)
echo "12. Testing Not Found 404...\n";
$notFoundResponse = get($client, 'admin/submissions/999999', $adminToken);
echo "Not Found 404 Response:\n".json_encode($notFoundResponse, JSON_PRETTY_PRINT)."\n\n";

// 13. Reports
echo "13. Testing Export Reports...\n";
$excelResponse = get($client, 'admin/reports/submissions/excel', $adminToken);
echo 'Export Excel Response Status: '.$excelResponse['status']."\n";
$pdfResponse = get($client, "admin/reports/submissions/$submissionId/pdf", $adminToken);
echo 'Export PDF Response Status: '.$pdfResponse['status']."\n";

echo "\nTests Completed!\n";
