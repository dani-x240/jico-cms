# send-sms.ps1
# Simple PowerShell script to call the Supabase Edge Function `send-sms`.
# Usage examples:
# 1) Pass Service Role key as an argument:
#    .\scripts\send-sms.ps1 -ServiceRoleKey "<SERVICE_ROLE_KEY>" -To "+2547XXXXXXXX" -Message "Hello from CMS"
# 2) Set env var then run:
#    $env:SUPABASE_SERVICE_ROLE_KEY = "<SERVICE_ROLE_KEY>"
#    .\scripts\send-sms.ps1 -To "+2547XXXXXXXX" -Message "Hello from CMS"

param(
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
    [string]$To = "+2547XXXXXXXX",
    [string]$Message = "Hello from CMS"
)

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-Host "Enter Supabase Service Role Key (will not be saved)"
}

$body = @{ to = $To; message = $Message } | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Uri 'https://hjhkvjysynpseixutvkw.supabase.co/functions/v1/send-sms' -Method Post -ContentType 'application/json' -Body $body -Headers @{ Authorization = "Bearer $ServiceRoleKey" }
    $resp | ConvertTo-Json -Depth 10
} catch {
    Write-Error $_.Exception.Message
}
