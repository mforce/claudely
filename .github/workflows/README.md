# Workflows

## `ci.yml`
Build + smoke test on every push to `main` and PR. Matrix: Node 20, 22.

## `publish.yml`
Publishes to npm. Two triggers:

- **GitHub Release published** — verifies the release tag matches `package.json` version, then `npm publish --access public --provenance` to the `latest` dist-tag. Plain tag pushes do **not** trigger this; you must create a Release (GitHub UI or `gh release create`).
- **Manual** (`workflow_dispatch`) — choose a dist-tag (`latest`, `next`, etc.). Useful for prereleases.

### One-time setup before first publish

1. Create an npm **automation** access token at <https://www.npmjs.com/settings/~/tokens> (skips 2FA challenge for CI).
2. In the GitHub repo: **Settings → Environments → New environment** → name it `npm-publish`. Add required reviewers if you want a manual approval gate.
3. In that environment, add secret `NPM_TOKEN` = the automation token.
4. Provenance (`--provenance`) requires the package's `repository` field in `package.json` to match the GitHub repo, which it already does.

### Cutting a release

```bash
# bump version in package.json, commit, push, then:
gh release create v0.1.0 --generate-notes
```

The `Publish to npm` workflow fires on the `release: published` event, verifies the tag matches `package.json`, and publishes. A plain `git push --tags` will **not** trigger publish — that's intentional, so accidental tag pushes can't ship a release.
