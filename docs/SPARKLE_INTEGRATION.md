# Sparkle Integration Guide

This stats-store application provides an API endpoint to collect update statistics from macOS applications using the Sparkle framework.

## API Endpoint

\`\`\`
POST https://stats.store/api/v1/ingest
\`\`\`

## Request Format

The endpoint expects a JSON payload with the following structure:

\`\`\`json
{
  "bundleIdentifier": "com.company.appname",  // Required
  "appVersion": "2.1.0",                      // Optional
  "osVersion": "14.2",                        // Optional
  "cputype": "16777228",                      // Optional (16777228 = arm64, 16777223 = x86_64)
  "ncpu": "8",                                // Optional
  "lang": "en",                               // Optional
  "model": "MacBookPro18,3",                  // Optional
  "ramMB": "16384"                            // Optional
}
\`\`\`

## Setting Up Your App

1. **Register Your App**: First, ensure your app's bundle identifier is registered in the database:
   - Access your Supabase dashboard
   - Add your app to the `apps` table with its `bundle_identifier`

2. **Configure Sparkle**: In your macOS app's Sparkle configuration, set the update check URL to include this stats endpoint.

3. **Privacy**: The API automatically hashes IP addresses with a daily salt for privacy. No personally identifiable information is stored.

## Response Codes

- `201 Created`: Report successfully received
- `400 Bad Request`: Missing required fields or invalid JSON
- `403 Forbidden`: Unknown bundle identifier
- `500 Internal Server Error`: Database error

## Example Integration

For a custom Sparkle delegate implementation:

\`\`\`swift
func updater(_ updater: SPUUpdater, willCheckForUpdates: SPUUpdateCheck) {
    // Send stats to stats.store
    let statsURL = URL(string: "https://stats.store/api/v1/ingest")!
    var request = URLRequest(url: statsURL)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let payload: [String: Any] = [
        "bundleIdentifier": Bundle.main.bundleIdentifier ?? "",
        "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "",
        "osVersion": ProcessInfo.processInfo.operatingSystemVersionString,
        // Add other system info as needed
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
    
    URLSession.shared.dataTask(with: request).resume()
}
\`\`\`

## Testing

You can test the endpoint with curl:

\`\`\`bash
curl -X POST https://stats.store/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "bundleIdentifier": "com.example.testapp",
    "appVersion": "1.0.0",
    "osVersion": "14.2"
  }'
\`\`\`

## Data Collected

The stats-store dashboard displays:
- Unique users (based on hashed IPs)
- Total update checks
- OS version distribution
- CPU architecture breakdown (Intel vs Apple Silicon)
- Top device models
- Installation trends over time

All data is aggregated and anonymous.
