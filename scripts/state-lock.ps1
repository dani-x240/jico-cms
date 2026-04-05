<#
One-click state lock script.
Creates a timestamped backup snapshot, removes stale generated artifacts,
and rebuilds mobile assets from the current source.
#>

param(
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = 'Stop'

function Write-Log($msg) {
    Write-Host "[state-lock] $msg"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir ".." )).ProviderPath
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$stateLockDir = Join-Path $repoRoot "SUPPORT\state-lock"
$snapshotDir = Join-Path $stateLockDir "snapshot-$timestamp"
$snapshotZip = "$snapshotDir.zip"

$copyTargets = @(
    "src",
    "public",
    "scripts",
    "package.json",
    "package-lock.json",
    "capacitor.config.ts",
    "ionic.config.json",
    "README.md"
)

$cleanupTargets = @(
    "build",
    "dist",
    "installer_output",
    "android\app\build",
    "android\build",
    "android\.gradle",
    "APPFLOW-UPLOAD\android\app\build",
    "APPFLOW-UPLOAD\android\app\src\main\assets\public",
    "CMS-APK\android-appflow\android\app\build",
    "CMS-APK\android-appflow\android\app\src\main\assets\public",
    "tmp_apk_extract",
    "android.zip",
    "build_output.log"
)

Push-Location $repoRoot
try {
    Write-Log "Repo root: $repoRoot"

    if (-not (Test-Path $stateLockDir)) {
        New-Item -ItemType Directory -Path $stateLockDir | Out-Null
    }

    if (Test-Path $snapshotDir) {
        Remove-Item -Recurse -Force $snapshotDir
    }
    New-Item -ItemType Directory -Path $snapshotDir | Out-Null

    foreach ($target in $copyTargets) {
        $src = Join-Path $repoRoot $target
        if (-not (Test-Path $src)) {
            continue
        }

        $dest = Join-Path $snapshotDir $target
        if ((Get-Item $src).PSIsContainer) {
            New-Item -ItemType Directory -Path $dest -Force | Out-Null
            Copy-Item -Path (Join-Path $src '*') -Destination $dest -Recurse -Force
        } else {
            $destDir = Split-Path -Parent $dest
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -Path $src -Destination $dest -Force
        }
    }

    if (Test-Path $snapshotZip) {
        Remove-Item -Force $snapshotZip
    }
    Compress-Archive -Path (Join-Path $snapshotDir '*') -DestinationPath $snapshotZip -CompressionLevel Optimal
    Write-Log "Backup created: $snapshotZip"

    foreach ($target in $cleanupTargets) {
        $path = Join-Path $repoRoot $target
        if (Test-Path $path) {
            Remove-Item -Recurse -Force $path
            Write-Log "Removed: $target"
        }
    }

    if (-not $SkipBuild) {
        Write-Log "Running clean mobile build"
        npm run build:mobile
    } else {
        Write-Log "SkipBuild set, build step was skipped"
    }

    Write-Log "State lock complete"
    Write-Log "Snapshot zip: $snapshotZip"
    exit 0
} catch {
    Write-Error "state-lock failed: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location
}
