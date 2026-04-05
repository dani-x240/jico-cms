# Release helper (Windows PowerShell)
# Usage: Open PowerShell as admin and run from repo root:
#   .\scripts\release-windows.ps1 -Version "1.0.1" -CommitAndPush
param(
  [string]$Version = "1.0.1",
  [switch]$CommitAndPush
)

Write-Host "1) Install dependencies and ensure lockfile is in sync"
npm install

Write-Host "2) Bump REACT_APP_VERSION environment for build (uses cross-env if needed)"
# Build mobile and sync native Android
npx cross-env REACT_APP_VERSION=$Version npm run build:mobile

Write-Host "3) Copy web assets to Android native project"
npx cap copy android

Write-Host "4) Stage native project and SITE for commit"
git add android -A
git add SITE -A
git add package-lock.json

if ($CommitAndPush) {
  git commit -m "Prepare Android and SITE for release (version $Version)"
  git push origin main
} else {
  Write-Host "Files staged. Run 'git commit -m "Prepare Android and SITE"' and 'git push' if ready."
}

Write-Host "Next: open android/ in Android Studio to generate a signed APK, or run Gradle to assembleRelease."