$baseUrl = "http://127.0.0.1:8000/api"
$headers = @{
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

function Log-Response {
    param($title, $response)
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host $title -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 3 | Write-Host
    Write-Host ""
}

Write-Host "Starting Complete API Tests..." -ForegroundColor Green
Write-Host ""

# Copy a real image for testing uploads to bypass MIME validation
Copy-Item -Path ".\test-files\ktp.jpg" -Destination ".\dummy.jpg" -Force

# ---------------------------------------------------------
# AUTH MODULE (PUBLIC)
# ---------------------------------------------------------
try {
    # 1. Forgot Password
    $forgotData = @{ email = "sales@example.com" }
    $res = Invoke-RestMethod -Uri "$baseUrl/forgot-password" -Method Post -Headers $headers -Body ($forgotData | ConvertTo-Json)
    Log-Response "Forgot Password" $res

    # Wait 1 second for log to be written
    Start-Sleep -Seconds 1

    # 2. Reset Password (extract token from laravel.log)
    $logPath = "storage/logs/laravel.log"
    if (Test-Path $logPath) {
        $logContent = Get-Content -Path $logPath -Raw
        $matches = [regex]::Matches($logContent, 'reset-password\?token=([a-f0-9]+)')
        if ($matches.Count -gt 0) {
            $resetToken = $matches[$matches.Count - 1].Groups[1].Value
            $resetData = @{
                token = $resetToken
                email = "sales@example.com"
                password = "password"
                password_confirmation = "password"
            }
            $res = Invoke-RestMethod -Uri "$baseUrl/reset-password" -Method Post -Headers $headers -Body ($resetData | ConvertTo-Json)
            Log-Response "Reset Password" $res
        } else {
            Write-Host "Password Reset Token not found in log" -ForegroundColor Red
        }
    } else {
        Write-Host "laravel.log not found to extract reset token" -ForegroundColor Red
    }
} catch {
    Write-Host "Error in Auth Module: $($_.Exception.Message)" -ForegroundColor Red
}

# ---------------------------------------------------------
# SALES MODULE
# ---------------------------------------------------------
try {
    # Login Sales
    $loginData = @{ email = "sales@example.com"; password = "password" }
    $res = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Headers $headers -Body ($loginData | ConvertTo-Json)
    Log-Response "Login Sales" $res
    $salesHeaders = $headers.Clone()
    $salesHeaders.Add("Authorization", "Bearer $($res.data.access_token)")

    # 1. Create Submission without coordinates (should succeed)
    $subNoCoords = @{
        customer_name = "Jane Doe No Coords"; nik = "9876543210987653"; phone = "081999999997"
        email = "janedoe_nocoords@example.com"; address = "Jl. Thamrin"; district = "Menteng"
        city = "Jakarta Pusat"; province = "DKI Jakarta"; package_name = "Fiber 100Mbps"
        package_speed = 100; package_price = 450000; installation_fee = 150000
    }
    $resNoCoords = Invoke-RestMethod -Uri "$baseUrl/sales/submissions" -Method Post -Headers $salesHeaders -Body ($subNoCoords | ConvertTo-Json)
    Log-Response "Sales: Create Submission without coordinates" $resNoCoords

    # 2. Create Submission with invalid lat/lng (should fail with 422)
    try {
        $subInvalidCoords = @{
            customer_name = "Jane Doe Bad Coords"; nik = "9876543210987652"; phone = "081999999996"
            email = "janedoe_bad@example.com"; address = "Jl. Thamrin"; district = "Menteng"
            city = "Jakarta Pusat"; province = "DKI Jakarta"; package_name = "Fiber 100Mbps"
            package_speed = 100; package_price = 450000; installation_fee = 150000
            lat = 95.0; lng = 185.0
        }
        $resInvalidCoords = Invoke-RestMethod -Uri "$baseUrl/sales/submissions" -Method Post -Headers $salesHeaders -Body ($subInvalidCoords | ConvertTo-Json)
        Log-Response "Sales: Create Submission with invalid coordinates (Unexpected Success)" $resInvalidCoords
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errBody = $reader.ReadToEnd()
        Log-Response "Sales: Create Submission with invalid coordinates (Expected Failure)" ($errBody | ConvertFrom-Json)
    }

    # 3. Create Submission with lat but no lng (should fail with custom message)
    try {
        $subLatOnly = @{
            customer_name = "Jane Doe Lat Only"; nik = "9876543210987651"; phone = "081999999995"
            email = "janedoe_lat@example.com"; address = "Jl. Thamrin"; district = "Menteng"
            city = "Jakarta Pusat"; province = "DKI Jakarta"; package_name = "Fiber 100Mbps"
            package_speed = 100; package_price = 450000; installation_fee = 150000
            lat = -7.714529
        }
        $resLatOnly = Invoke-RestMethod -Uri "$baseUrl/sales/submissions" -Method Post -Headers $salesHeaders -Body ($subLatOnly | ConvertTo-Json)
        Log-Response "Sales: Create Submission with lat only (Unexpected Success)" $resLatOnly
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errBody = $reader.ReadToEnd()
        Log-Response "Sales: Create Submission with lat only (Expected Failure)" ($errBody | ConvertFrom-Json)
    }

    # 4. Create Submission with valid coordinates and verify maps_url & location
    $subData = @{
        customer_name = "Jane Doe"; nik = "9876543210987654"; phone = "081999999999"
        email = "janedoe@example.com"; address = "Jl. Thamrin"; district = "Menteng"
        city = "Jakarta Pusat"; province = "DKI Jakarta"; package_name = "Fiber 100Mbps"
        package_speed = 100; package_price = 450000; installation_fee = 150000
        lat = -7.714529; lng = 110.008408
    }
    $res = Invoke-RestMethod -Uri "$baseUrl/sales/submissions" -Method Post -Headers $salesHeaders -Body ($subData | ConvertTo-Json)
    Log-Response "Sales: Create Submission" $res
    $subId = $res.data.id

    # Verify coordinates and maps_url in response
    if ($null -ne $res.data.lat -and $res.data.lat -eq -7.714529 -and $null -ne $res.data.location -and $res.data.location.lat -eq -7.714529 -and $null -ne $res.data.maps_url) {
        Write-Host "Verification: Coordinates and maps_url in submission are verified successfully." -ForegroundColor Green
    } else {
        Write-Host "Verification Failed: Coordinates or maps_url are missing or incorrect in response!" -ForegroundColor Red
    }

    # List Submissions
    $res = Invoke-RestMethod -Uri "$baseUrl/sales/submissions" -Method Get -Headers $salesHeaders
    Log-Response "Sales: List Submissions" $res

    # Get Single Submission
    $res = Invoke-RestMethod -Uri "$baseUrl/sales/submissions/$subId" -Method Get -Headers $salesHeaders
    Log-Response "Sales: Get Submission $subId" $res

    # Update Submission
    $updateData = @{ phone = "081999999998" }
    $res = Invoke-RestMethod -Uri "$baseUrl/sales/submissions/$subId" -Method Put -Headers $salesHeaders -Body ($updateData | ConvertTo-Json)
    Log-Response "Sales: Update Submission" $res

    # Upload Document (Using curl.exe for maximum compatibility across PS versions)
    $tokenRaw = $salesHeaders['Authorization'].Replace('Bearer ', '')
    
    # Upload KTP
    Write-Host "Uploading KTP Document..."
    $resKtpRaw = curl.exe -s -H "Accept: application/json" -H "Authorization: Bearer $tokenRaw" -F "document_type=ktp" -F "file=@.\dummy.jpg" "$baseUrl/sales/submissions/$subId/upload-document"
    $resKtp = $resKtpRaw | ConvertFrom-Json
    Log-Response "Sales: Upload KTP Document" $resKtp

    # Upload House Photo
    Write-Host "Uploading House Document..."
    $resRumahRaw = curl.exe -s -H "Accept: application/json" -H "Authorization: Bearer $tokenRaw" -F "document_type=rumah" -F "file=@.\dummy.jpg" "$baseUrl/sales/submissions/$subId/upload-document"
    $resRumah = $resRumahRaw | ConvertFrom-Json
    Log-Response "Sales: Upload House Document" $resRumah

    # Upload Invalid Document Type (Expected Failure)
    Write-Host "Uploading Invalid Document Type..."
    $resInvalidRaw = curl.exe -s -H "Accept: application/json" -H "Authorization: Bearer $tokenRaw" -F "document_type=pasfoto" -F "file=@.\dummy.jpg" "$baseUrl/sales/submissions/$subId/upload-document"
    $resInvalid = $resInvalidRaw | ConvertFrom-Json
    Log-Response "Sales: Upload Invalid Document Type (Expected Failure)" $resInvalid
} catch {
    Write-Host "Error in Sales Module: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host ($reader.ReadToEnd()) -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------
# ADMIN MODULE
# ---------------------------------------------------------
try {
    # Login Admin
    $loginData = @{ email = "admin@example.com"; password = "password" }
    $res = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Headers $headers -Body ($loginData | ConvertTo-Json)
    Log-Response "Login Admin" $res
    $adminHeaders = $headers.Clone()
    $adminHeaders.Add("Authorization", "Bearer $($res.data.access_token)")

    # Fetch Teknisi ID dynamically by logging in
    $loginTeknisi = @{ email = "teknisi@example.com"; password = "password" }
    $resTeknisi = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Headers $headers -Body ($loginTeknisi | ConvertTo-Json)
    $teknisiId = $resTeknisi.data.user.id
    Write-Host "Fetched Teknisi ID: $teknisiId" -ForegroundColor Cyan

    # List Submissions
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/submissions" -Method Get -Headers $adminHeaders
    Log-Response "Admin: List Submissions" $res

    # Get Single Submission (Admin)
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/submissions/$subId" -Method Get -Headers $adminHeaders
    Log-Response "Admin: Get Submission $subId" $res

    # Validate Submission
    $valData = @{ status = "approved"; validation_notes = "Verified for 100Mbps" }
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/submissions/$subId/validate" -Method Put -Headers $adminHeaders -Body ($valData | ConvertTo-Json)
    Log-Response "Admin: Validate Submission" $res

    # List Provisionings
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/provisionings" -Method Get -Headers $adminHeaders
    Log-Response "Admin: List Provisionings" $res

    # Create Provisioning
    $provData = @{
        submission_id = $subId; service_type = "FTTH"; nas_server = "NAS-JKT-01"
        nas_ip = "192.168.10.1"; bandwidth_profile = "100M"; bandwidth_up = 100; bandwidth_down = 100
    }
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/provisionings" -Method Post -Headers $adminHeaders -Body ($provData | ConvertTo-Json)
    Log-Response "Admin: Create Provisioning" $res
    $provId = $res.data.id

    Write-Host "Running queue worker to process BFASS provisioning..." -ForegroundColor Cyan
    php artisan queue:work --once

    # Retry Provisioning (if applicable)
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/admin/provisionings/$provId/retry" -Method Post -Headers $adminHeaders
        Log-Response "Admin: Retry Provisioning" $res
    } catch {
        Write-Host "Retry might fail if status is not 'failed', this is expected." -ForegroundColor Yellow
        Write-Host ""
    }

    # Assign Task
    $taskData = @{ teknisi_id = $teknisiId; scheduled_date = (Get-Date).ToString("yyyy-MM-dd"); scheduled_start = "09:00"; scheduled_end = "12:00" }
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/provisionings/$provId/assign-task" -Method Post -Headers $adminHeaders -Body ($taskData | ConvertTo-Json)
    Log-Response "Admin: Assign Task" $res
    $taskId = $res.data.id

    # Reassign Task
    $reassignData = @{ teknisi_id = $teknisiId } # just reassign to the same for testing
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/tasks/$taskId/reassign" -Method Patch -Headers $adminHeaders -Body ($reassignData | ConvertTo-Json)
    Log-Response "Admin: Reassign Task" $res

    # Get Single Provisioning
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/provisionings/$provId" -Method Get -Headers $adminHeaders
    Log-Response "Admin: Get Provisioning $provId" $res
    if ($null -ne $res.data.submission.location -and $res.data.submission.location.lat -eq -7.714529) {
        Write-Host "Verification: Location coordinates are present in provisioning detail." -ForegroundColor Green
    } else {
        Write-Host "Verification Failed: Location coordinates are missing/incorrect in provisioning detail!" -ForegroundColor Red
    }

    # Suspend Provisioning
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/provisionings/$provId/suspend" -Method Patch -Headers $adminHeaders
    Log-Response "Admin: Suspend Provisioning" $res

    # Resume Provisioning
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/provisionings/$provId/resume" -Method Patch -Headers $adminHeaders
    Log-Response "Admin: Resume Provisioning" $res

    # Export Excel (Returns a file, so we output the headers/status)
    $tempExcel = [System.IO.Path]::GetTempFileName()
    Invoke-WebRequest -Uri "$baseUrl/admin/reports/submissions/excel" -Method Get -Headers $adminHeaders -OutFile $tempExcel
    Log-Response "Admin: Export Excel" @{ Status = 200; TempFile = $tempExcel }
    if (Test-Path $tempExcel) { Remove-Item $tempExcel }

    # Export PDF (Returns a file)
    $tempPdf = [System.IO.Path]::GetTempFileName()
    Invoke-WebRequest -Uri "$baseUrl/admin/reports/submissions/$subId/pdf" -Method Get -Headers $adminHeaders -OutFile $tempPdf
    Log-Response "Admin: Export PDF" @{ Status = 200; TempFile = $tempPdf }
    if (Test-Path $tempPdf) { Remove-Item $tempPdf }

    # Audit Log
    $res = Invoke-RestMethod -Uri "$baseUrl/admin/audit-log" -Method Get -Headers $adminHeaders
    Log-Response "Admin: Audit Log" $res

    # Notifications
    $res = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method Get -Headers $adminHeaders
    Log-Response "Admin: Notifications" $res

    # Mark Notifications as Read
    if ($res.data.data.Length -gt 0) {
        $notifId = $res.data.data[0].id
        $res = Invoke-RestMethod -Uri "$baseUrl/notifications/$notifId/read" -Method Patch -Headers $adminHeaders
        Log-Response "Admin: Mark Single Notification as Read" $res
    }
    $res = Invoke-RestMethod -Uri "$baseUrl/notifications/read-all" -Method Patch -Headers $adminHeaders
    Log-Response "Admin: Mark All Notifications Read" $res

} catch {
    Write-Host "Error in Admin Module: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host ($reader.ReadToEnd()) -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------
# TEKNISI MODULE
# ---------------------------------------------------------
try {
    # Login Teknisi
    $loginData = @{ email = "teknisi@example.com"; password = "password" }
    $res = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Headers $headers -Body ($loginData | ConvertTo-Json)
    Log-Response "Login Teknisi" $res
    $tekHeaders = $headers.Clone()
    $tekHeaders.Add("Authorization", "Bearer $($res.data.access_token)")

    # List Tasks
    $res = Invoke-RestMethod -Uri "$baseUrl/teknisi/tasks" -Method Get -Headers $tekHeaders
    Log-Response "Teknisi: List Tasks" $res

    # Get Single Task (Teknisi)
    $res = Invoke-RestMethod -Uri "$baseUrl/teknisi/tasks/$taskId" -Method Get -Headers $tekHeaders
    Log-Response "Teknisi: Get Task $taskId" $res
    if ($null -ne $res.data.customer.lat -and $res.data.customer.lat -eq -7.714529 -and $null -ne $res.data.customer.maps_url) {
        Write-Host "Verification: Customer location coordinates and maps_url are present in task detail." -ForegroundColor Green
    } else {
        Write-Host "Verification Failed: Customer location coordinates or maps_url are missing/incorrect in task detail!" -ForegroundColor Red
    }

    # Update Task Status
    $statusData = @{ status = "in_progress"; notes = "Starting work" }
    $res = Invoke-RestMethod -Uri "$baseUrl/teknisi/tasks/$taskId/status" -Method Put -Headers $tekHeaders -Body ($statusData | ConvertTo-Json)
    Log-Response "Teknisi: Update Status" $res

    # Upload Photo (Using curl.exe for maximum compatibility across PS versions)
    $tekTokenRaw = $tekHeaders['Authorization'].Replace('Bearer ', '')
    Write-Host "Uploading Task Photo..."
    $resPhotoRaw = curl.exe -s -H "Accept: application/json" -H "Authorization: Bearer $tekTokenRaw" -F "photo_type=modem" -F "photo=@.\dummy.jpg" "$baseUrl/teknisi/tasks/$taskId/upload-photo"
    $resPhoto = $resPhotoRaw | ConvertFrom-Json
    Log-Response "Teknisi: Upload Photo" $resPhoto

    # Complete Task
    $completeData = @{ completion_notes = "Instalasi selesai dan modem sudah aktif."; customer_rating = 5 }
    $res = Invoke-RestMethod -Uri "$baseUrl/teknisi/tasks/$taskId/complete" -Method Post -Headers $tekHeaders -Body ($completeData | ConvertTo-Json)
    Log-Response "Teknisi: Complete Task" $res

    # Notifications
    $res = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method Get -Headers $tekHeaders
    Log-Response "Teknisi: Notifications" $res

} catch {
    Write-Host "Error in Teknisi Module: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host ($reader.ReadToEnd()) -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------
# SUPERADMIN MODULE
# ---------------------------------------------------------
try {
    # Login Superadmin
    $loginData = @{ email = "superadmin@example.com"; password = "password" }
    $res = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Headers $headers -Body ($loginData | ConvertTo-Json)
    Log-Response "Login Superadmin" $res
    $saHeaders = $headers.Clone()
    $saHeaders.Add("Authorization", "Bearer $($res.data.access_token)")

    # Create User
    $newUserData = @{ name = "New Sales Guy"; email = "newsales$((Get-Date).Ticks)@example.com"; password = "password"; role = "Sales" }
    $res = Invoke-RestMethod -Uri "$baseUrl/superadmin/users" -Method Post -Headers $saHeaders -Body ($newUserData | ConvertTo-Json)
    Log-Response "Superadmin: Create User" $res
    $newUserId = $res.data.id

    # List Users
    $res = Invoke-RestMethod -Uri "$baseUrl/superadmin/users" -Method Get -Headers $saHeaders
    Log-Response "Superadmin: List Users" $res

    # Get User
    $res = Invoke-RestMethod -Uri "$baseUrl/superadmin/users/$newUserId" -Method Get -Headers $saHeaders
    Log-Response "Superadmin: Get User $newUserId" $res

    # Update User
    $upUserData = @{ name = "Updated Sales Guy" }
    $res = Invoke-RestMethod -Uri "$baseUrl/superadmin/users/$newUserId" -Method Put -Headers $saHeaders -Body ($upUserData | ConvertTo-Json)
    Log-Response "Superadmin: Update User" $res

    # Delete User
    $res = Invoke-RestMethod -Uri "$baseUrl/superadmin/users/$newUserId" -Method Delete -Headers $saHeaders
    Log-Response "Superadmin: Delete User" $res

} catch {
    Write-Host "Error in Superadmin Module: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host ($reader.ReadToEnd()) -ForegroundColor Yellow
    }
}

# Cleanup
if (Test-Path ".\dummy.jpg") { Remove-Item ".\dummy.jpg" }

Write-Host "All API Tests Completed!" -ForegroundColor Green
