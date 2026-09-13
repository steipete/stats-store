# Contributing to stats.store

Report reproducible bugs and discuss feature proposals in [GitHub Issues](https://github.com/steipete/stats-store/issues). Include the observed behavior, expected behavior, and steps to reproduce; redact private telemetry and credentials from captures.

## Local development

Use Node.js 24 or newer and the pnpm version pinned in `package.json`. Fork and clone the repository, then follow [the deployment guide](docs/deployment.md) to bootstrap a local or test Supabase project. Copy `.env.example` to `.env.local` and fill in the application configuration. Keep migration credentials in the separate `.env.migrations` file.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The app runs at `http://localhost:3000`. The [architecture notes](docs/architecture.md) describe the routes, database, and component boundaries.

## Changes and checks

Use focused branches and Conventional Commits such as `fix: handle missing app identifiers`. Format with oxfmt, lint with oxlint, and add regression tests for behavior changes. Tests live under `tests/`, grouped by the module they exercise.

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm test
SKIP_ENV_VALIDATION=true pnpm build
```

Open a pull request with the problem, resulting behavior, and relevant validation. Include sanitized before/after captures for visible UI changes. Maintainers add user-visible changelog entries when landing contributor work.

The repository does not currently include a license file. Contact the maintainer for licensing clarification.
