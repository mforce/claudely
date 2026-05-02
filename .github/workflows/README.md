# Workflows

## `ci.yml`
Build + smoke test on every push to `main` and PR. Matrix: Node 20, 22.

## `publish.yml`
Publishes to npm. Two triggers:

- **GitHub Release published** — verifies the release tag matches `package.json` version, then `npm publish --access public --provenance` to the `latest` dist-tag. Plain tag pushes do **not** trigger this; you must create a Release (GitHub UI or `gh release create`).
- **Manual** (`workflow_dispatch`) — choose a dist-tag (`latest`, `next`, etc.). Useful for prereleases.

### One-time setup before first publish

Uses npm **Trusted Publishing** (OIDC) — no npm tokens, no GitHub secrets.

1. On npmjs.com, go to the package page → **Settings → Publishing access → Add trusted publisher** → **GitHub Actions**, then fill in:
   - Organization or user: `mforce`
   - Repository: `claudely`
   - Workflow filename: `publish.yml`
   - Environment name: `npm-publish`
2. In the GitHub repo: **Settings → Environments → New environment** → name it `npm-publish`. Add required reviewers if you want a manual approval gate.
3. (Recommended) On the npm package settings, set **Publishing access** to *Require two-factor authentication and disallow tokens* — Trusted Publishing bypasses both checks via OIDC, while blocking any stray token-based publish path.

Provenance is attached automatically by Trusted Publishing; the `repository` field in `package.json` already matches the GitHub repo, which is required.

### Cutting a release

```bash
# bump version in package.json, commit, push, then:
gh release create v0.1.0 --generate-notes
```

The `Publish to npm` workflow fires on the `release: published` event, verifies the tag matches `package.json`, and publishes. A plain `git push --tags` will **not** trigger publish — that's intentional, so accidental tag pushes can't ship a release.
