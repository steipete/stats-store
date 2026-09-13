# stats.store

Next.js App Router application for Sparkle telemetry and a public Supabase-backed dashboard. Read README.md and docs/architecture.md first.

## Development

Use Node.js 24+ and the pnpm version pinned in package.json.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
SKIP_ENV_VALIDATION=true pnpm build
```

`pnpm format` runs oxfmt; lint uses oxlint with type-aware checks. Tests live in `tests/` and use Vitest and Testing Library.

## Boundaries

- `app/api/v1/appcast/[...path]/route.ts` identifies registered apps, records Sparkle telemetry, and proxies their configured feeds. Preserve legacy query parameters and the documented stable/prerelease URL rules in `lib/appcast.ts`.
- `app/api/v1/ingest/route.ts` accepts direct JSON reports. The API payload uses camelCase names; database columns use snake_case.
- `lib/telemetry.ts` owns CPU conversion and daily UTC IP hashing. Never store raw IP addresses in reports.
- `lib/dashboard/get-dashboard-data.ts` fetches dashboard aggregates. Components render the results and `hooks/use-realtime-stats.ts` subscribes to Supabase changes.
- `lib/supabase/server.ts` uses the service role on the server. Only public Supabase configuration may use the `NEXT_PUBLIC_` prefix.

Bootstrap databases with the numbered SQL files in `scripts/`, then apply `supabase/migrations/` in order. Preserve applied migration history; put fixes in new migrations. See docs/deployment.md.

Keep user-visible changes under `## Unreleased` in CHANGELOG.md. Do not add changelog entries for behavior-preserving refactors. GitHub pushes to the deployed branch trigger Vercel automatically; no v0.dev editing step is required.
