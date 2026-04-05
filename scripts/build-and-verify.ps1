<#
One-click build & verify script.

Usage (from repository root):
powershell -ExecutionPolicy Bypass -File .\scripts\build-and-verify.ps1 -Version 1.0.2 -SearchString "1.0.2"

What it does:
- Restores `android/` from `CMS-APK/android-appflow/android` via scripts/restore-android.ps1
- Runs scripts/update-android-icons.ps1 to populate launcher icons (ImageMagick optional)
- Sets `REACT_APP_VERSION` to the requested version
- Runs `npm install`, `npm run build:mobile`, `npx cap sync android`
- Runs Gradle assembleRelease to produce an unsigned release APK
- Extracts the APK to a temp folder and searches built JS for `SearchString` (verifies current code present)

Notes:
- Requires Node, npm, Java, Android SDK (ANDROID_HOME), and Gradle tooling on PATH.
- Signing is NOT performed by this script. It produces an unsigned APK at the usual Gradle path.
#>

param(
    [string]$Version = '1.0.2',
    [string]$SearchString = '',
    [switch]$SkipIconGeneration = $false
)

function Write-Log($msg){ Write-Host "[build-and-verify] $msg" }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir ".." )).ProviderPath

Push-Location $repoRoot
try {
    Write-Log "Repository root: $repoRoot"

    # Step 1: Restore android project
    $restoreScript = Join-Path $scriptDir 'restore-android.ps1'
    if (Test-Path $restoreScript) {
        Write-Log "Running restore script: $restoreScript"
        & $restoreScript
    } else {
        Write-Warning "restore-android.ps1 not found — ensure android/ exists or extract android.zip manually"
    }

    # Step 2: generate icons (unless skipped)
    if (-not $SkipIconGeneration) {
        $iconScript = Join-Path $scriptDir 'update-android-icons.ps1'
        if (Test-Path $iconScript) {
            Write-Log "Generating Android icons (update-android-icons.ps1)"
            & $iconScript
        } else {
            Write-Warning "update-android-icons.ps1 not found — skipping icon generation"
        }
    } else {
        Write-Log "Skipping icon generation as requested"
    }

    # Step 3: set version env and build web bundle
    Write-Log "Setting REACT_APP_VERSION=$Version"
    $env:REACT_APP_VERSION = $Version

    Write-Log "Installing node dependencies (npm install)"
    npm install

    Write-Log "Building mobile web bundle and syncing Capacitor (npm run build:mobile)"
    npm run build:mobile

    Write-Log "Running npx cap sync android"
    npx cap sync android

    # Step 4: Build Android release (unsigned)
    $androidDir = Join-Path $repoRoot 'android'
    if (-not (Test-Path $androidDir)) { throw "android/ not found after restore. Check restore-android.ps1 output." }

    Push-Location $androidDir
    Write-Log "Running Gradle assembleRelease (this may take several minutes)"
    if (Test-Path '.\gradlew') {
        .\gradlew clean assembleRelease
    } else {
        Write-Log "gradlew not found — attempting to run gradle wrapper via gradle command"
        gradle clean assembleRelease
    }
    Pop-Location

    # Step 5: find APK and extract
    $apkPath1 = Join-Path $androidDir 'app\build\outputs\apk\release\app-release-unsigned.apk'
    $apkPath2 = Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'
    $apkPath = $null
    if (Test-Path $apkPath1) { $apkPath = $apkPath1 } elseif (Test-Path $apkPath2) { $apkPath = $apkPath2 } else { throw "Unsigned APK not found. Check Gradle output." }

    Write-Log "Found APK: $apkPath"

    $tmpExtract = Join-Path $repoRoot 'tmp_apk_extract'
    if (Test-Path $tmpExtract) { Remove-Item -Recurse -Force $tmpExtract }
    New-Item -ItemType Directory -Path $tmpExtract | Out-Null

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($apkPath, $tmpExtract)
    Write-Log "APK extracted to $tmpExtract"

    # Default search string uses version if not provided
    if (-not $SearchString) { $SearchString = $Version }
    Write-Log "Searching extracted JS for: $SearchString"

    $matches = Select-String -Path (Join-Path $tmpExtract '**\*.js') -Pattern $SearchString -SimpleMatch -ErrorAction SilentlyContinue
    if ($matches) {
        Write-Log "Verification SUCCESS: Found matches in APK bundle. Sample:"
        $sample = $matches | Select-Object -First 5
        $sample | ForEach-Object { Write-Host "  $($_.Path) : line $($_.LineNumber) : $($_.Line.Trim())" }
        Write-Log "Unsigned APK ready at: $apkPath"
        exit 0
    } else {
        Write-Warning "Verification FAILED: Search string not found in built JS. APK may contain older code."
        exit 2
    }

} catch {
    Write-Error "Error: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location -ErrorAction SilentlyContinue
}
