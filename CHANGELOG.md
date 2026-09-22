# Changelog

## Unreleased

- **Compatibility:** Align the supported Node range with the existing jsdom requirement: Node 24.15+ (24.x) or 26+; verify the exact minimum in CI and refresh runtime/development dependencies and pnpm. Thanks @dependabot.

- Keep app downloads on the latest stable GitHub release even when more than 30 newer prereleases exist; fall back to prereleases only when no stable release exists.

## 0.1.1 - 2026-09-14

**Highlights:** Privacy-focused Sparkle appcast proxying and a live analytics dashboard, with complete report aggregation, reliable live filters, and consistent UTC calendar-day handling.

This first tagged release summarizes the existing service and its maintenance updates.

- Proxy Sparkle update checks identified by bundle identifier, app name, or User-Agent, preserving custom stable XML feed URLs and prerelease channel mapping.
- Show daily users, version adoption, macOS versions, CPU architecture, hardware models, languages, memory, core counts, and hourly activity in a redesigned light and dark dashboard with app and date filters.
- Hash client IPs per UTC day without storing raw addresses, and keep Vercel Web Analytics opt-in.
- Redirect registered GitHub app download links to a DMG release asset, preferring stable releases over prereleases.
- Keep filtered KPIs and charts consistent during live updates, isolate subscription lifetimes, connect the activity feed, and render zero values and keyboard-accessible KPI explanations.
- Bound long-range charts to 1,000 intervals without dropping totals, distinguish years and bucket widths, and label report counts accurately.
- Count every report and daily client hash and load complete long-range chart series beyond PostgREST row limits, with an aggregate RPC and pagination for deployments awaiting the migration.
- Keep receipt timestamps, daily IP hashes, event totals, and milestone dates aligned when telemetry writes cross UTC midnight.
- Accept large numeric build versions and order numeric version notifications correctly; serialize concurrent check-ins so one daily client emits one new-user event.
- Resolve GitHub download and feed URLs by their actual host, normalize clone URLs, and match download identifiers literally.
- Finish appcast telemetry writes after responding, match app names literally, and record the identifier that actually resolved the app.
- Reject malformed direct-ingest payloads and invalid integer fields before database access, and return a client error for unknown applications.
- Restore the version-adoption timeline, validate app filters, and handle partial dashboard data failures independently.
- **Compatibility:** Use UTC calendar days consistently in dashboard filters, chart labels, and SQL buckets; prevent browser time zones from shifting selected dates and accept UUID v7 app filters.
- Build tooling now requires pnpm 12.4.1 to use the current stable package-manager toolchain; Node.js 24 remains supported.
- Update tailwind-merge to 3.7.0, align Recharts' react-is peer with React 19.3, and refresh transitive dependencies; verify Node.js 26 and PostgreSQL 18 alongside the existing Node.js 24 and PostgreSQL 17 checks.
- Refresh runtime and development dependencies, including Next.js 16.3.5, React 19.3, Supabase JS 2.116, Supabase SSR 0.12.7, Lucide 1.45, Zod 4.6, and TypeScript 7, and align CI with pnpm 11.26.0 while retaining Node.js 24 support. Thanks @dependabot.
- Remove unused UI dependencies, update testing to Vitest 5, and consolidate CI while retaining Linux, macOS, and Windows checks.
- Clarify Supabase bootstrap and migration order, public dashboard access, app registration, direct-ingest versus feed URLs, and self-hosting configuration.
