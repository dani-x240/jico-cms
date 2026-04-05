# Kill existing node processes and start the dev server (Windows PowerShell)
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/start-dev-clean.ps1

param(
  [string]$startCommand = 'npm start'
)

Write-Host "Stopping existing node processes (if any)..."
# Attempt graceful stop, then force
try {
  Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() | Out-Null }
  Start-Sleep -Seconds 1
  Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
} catch {
  Write-Host "No node processes found or failed to stop gracefully: $_"
}

Write-Host "Starting dev server: $startCommand"
# Start the command and inherit stdout/stderr
powershell -NoProfile -Command "$startCommand"
