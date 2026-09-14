# Releasing stats.store

stats.store is a Vercel-hosted Next.js application. A release consists of a signed
`v<version>` Git tag and a GitHub Release containing the finalized changelog.
Vercel automatically deploys `main`; there are no npm packages or binary assets
to publish. GitHub provides the source archives.

This manual release workflow follows the changelog, tag, and GitHub Release
sequence used by the sibling `steipete/osc-progress` and
`steipete/SweetCookieKit` repositories, with a signed tag and production checks
for this hosted service.

## Prepare and land

1. Start from a clean `main` at `origin/main` and pull with `git pull --ff-only`.
2. Create a release branch. Update `package.json` to the release version and
   finalize `## Unreleased` as `## <version> - YYYY-MM-DD`, using the local date.
   Preserve every entry and contributor credit, put capabilities and user-visible
   fixes first, and include a one-sentence `**Highlights:**` line for notable work.
3. Run the full local gate with the pinned pnpm version and Node.js 24 or newer:

   ```sh
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm typecheck
   pnpm test
   SKIP_ENV_VALIDATION=true pnpm build
   ```

   CI also verifies PostgreSQL 17 and 18 migrations and runs tests/builds on
   Linux, macOS, and Windows, including Node.js 26 on Linux. See
   [the testing guide](../tests/README.md) for the disposable database checks.

4. Review the release changes, commit as `chore: release <version>`, and open a
   pull request. Squash-merge after the PR checks pass, then switch back to
   `main` and verify the exact resulting release commit:

   ```sh
   git switch main
   git pull --ff-only
   test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
   git status -sb
   ```

   The checkout must be clean. Wait for the CI workflow on this exact `main`
   commit to succeed; the pre-squash release-branch commit is not the release.

5. Check the GitHub `Production` deployment and its status for that same commit.
   It must succeed, and `https://stats.store/` must return HTTP 200. Do not use the
   appcast integration suite against production: it writes telemetry.

## Tag and publish

Immediately before tagging, inspect both local/remote tags and the GitHub Release
list. Stop if the target tag or release already exists. Never retag a release or
tag a commit without successful CI and production verification.

Using the configured maintainer signing key:

```sh
version=0.1.1 # Replace for the next authorized release.
test "$(git branch --show-current)" = main
release_sha="$(git rev-parse HEAD)"
test "$release_sha" = "$(git rev-parse origin/main)"
git tag -s "v$version" "$release_sha" -m "stats.store $version"
git verify-tag "v$version"
git push origin "v$version"
```

Extract the version section of `CHANGELOG.md` into a temporary Markdown file,
excluding the version heading so the Highlights paragraph comes first:

```sh
notes_file="$(mktemp)"
awk -v version="$version" '$1 == "##" { emit = ($2 == version); next } emit { print }' CHANGELOG.md > "$notes_file"
test -s "$notes_file"
```

Append links to the hosted service, the changelog at the release commit, and the
successful CI run to this file. Inspect it, then create the GitHub Release:

```sh
gh release create "v$version" --verify-tag --title "$version" --notes-file "$notes_file" --latest
```

No release workflow runs on tag push; publication is the explicit command above.
The existing CI workflow and Vercel integration run when the release PR lands.

## Verify and close out

- Read the GitHub Release and tag through the API. Confirm the release is
  published, targets the signed release commit, contains the finalized changelog,
  and has no attached binary assets.
- Confirm the successful Production deployment identifies the release commit,
  and repeat the HTTP 200 check against `https://stats.store/` before closeout.
- Add an empty `## Unreleased` section above the released section. Leave the
  package version at the published version until the next release preparation.
- Review, commit as `chore: open <next-version> unreleased`, and squash-merge a
  closeout PR after checks pass.
- Pull `main`, verify it matches `origin/main`, remove the task branches, and
  remove local build outputs created during the release.
