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

```sql
UPDATE apps 
SET appcast_base_url = 'https://github.com/yourname/yourrepo'
WHERE bundle_identifier = 'com.yourcompany.yourapp';
```

### 2. Update your Sparkle configuration

Instead of pointing to your actual appcast URL, use:
```
https://stats.store/api/v1/appcast/appcast.xml
```

For prerelease/beta channels:
```
https://stats.store/api/v1/appcast/appcast-prerelease.xml
```

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
```bash
./test-appcast-proxy.sh
```

## Example Sparkle Request

When Sparkle checks for updates, it sends a request like:
```
GET /api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app&bundleShortVersionString=1.0.0&osVersion=14.0&cputype=16777228&model=MacBookPro17,1&ncpu=8&lang=en&ramMB=16384
```

The proxy captures all these parameters for analytics while fetching and returning your actual appcast XML.