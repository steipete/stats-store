# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stats Store is a Next.js 15 analytics dashboard for tracking Sparkle-enabled macOS applications. It collects anonymous telemetry data from apps and displays metrics like unique users, update checks, OS distribution, and CPU architecture. The project uses Supabase for data storage and Tremor React for visualizations.

## Development Commands

\`\`\`bash

# Install dependencies (using pnpm)

pnpm install

# Run development server

pnpm dev

# Build for production

pnpm build

# Start production server

pnpm start

# Run linting

pnpm lint
\`\`\`

## Architecture Overview

### Data Flow

1. Sparkle apps send telemetry to `/api/v1/ingest` endpoint
2. API validates app bundle identifier and processes data (hashes IPs daily for privacy)
3. Data stored in Supabase PostgreSQL database
4. Dashboard fetches data server-side and renders charts client-side

### Key Technologies

- **Frontend**: Next.js 15.3.3 with App Router, React 19.1.0, TypeScript
- **UI Components**: Tremor React (charts), Radix UI, shadcn/ui
- **Styling**: Tailwind CSS v4 (recently migrated from v3)
- **Database**: Supabase (PostgreSQL with RPC functions)
- **Deployment**: Vercel (auto-deployed from v0.dev)

### Database Schema

- `apps` table: Registered applications (id, name, bundle_identifier)
- `reports` table: Telemetry data (app_id, version, os_version, cpu_arch, ip_hash, etc.)
- RPC functions for aggregated queries (daily counts, distributions, etc.)

### Component Architecture

- **Server Components**: `app/page.tsx` for data fetching
- **Client Components**: `components/client-*-chart.tsx` for interactive charts
- **Shared Components**: `components/ui/` (shadcn/ui components)

## Environment Variables

Required in `.env.local`:
\`\`\`
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

## Database Setup

Run SQL scripts in order from `scripts/` directory:

1. Create apps and reports tables
2. Add indexes and functions
3. Enable Row Level Security
4. Register apps in the `apps` table

## Key Implementation Details

### API Endpoint (`app/api/v1/ingest/route.ts`)

- Validates bundle identifier against registered apps
- Maps CPU type codes to architecture names
- Hashes IPs with daily salt for privacy
- Returns 400 for invalid apps, 500 for errors

### Dashboard (`app/page.tsx`)

- Server-side data fetching with Supabase
- URL-based filtering (app, dateFrom, dateTo)
- Graceful error handling for each section
- Default 30-day date range

### Chart Components

- Use Tremor React for consistent styling
- Client-side only for interactivity
- Responsive design with Tailwind CSS

## Development Workflow

This is a v0.dev-managed project:

1. Make changes on v0.dev platform: https://v0.dev/chat/projects/DBgAoEiWrMO
2. Changes auto-sync to this repository
3. Vercel deploys automatically

For local development:

1. Clone the repository
2. Set up environment variables
3. Run `pnpm dev`
4. Access at http://localhost:3000

## Tailwind CSS v4 Migration

The project recently migrated to Tailwind CSS v4. Key changes:

- Updated `tailwind.config.ts` format
- Uses `@import "tailwindcss"` in globals.css
- Removed plugin dependencies (now built-in)
- Dark mode remains class-based

## Testing Sparkle Integration

To test the API endpoint locally:
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/ingest \
 -H "Content-Type: application/json" \
 -d '{
"bundle_identifier": "com.example.app",
"version": "1.0.0",
"os_version": "14.0",
"cputype": "16777228",
"cpusubtype": "2",
"model": "MacBookPro17,1",
"ncpu": "8",
"lang": "en",
"ramMB": "16384"
}'
\`\`\`

## Common Tasks

### Adding a New Chart

1. Create server data fetching in `app/page.tsx`
2. Create client component in `components/client-[name]-chart.tsx`
3. Use Tremor React components for consistency
4. Handle loading and error states

### Registering a New App

Insert into the `apps` table:
\`\`\`sql
INSERT INTO apps (name, bundle_identifier)
VALUES ('App Name', 'com.company.app');
\`\`\`

### Modifying Database Queries

1. Update RPC functions in Supabase dashboard
2. Update types in `lib/supabase/types.ts` if needed
3. Test with Supabase SQL editor first
