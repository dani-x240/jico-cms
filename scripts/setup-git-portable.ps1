<#
Installs portable Git into tools/PortableGit and updates current-user PATH.
#>

$ErrorActionPreference = 'Stop'

function Write-Log($msg) {
    Write-Host "[setup-git-portable] $msg"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir ".." )).ProviderPath
$toolsDir = Join-Path $repoRoot "tools"
$pkgPath = Join-Path $toolsDir "PortableGit-2.50.0-64-bit.7z.exe"
$installDir = Join-Path $toolsDir "PortableGit"
$gitCmdPath = Join-Path $installDir "cmd"
$gitExe = Join-Path $gitCmdPath "git.exe"
$url = "https://github.com/git-for-windows/git/releases/download/v2.50.0.windows.1/PortableGit-2.50.0-64-bit.7z.exe"

if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir | Out-Null
}

if (-not (Test-Path $pkgPath)) {
    Write-Log "Downloading portable Git package"
    Invoke-WebRequest -Uri $url -OutFile $pkgPath
} else {
    Write-Log "Using existing package: $pkgPath"
}

if (Test-Path $installDir) {
    Remove-Item -Recurse -Force $installDir
}

Write-Log "Extracting package"
& $pkgPath -y "-o$installDir" | Out-Null

if (-not (Test-Path $gitExe)) {
    throw "Portable Git extraction did not produce git.exe"
}

$env:Path = "$gitCmdPath;$env:Path"

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($null -eq $userPath) {
    $userPath = ''
}
if ($userPath -notlike "*$gitCmdPath*") {
    $newUserPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $gitCmdPath } else { "$gitCmdPath;$userPath" }
    [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
    Write-Log "Updated user PATH"
}

Write-Log "Git ready at: $gitExe"
& $gitExe --version
