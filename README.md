# Stats Store

A privacy-focused analytics dashboard for Sparkle-enabled macOS applications. Track app usage, version distribution, and system metrics without compromising user privacy.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/amantus/v0-stats-store)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/DBgAoEiWrMO)

## Features

- 📊 **Real-time Analytics** - Track unique users, update checks, and version adoption
- 🔒 **Privacy-First** - IP addresses are hashed daily, no personal data stored
- 🚀 **Sparkle Integration** - Drop-in replacement for Sparkle update checks
- 📡 **Appcast Proxy** - Serve appcasts while capturing telemetry data
- 📈 **Beautiful Dashboard** - Clean, responsive UI built with Next.js and Tremor
- 🌍 **Multi-App Support** - Track multiple applications from one dashboard

## Quick Start

### Prerequisites

- Node.js 20.0+ and pnpm
- Supabase account (free tier works)
- Sparkle-enabled macOS app

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/stats-store.git
cd stats-store
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Set up the database:

```bash
# Run each SQL script in order from the scripts/ directory
# in your Supabase SQL editor
```

4. Start the development server:

```bash
pnpm dev
```

## Sparkle Integration

### Method 1: Direct Telemetry (Recommended for New Apps)

Add Stats Store as an additional endpoint in your app's network requests:

```swift
// After Sparkle update check
let telemetryURL = URL(string: "https://stats.store/api/v1/ingest")!
var request = URLRequest(url: telemetryURL)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let telemetryData = [
    "bundleIdentifier": Bundle.main.bundleIdentifier,
    "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"],
    "osVersion": ProcessInfo.processInfo.operatingSystemVersionString,
    // ... other metrics
]

request.httpBody = try JSONSerialization.data(withJSONObject: telemetryData)
URLSession.shared.dataTask(with: request).resume()
```

### Method 2: Appcast Proxy (Zero Code Changes)

1. Add your appcast URL to the database:

```sql
UPDATE apps
SET appcast_base_url = 'https://github.com/yourusername/yourapp'
WHERE bundle_identifier = 'com.yourcompany.yourapp';
```

2. Update your app's Sparkle configuration:

```xml
<!-- Old -->
<key>SUFeedURL</key>
<string>https://raw.githubusercontent.com/yourusername/yourapp/main/appcast.xml</string>

<!-- New -->
<key>SUFeedURL</key>
<string>https://stats.store/api/v1/appcast/appcast.xml</string>
```

Stats Store will proxy your appcast while capturing telemetry data automatically.

## Database Schema

### Apps Table

```sql
CREATE TABLE apps (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  bundle_identifier TEXT NOT NULL UNIQUE,
  appcast_base_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Reports Table

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES apps(id),
  ip_hash TEXT NOT NULL,
  app_version TEXT,
  os_version TEXT,
  cpu_arch TEXT,
  core_count INTEGER,
  language TEXT,
  model_identifier TEXT,
  ram_mb INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## API Endpoints

### POST /api/v1/ingest

Receives telemetry data from Sparkle apps.

**Request Body:**

```json
{
  "bundleIdentifier": "com.example.app",
  "appVersion": "1.0.0",
  "osVersion": "14.0",
  "cputype": "16777228",
  "ncpu": "8",
  "lang": "en",
  "model": "MacBookPro17,1",
  "ramMB": "16384"
}
```

### GET /api/v1/appcast/[...path]

Proxies appcast requests while capturing telemetry.

**URL Parameters:**

- Standard Sparkle query parameters (bundleIdentifier, version, etc.)

**Example:**

```
https://stats.store/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app&version=1.0.0
```

## Development

### Running Tests

```bash
pnpm test        # Run tests
pnpm test:ui     # Run tests with UI
pnpm test:watch  # Run tests in watch mode
```

### Linting & Formatting

```bash
pnpm lint        # Run ESLint
pnpm format      # Format with Prettier
pnpm typecheck   # Run TypeScript checks
```

### Project Structure

```
stats-store/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── v1/
│   │       ├── ingest/    # Telemetry endpoint
│   │       └── appcast/   # Appcast proxy
│   └── page.tsx           # Dashboard UI
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── client-*.tsx      # Client-side chart components
├── lib/                   # Utilities
│   └── supabase/         # Database client
├── scripts/              # SQL migrations
└── tests/                # Test files
```

## Deployment

This project is automatically deployed via v0.dev:

**Live URL:** [https://vercel.com/amantus/v0-stats-store](https://vercel.com/amantus/v0-stats-store)

**Continue development:** [https://v0.dev/chat/projects/DBgAoEiWrMO](https://v0.dev/chat/projects/DBgAoEiWrMO)

### Self-Hosting

1. Build the project:

```bash
pnpm build
```

2. Set environment variables
3. Start the server:

```bash
pnpm start
```

## Privacy & Security

- **IP Hashing**: IPs are hashed with a daily salt, making them impossible to reverse
- **No Personal Data**: We don't collect names, emails, or any identifiable information
- **Data Retention**: Configure your own retention policies in Supabase
- **Open Source**: Audit the code yourself

## Configuration

### Environment Variables

| Variable                    | Description               | Required |
| --------------------------- | ------------------------- | -------- |
| `SUPABASE_URL`              | Your Supabase project URL | Yes      |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key    | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes      |

### Dashboard Filters

The dashboard supports URL-based filtering:

- `?app=bundle.identifier` - Filter by app
- `?dateFrom=2024-01-01` - Start date
- `?dateTo=2024-12-31` - End date

Example: `https://stats.store/?app=com.example.app&dateFrom=2024-01-01`

## Troubleshooting

### Common Issues

**"Invalid or unknown application" error**

- Ensure your app is registered in the `apps` table
- Check the bundle identifier matches exactly

**Appcast proxy returns 404**

- Verify `appcast_base_url` is set for your app
- Check the appcast file exists at the source URL

**No data showing in dashboard**

- Allow 24 hours for initial data collection
- Verify your app is sending telemetry correctly
- Check Supabase logs for any errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built for the [Sparkle](https://sparkle-project.org/) update framework
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Charts powered by [Tremor React](https://tremor.so/)
- Database by [Supabase](https://supabase.com/)
