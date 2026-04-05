# Restore android project to repo root from the preferred source and ensure a single android/ folder exists.
# Usage: run from repo root (C:\Users\JICO\Desktop\CMS)

$preferred = Join-Path $PSScriptRoot "..\CMS-APK\android-appflow\android"
$dest = Join-Path $PSScriptRoot "..\android"

if (-not (Test-Path $preferred)) {
    Write-Error "Preferred android project not found: $preferred"
    exit 1
}

# Remove existing top-level android folder if present
if (Test-Path $dest) {
    Write-Host "Removing existing android/ folder at $dest"
    Remove-Item -Recurse -Force $dest
}

Write-Host "Copying android project from $preferred to $dest"
Copy-Item -Recurse -Force $preferred $dest

# Ensure gradlew is executable (Windows uses gradlew.bat which is fine)
$gradlew = Join-Path $dest "gradlew"
if (Test-Path $gradlew) {
    # set executable permission on non-Windows systems (no-op on Windows)
    try { icacls $gradlew /grant Everyone:RX } catch { }
}

Write-Host "Restored android project to repo root. Next steps:"
Write-Host "1) Generate Android launcher PNGs from public\icon.ico: powershell -ExecutionPolicy Bypass -File .\scripts\update-android-icons.ps1"
Write-Host "2) Build web bundle and sync Capacitor: npm install; $env:REACT_APP_VERSION='1.0.2'; npm run build:mobile; npx cap sync android"
Write-Host "3) Build release APK: cd android; .\gradlew clean; .\gradlew assembleRelease"
Write-Host "4) Sign APK using your keystore or Android Studio."

# Optionally copy the icon into the restored android res folders now if public\icon.ico exists
$icon = Join-Path $PSScriptRoot "..\public\icon.ico"
if (Test-Path $icon) {
    Write-Host "Found public\icon.ico — running icon update script to populate android mipmap folders"
    & (Join-Path $PSScriptRoot 'update-android-icons.ps1')
} else {
    Write-Warning "public\icon.ico not found — place your icon at public\icon.ico then run scripts\update-android-icons.ps1"
}
