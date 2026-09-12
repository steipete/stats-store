# Changelog

## Unreleased

**Highlights:** Sparkle appcast proxying and a real-time analytics dashboard, with refreshed dependencies for Node.js 24 and newer.

No tagged releases have been published yet; this section summarizes the existing service and its maintenance updates.

- Proxy Sparkle update checks identified by bundle identifier, app name, or User-Agent, preserving custom stable XML feed URLs and prerelease channel mapping.
- Show daily users, version adoption, macOS versions, CPU architecture, hardware models, languages, memory, core counts, and hourly activity in a redesigned light and dark dashboard with app and date filters.
- Restore the version-adoption timeline, validate app filters, and handle partial dashboard data failures independently.
- Hash client IPs per UTC day without storing raw addresses, and keep Vercel Web Analytics opt-in.
- Redirect registered GitHub app download links to a DMG release asset, preferring stable releases over prereleases.
- Clarify Supabase bootstrap and migration order, app registration, and self-hosting requirements.
- Refresh runtime and development dependencies, including Next.js 16.3.5, React 19.3, Supabase JS 2.116, Supabase SSR 0.12.7, Lucide 1.45, Zod 4.6, and TypeScript 7, and align CI with pnpm 11.26.0 while retaining Node.js 24 support. Thanks @dependabot.
- Update react-resizable-panels to 4.12.4.
