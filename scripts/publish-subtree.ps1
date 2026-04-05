# Publish SITE folder to gh-pages branch using git subtree
# Usage: from repo root
# Ensure you have committed SITE contents (including app-release.apk)

Write-Host "Publishing SITE to gh-pages via git subtree..."

# Create gh-pages branch if not exists (local temporary)
git branch --list gh-pages || git checkout --orphan gh-pages
# Switch back to main
git checkout main

# Push subtree
git subtree push --prefix SITE origin gh-pages

Write-Host "Done. Then enable GitHub Pages (branch: gh-pages / folder: /) in repo settings."