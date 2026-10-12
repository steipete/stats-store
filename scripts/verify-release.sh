#!/usr/bin/env bash
set -euo pipefail

# Credential-free release proof; CI separately checks all platforms and databases.
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test --maxWorkers=2
NEXT_TELEMETRY_DISABLED=1 SKIP_ENV_VALIDATION=true pnpm build
test -s .next/BUILD_ID
