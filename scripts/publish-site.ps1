# Publish SITE to gh-pages using gh-pages package
# Usage: from repo root
# 1) Ensure gh-pages is installed: npm install --save-dev gh-pages
# 2) Run this script: .\scripts\publish-site.ps1

Write-Host "Ensuring gh-pages is installed..."
npm install --no-audit --no-fund --save-dev gh-pages

Write-Host "Publishing SITE to gh-pages branch..."
npx gh-pages -d SITE

Write-Host "Published. Enable GitHub Pages in repo settings if needed."