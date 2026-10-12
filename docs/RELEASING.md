# Releasing stats.store

Numbered releases publish the versioned source on GitHub. The package is private;
there is no npm publication, Homebrew handoff, or application-signing credential.
Deployment is separate from release publication.

## Prepare

1. Update `package.json` and any lockfile root version for the next release.
2. Finalize one `## X.Y.Z - YYYY-MM-DD` section in `CHANGELOG.md`, preserving
   contributor credit and release highlights. Keep an empty `## Unreleased` above it.
3. Land the reviewed release preparation PR on protected `main`. Wait for every
   independent push CI check on that exact merged commit to pass.

## No-publish proof

Run the **Release** workflow on current `main`, with the version from `package.json`
and `dry_run=true` (the dispatch default):

```sh
gh workflow run release.yml --repo steipete/stats-store --ref main -f version=X.Y.Z -F dry_run=true
```

A rehearsal freezes current protected `main`, even if that version already has a
historical tag or release. It validates the version and dated changelog, requires
exact-commit push CI, runs `scripts/verify-release.sh` with Node.js 24.15.0, assembles
source archives, and independently verifies their inventory and SHA-256 checksums.
It creates no tag, draft, release, or deployment. No secrets are needed.

The local verification script only installs dependencies, builds, and tests. Run
it with Node.js 24.15+ and the repository's package manager. It does not publish.

## Publish an explicitly authorized release

After the rehearsal succeeds, create an SSH-signed annotated `vX.Y.Z` tag on the
verified commit using a key listed in `.github/release-allowed-signers`. Verify it
locally and push the tag. The tag push is the publication entrypoint; do not run
`gh release create` or a local publish helper.

`.github/workflows/release.yml` calls
`openclaw/release-workflows/.github/workflows/release-source.yml@v1`. It verifies
the signed tag, protected-branch ancestry, exact version metadata, dated notes,
and green push CI, then builds and verifies the frozen source before publishing.
Live dispatches also require a pre-existing signed tag; an unsigned workflow-created
tag cannot satisfy this repository's policy. Never move tags or republish a version.

The GitHub Release contains the exact changelog section, commit-based `.tar.gz`
and `.zip` source archives, `ASSET-INVENTORY.json`, and `SHA256SUMS`. The two source
verifiers run without publication credentials. The publisher checks the frozen
inventory and tag again before publishing. Read back the release and verify the
checksums and tag commit after completion. Leave `main` current and clean.

## Vercel boundary

Vercel continues to deploy its connected GitHub branch automatically. The release
workflow does not inspect, trigger, or alter that integration. Sparkle appcasts
served by this project belong to client apps, not to a stats.store binary release.
