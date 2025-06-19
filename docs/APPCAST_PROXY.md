# Appcast Proxy Feature

Stats Store can act as a proxy for your Sparkle appcast feeds, allowing you to capture telemetry data while serving update information to your users.

## How it Works

1. Configure your app's appcast base URL in the database
2. Point Sparkle to the Stats Store proxy URL instead of your actual appcast
3. When Sparkle checks for updates, Stats Store:
   - Captures telemetry data from the request
   - Fetches the actual appcast from your configured URL
   - Returns the appcast to Sparkle

## Configuration

### 1. Add your appcast URL to the database

\`\`\`sql
UPDATE apps
SET appcast_base_url = 'https://github.com/yourname/yourrepo'
WHERE bundle_identifier = 'com.yourcompany.yourapp';
\`\`\`

### 2. Update your Sparkle configuration

Instead of pointing to your actual appcast URL, use:

\`\`\`
https://stats.store/api/v1/appcast/appcast.xml
\`\`\`

For prerelease/beta channels:

\`\`\`
https://stats.store/api/v1/appcast/appcast-prerelease.xml
\`\`\`

## URL Patterns

### GitHub Repositories

- Input: `https://github.com/owner/repo`
- Proxy converts to: `https://raw.githubusercontent.com/owner/repo/refs/heads/main/[appcast-file]`

### Direct URLs (Folder)

- Input: `https://example.com/updates`
- Proxy converts to: `https://example.com/updates/[appcast-file]`

### Direct URLs (With .xml file)

- Input: `https://example.com/downloads/appcast.xml`
- Proxy uses as-is: `https://example.com/downloads/appcast.xml`
- Smart detection prevents duplicate .xml extensions

### Domain only

- Input: `mydomain.com`
- Proxy converts to: `https://mydomain.com/[appcast-file]`

### Smart .xml Handling

The proxy intelligently handles cases where:

- The base URL already includes the `.xml` file - it won't add it again
- You're requesting a different appcast file (e.g., `appcast-beta.xml`) - it will replace the filename
- The base URL is a folder - it will append the requested appcast filename

## Testing

Use the provided test script:

\`\`\`bash
./test-appcast-proxy.sh
\`\`\`

## Example Sparkle Requests

### With System Profiling (sent once per week)

When Sparkle sends system profile data, the request includes query parameters:

\`\`\`
GET /api/v1/appcast/appcast.xml?appName=MyApp&appVersion=123&osVersion=14.0&cputype=16777228&model=MacBookPro17,1&ncpu=8&lang=en&ramMB=16384
User-Agent: MyApp/2.1.3 Sparkle/2.0.0
\`\`\`

### Without System Profiling (most requests)

Most requests come without query parameters due to privacy throttling:

\`\`\`
GET /api/v1/appcast/appcast.xml
User-Agent: MyApp/2.1.3 Sparkle/2.0.0
\`\`\`

**Important:** The proxy now intelligently handles both cases:

1. **With parameters**: Uses `bundleIdentifier` or `appName` from query params
2. **Without parameters**: Extracts app name and version from the User-Agent header
3. **Fallback chain**: bundleIdentifier → appName (params) → appName (User-Agent)

This ensures that even "naked" requests (which are the majority) can be properly identified and served the correct appcast.

## Troubleshooting

### 400 Bad Request Error

This now only occurs when the app cannot be identified at all. Check that:

1. The User-Agent header is being sent by Sparkle (it should always be present)
2. The app name in the User-Agent matches a registered app's display_name or name
3. If using custom networking, ensure the User-Agent header is preserved

### 404 Not Found Error

This occurs when:

1. The app identifier doesn't match any registered app in the database
2. The app doesn't have an `appcast_base_url` configured
3. Check that the app's `display_name` column matches what Sparkle sends
