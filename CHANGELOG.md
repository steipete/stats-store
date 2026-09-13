# Changelog

## Unreleased

**Highlights:** Sparkle appcast proxying and a real-time analytics dashboard, with refreshed dependencies for Node.js 24 and newer.

No tagged releases have been published yet; this section summarizes the existing service and its maintenance updates.

- Keep filtered KPIs and charts consistent during live updates, isolate subscription lifetimes, connect the activity feed, and render zero values and keyboard-accessible KPI explanations.
- Keep receipt timestamps, daily IP hashes, event totals, and milestone dates aligned when telemetry writes cross UTC midnight.
- Count every report and daily client hash and load complete long-range chart series beyond PostgREST row limits, with an aggregate RPC and pagination for deployments awaiting the migration.
- Accept large numeric build versions and order numeric version notifications correctly; serialize concurrent check-ins so one daily client emits one new-user event.
- **Compatibility:** Use UTC calendar days consistently in dashboard filters, chart labels, and SQL buckets; prevent browser time zones from shifting selected dates and accept UUID v7 app filters.
- Resolve GitHub download and feed URLs by their actual host, normalize clone URLs, and match download identifiers literally.
- Finish appcast telemetry writes after responding, match app names literally, and record the identifier that actually resolved the app.
- Reject malformed direct-ingest payloads and invalid integer fields before database access, and return a client error for unknown applications.
- Proxy Sparkle update checks identified by bundle identifier, app name, or User-Agent, preserving custom stable XML feed URLs and prerelease channel mapping.
- Show daily users, version adoption, macOS versions, CPU architecture, hardware models, languages, memory, core counts, and hourly activity in a redesigned light and dark dashboard with app and date filters.
- Restore the version-adoption timeline, validate app filters, and handle partial dashboard data failures independently.
- Hash client IPs per UTC day without storing raw addresses, and keep Vercel Web Analytics opt-in.
- Redirect registered GitHub app download links to a DMG release asset, preferring stable releases over prereleases.
- Clarify Supabase bootstrap and migration order, public dashboard access, app registration, direct-ingest versus feed URLs, and self-hosting configuration.
- Refresh runtime and development dependencies, including Next.js 16.3.5, React 19.3, Supabase JS 2.116, Supabase SSR 0.12.7, Lucide 1.45, Zod 4.6, and TypeScript 7, and align CI with pnpm 11.26.0 while retaining Node.js 24 support. Thanks @dependabot.
- Remove unused UI dependencies, update testing to Vitest 5, and consolidate CI while retaining Linux, macOS, and Windows checks.
- Build tooling now requires pnpm 12.4.1 to use the current stable package-manager toolchain; Node.js 24 remains supported.
