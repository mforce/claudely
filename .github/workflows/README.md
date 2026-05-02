# Workflows

## `ci.yml`
Build + smoke test on every push to `main` and PR. Matrix: Node 20, 22.

## `publish.yml`
Publishes to npm. Two triggers:

- **GitHub Release published** — verifies the release tag matches `package.json` version, then `npm publish --access public --provenance` to the `latest` dist-tag. Plain tag pushes do **not** trigger this; you must create a Release (GitHub UI, `gh release create`, or the `release-on-version-bump` workflow below).
- **Manual** (`workflow_dispatch`) — choose a dist-tag (`latest`, `next`, etc.). Useful for prereleases.

### One-time setup before first publish

1. Create an npm **automation** access token at <https://www.npmjs.com/settings/~/tokens> (skips 2FA challenge for CI).
2. In the GitHub repo: **Settings → Environments → New environment** → name it `npm-publish`. Add required reviewers if you want a manual approval gate.
3. In that environment, add secret `NPM_TOKEN` = the automation token.
4. Provenance (`--provenance`) requires the package's `repository` field in `package.json` to match the GitHub repo, which it already does.

## `release-on-version-bump.yml`
Auto-creates the git tag and GitHub Release whenever `package.json` `version` changes on `main`. The published Release then triggers `publish.yml`, which ships to npm.

How it works on each push to `main` that touches `package.json`:

1. Compares `package.json` `version` against the previous commit.
2. Bails out if the version is unchanged or if `vX.Y.Z` already exists as a tag.
3. Reads the matching `## [X.Y.Z] - YYYY-MM-DD` section from [`CHANGELOG.md`](../../CHANGELOG.md) and uses it as the Release body. **The job fails if no matching section exists** — keeping `CHANGELOG.md` and `package.json` in lockstep is a hard requirement, not a convention.
4. Creates the tag and Release (marked `--prerelease` if the version contains a `-`, e.g. `0.2.0-rc.0`).

### One-time setup
- Generate a fine-grained PAT scoped to this repo with **Contents: read+write**, store it as repository secret `RELEASE_PAT`. The default `GITHUB_TOKEN` cannot be used here because Releases created with it do **not** trigger downstream workflows (GitHub's anti-recursion rule), so `publish.yml` would silently fail to fire.

### Cutting a release

```bash
# 1) update CHANGELOG.md: move items from [Unreleased] into a new
#    "## [X.Y.Z] - YYYY-MM-DD" section.
# 2) bump package.json:
npm version X.Y.Z --no-git-tag-version
# 3) open a PR, get it reviewed, merge to main.
```

On merge, `release-on-version-bump.yml` creates `vX.Y.Z` + the Release (using the CHANGELOG section as the body), and `publish.yml` ships to npm. A plain `git push --tags` does **not** publish — that's intentional, so accidental tag pushes can't ship a release.

For a one-off prerelease without going through `main` (e.g. smoke-testing the pipeline), use the **Manual** trigger on `publish.yml` with `tag=next`.
