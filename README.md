This folder contains a minimal static download page for your CMS APK.

How to use

1. Put your APK file inside this folder and name it `app-release.apk` (or update `index.html` link to the actual filename).
2. Commit and push this folder to your GitHub repo and publish it with GitHub Pages, or deploy to any static host.

Quick publish options

Option A — GitHub Pages using `gh-pages` branch (recommended if you want root hosting):

```bash
# from repo root
git add SITE -A
git commit -m "Add APK download site"
# push SITE content to gh-pages branch (force)
git subtree push --prefix SITE origin gh-pages
```

Then enable GitHub Pages in repo settings (branch: `gh-pages`, folder: `/`).

Option B — GitHub Pages via `docs/` folder:

```bash
# move contents of SITE to docs/
# or copy SITE/* into docs/ and commit
# then enable Pages from branch: main / folder: /docs
```

Option C — Deploy manually to any static host (Netlify, Vercel, S3, etc.).

Security note

- APK installation requires users to enable "Install unknown apps" unless distributed via Play Store.
- Keep APK URL stable and consider signing APK with your release key.
