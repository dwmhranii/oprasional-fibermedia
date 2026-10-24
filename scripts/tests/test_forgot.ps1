try {
    $headers = @{"Accept"="application/json";"Content-Type"="application/json"}
    $body = @{"email"="sales@example.com"} | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:8000/api/forgot-password" -Method Post -Headers $headers -Body $body
    $res | ConvertTo-Json -Depth 3
} catch {
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $reader.ReadToEnd()
    }
}
