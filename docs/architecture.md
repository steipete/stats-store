# Architecture & Technical Documentation

This document covers the technical implementation details of stats.store.

## System Architecture

stats.store is built on a modern serverless architecture:

- **Frontend & Backend**: Next.js application hosted on Vercel
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Authentication**: Supabase Auth (currently admin-only)
- **Deployment**: Automatic via v0.dev → GitHub → Vercel

## Data Flow

### Appcast Proxy Flow (Primary Method)

\`\`\`mermaid
graph LR
A[Mac App] -->|Update Check| B[stats.store/api/v1/appcast]
B -->|1. Log Stats| C[Supabase DB]
B -->|2. Fetch| D[Original Appcast URL]
D -->|3. Return| B
B -->|4. Serve| A
\`\`\`

1. **App checks for updates**: Sparkle sends a request to stats.store instead of the original URL
2. **stats.store logs the request**: Extracts system info from Sparkle's query parameters
3. **Fetches original appcast**: Uses the `appcast_base_url` stored in the database
4. **Returns appcast to app**: Transparent to the user - updates work normally

### Direct Ingest Flow (Alternative)

For apps that want more control, there's also a direct API endpoint:

\`\`\`mermaid
graph LR
A[Mac App] -->|POST| B[stats.store/api/v1/ingest]
B -->|Validate & Store| C[Supabase DB]
\`\`\`

## Database Schema

### Core Tables

#### `apps` Table

Stores registered applications:

\`\`\`sql
CREATE TABLE public.apps (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL UNIQUE,
bundle_identifier TEXT NOT NULL UNIQUE,
appcast_base_url TEXT, -- GitHub URL for appcast proxy
created_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

#### `reports` Table

Stores sanitized telemetry data:

\`\`\`sql
CREATE TABLE public.reports (
id BIGSERIAL PRIMARY KEY,
app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
received_at TIMESTAMPTZ DEFAULT now(),
ip_hash TEXT NOT NULL, -- SHA-256(IP + daily salt)
app_version TEXT,
os_version TEXT,
cpu_arch TEXT, -- 'arm64' or 'x86_64'
core_count INT,
language TEXT,
model_identifier TEXT, -- e.g., "MacBookPro17,1"
ram_mb INT
);
\`\`\`

### Real-Time Tables (New)

#### `stats_cache` Table

Pre-computed aggregates for real-time performance:

\`\`\`sql
CREATE TABLE public.stats_cache (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
stat_type TEXT NOT NULL, -- 'kpis', 'os_distribution', etc.
stat_data JSONB NOT NULL,
period_start TIMESTAMPTZ,
period_end TIMESTAMPTZ,
updated_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

#### `realtime_events` Table

Tracks events for live updates:

\`\`\`sql
CREATE TABLE public.realtime_events (
id BIGSERIAL PRIMARY KEY,
app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
event_type TEXT NOT NULL, -- 'new_user', 'milestone', etc.
event_data JSONB NOT NULL,
created_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

## API Documentation

### POST `/api/v1/ingest`

Direct telemetry endpoint for apps that want to send data explicitly.

**Request:**
\`\`\`json
{
"bundleIdentifier": "com.example.app",
"appVersion": "1.0.0",
"osVersion": "14.0",
"cputype": "16777228", // Sparkle CPU type code
"ncpu": "8",
"lang": "en",
"model": "MacBookPro17,1",
"ramMB": "16384"
}
\`\`\`

**Response:**

- `201 Created` - Success
- `400 Bad Request` - Invalid data
- `500 Internal Server Error` - Server error

### GET `/api/v1/appcast/[...path]`

Appcast proxy endpoint. This is where the magic happens!

**URL Structure:**
\`\`\`
https://stats.store/api/v1/appcast/appcast.xml?[sparkle-parameters]
\`\`\`

**Sparkle Parameters (automatically sent by Sparkle):**

- `bundleIdentifier` - App's bundle ID
- `version` - Current app version
- `os` - macOS version
- `cputype` & `cpusubtype` - CPU architecture info
- `model` - Mac model identifier
- `ncpu` - Number of CPU cores
- `lang` - System language
- `ramMB` - RAM in megabytes

**How It Works:**

1. **Extract bundle ID** from query parameters
2. **Look up app** in database to get `appcast_base_url`
3. **Log telemetry** data to reports table
4. **Construct real URL**:
   - Base: `https://raw.githubusercontent.com/user/repo/main/`
   - - Path: `appcast.xml`
5. **Fetch and return** the original appcast

**Example Flow:**
\`\`\`
App requests: https://stats.store/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app
We fetch: https://raw.githubusercontent.com/example/app/main/appcast.xml
\`\`\`

## Privacy & Security Implementation

### IP Address Handling

IPs are never stored. Instead:

\`\`\`typescript
const dailySalt = format(new Date(), 'yyyy-MM-dd')
const ipHash = sha256(ip + dailySalt)
\`\`\`

This means:

- Same user = same hash (for that day only)
- Next day = completely different hash
- Impossible to reverse to get original IP

### Data Sanitization

All incoming data is validated and sanitized:

- Bundle IDs must match registered apps
- Version strings are validated
- Numeric values are bounds-checked
- No arbitrary data is stored

## Real-Time Architecture

### Trigger-Based Updates

Database triggers automatically update aggregates:

\`\`\`sql
-- After new report insert:
-- 1. Check if new unique user
-- 2. Update stats cache if needed
-- 3. Emit real-time events
-- 4. Check for milestones
\`\`\`

### WebSocket Subscriptions

Clients subscribe to changes via Supabase Realtime:

\`\`\`typescript
supabase
.channel('app-stats')
.on('postgres_changes', {
event: 'INSERT',
schema: 'public',
table: 'realtime_events'
}, handleRealtimeUpdate)
.subscribe()
\`\`\`

## Performance Optimizations

### Database Indexes

\`\`\`sql
CREATE INDEX idx_reports_app_id_received_at
ON public.reports(app_id, received_at DESC);
CREATE INDEX idx_reports_os_version
ON public.reports(os_version);
CREATE INDEX idx_reports_cpu_arch
ON public.reports(cpu_arch);
\`\`\`

### Caching Strategy

- **Real-time stats**: Updated via triggers, cached in `stats_cache`
- **Historical data**: Computed on-demand with appropriate indexes
- **Appcast responses**: Could add CDN caching if needed

## Development Workflow

### Project Structure

\`\`\`
stats-store/
├── app/ # Next.js App Router
│ ├── api/v1/ # API endpoints
│ │ ├── ingest/ # Direct telemetry
│ │ └── appcast/ # Proxy endpoint
│ ├── page.tsx # Dashboard (server component)
│ └── globals.css # Tailwind styles
├── components/  
│ ├── ui/ # shadcn/ui components
│ ├── client-_.tsx # Client-side charts
│ └── realtime-_.tsx # Real-time components
├── hooks/ # Custom React hooks
├── lib/  
│ ├── supabase/ # Database client
│ └── utils.ts # Helpers
├── scripts/ # SQL migrations
└── tests/ # Vitest tests
\`\`\`

### Testing Strategy

- **Unit tests**: Components and utilities
- **Integration tests**: API endpoints
- **Database tests**: SQL function validation
- **E2E tests**: Full user flows (planned)

## Deployment

### Environment Variables

\`\`\`env

# Required for all environments

SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-key]

# Required for client-side real-time

NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
\`\`\`

### Vercel Configuration

- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Node Version**: 20.x
- **Environment**: Copy all env vars

### Database Migrations

Run scripts in order:

1. Create tables (`01-*.sql` through `05-*.sql`)
2. Add indexes (`06-*.sql`)
3. Create functions (`07-*.sql` through `09-*.sql`)
4. Add appcast support (`10-*.sql`, `11-*.sql`)
5. Enable real-time (`12-*.sql`, `13-*.sql`)

## Monitoring & Debugging

### Useful Queries

**Daily active users:**
\`\`\`sql
SELECT DATE(received_at) as day, COUNT(DISTINCT ip_hash) as users
FROM reports
WHERE app_id = '[app-id]'
GROUP BY day
ORDER BY day DESC;
\`\`\`

**Version adoption:**
\`\`\`sql
SELECT app_version, COUNT(DISTINCT ip_hash) as users
FROM reports
WHERE app_id = '[app-id]'
AND received_at > NOW() - INTERVAL '30 days'
GROUP BY app_version
ORDER BY users DESC;
\`\`\`

### Common Issues

**"Invalid application" errors:**

- Check `apps` table has entry for bundle ID
- Verify bundle ID matches exactly (case-sensitive)

**Appcast proxy 404s:**

- Ensure `appcast_base_url` is set correctly
- Test the constructed URL directly
- Check for branch name (main vs master)

**Real-time not working:**

- Enable replication in Supabase dashboard
- Check WebSocket connection in browser console
- Verify environment variables are set
