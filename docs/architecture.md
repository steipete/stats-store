# Architecture

stats.store is a Next.js App Router application deployed on Vercel, with PostgreSQL storage and change feeds supplied by Supabase. The dashboard is public; this repository does not implement a login flow or authenticated per-owner dashboards.

## Request paths

| Entry point                     | Responsibility                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/appcast/[...path]` | Identify a registered app, record update telemetry, fetch and return its configured upstream XML feed. |
| `POST /api/v1/ingest`           | Accept a direct JSON telemetry report for a registered bundle identifier.                              |
| `GET /download/[app]`           | Find a registered app's GitHub releases and redirect to a DMG, preferring a stable release.            |
| `GET /`                         | Fetch aggregates for the selected app/date range and render the dashboard.                             |

The appcast lookup tries `bundleIdentifier`, then the query's `appName`, then the User-Agent app name. `lib/appcast.ts` owns User-Agent parsing and URL mapping, including custom stable filenames and prerelease channels. See [the appcast guide](APPCAST_PROXY.md) for the full mapping contract and [direct ingest](SPARKLE_INTEGRATION.md) for JSON payloads.

Both ingest routes use `lib/telemetry.ts` for CPU architecture conversion and SHA-256 hashing of the client IP with the UTC date. Reports store the digest, not the raw IP. The date changes the digest each day; this is pseudonymization, not a guarantee that an IP cannot be guessed. Counts over multiple days therefore do not identify persistent installations.

## Storage and migrations

The SQL files are the schema source of truth:

- `apps`: registered names, bundle identifiers, Sparkle display names, and upstream appcast URLs.
- `reports`: timestamped update checks, daily IP digests, versions, device/profile fields, and app identification source.
- `stats_cache`: per-app aggregates with optional period boundaries.
- `realtime_events`: new-user, version, milestone, and report-batch notifications.
- `aggregation_state`: per-app batch counters and last aggregation time.

Apply every numbered file present in `scripts/` in numeric order, then the managed migrations in `supabase/migrations/`. Numbering gaps are intentional; there are no bootstrap scripts 12 or 13. Add new migrations for fixes to deployed databases. Do not edit a database manually as the sole record of a change. The [deployment guide](deployment.md) has the setup commands.

The server client uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; it bypasses RLS and must remain server-only. Browser subscriptions use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The shipped SQL grants public reads, including on reports. Vercel Web Analytics is opt-in via `NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS=1`.

## Dashboard and live updates

`app/page.tsx` parses the `app`, `from`, and `to` query parameters. The default date range is 30 calendar days. `lib/dashboard/get-dashboard-data.ts` queries KPI counts and distribution RPCs concurrently, formats chart rows, and preserves individual section errors.

The chart wrappers in `components/client-*-chart.tsx` use Recharts, the shared chart theme, and a ResizeObserver hook. `RealtimeWrapper` connects the KPI dashboard to the connection footer. `useRealtimeStats` loads `stats_cache` and subscribes to `realtime_events` inserts and `stats_cache` updates.

Database triggers emit new-user events immediately and aggregate when a report brings the batch to ten reports or arrives more than thirty seconds after the last aggregation. There is no timer guaranteeing an update after thirty idle seconds. Cached KPI rows describe a single app and day; they are not arbitrary dashboard date-range aggregates.

## Verification

Vitest covers API handlers, data formatting, components, and hooks. The existing HTTP appcast integration script runs against a configured server and needs registered test apps. See [tests/README.md](../tests/README.md). CI runs lint, type checks, tests, coverage, and production builds. Vercel deploys the connected GitHub branch automatically.
