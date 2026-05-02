# Workflows

## `ci.yml`
Build + smoke test on every push to `main` and PR. Matrix: Node 20, 22.

## `publish.yml`
Publishes to npm. Two triggers:

- **Tag push** (`v*.*.*`) — verifies the tag matches `package.json` version, then `npm publish --access public --provenance` to the `latest` dist-tag.
- **Manual** (`workflow_dispatch`) — choose a dist-tag (`latest`, `next`, etc.). Useful for prereleases.

### One-time setup before first publish

1. Create an npm **automation** access token at <https://www.npmjs.com/settings/~/tokens> (skips 2FA challenge for CI).
2. In the GitHub repo: **Settings → Environments → New environment** → name it `npm-publish`. Add required reviewers if you want a manual approval gate.
3. In that environment, add secret `NPM_TOKEN` = the automation token.
4. Provenance (`--provenance`) requires the package's `repository` field in `package.json` to match the GitHub repo, which it already does.

### Cutting a release

```bash
# bump version in package.json, commit, then:
git tag v0.1.0
git push origin v0.1.0
```

The `Publish to npm` workflow will run, verify, and publish.
