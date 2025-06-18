# App Registration Guide

## Overview

To use the stats collection endpoint at `https://stats.store/api/v1/ingest`, your application must be registered in the database first. This ensures that only authorized applications can submit statistics.

## Quick Start

1. **Access your Supabase dashboard**

   - Navigate to your Supabase project dashboard
   - Go to the Table Editor section

2. **Navigate to the apps table**

   - Find and select the `apps` table in the table list
   - This table stores all registered applications

3. **Add a new row with your app's details**

   - Click "Insert row" or the "+" button
   - Fill in the required fields:
     - `name`: Your application's display name (e.g., "My Awesome App")
     - `bundle_identifier`: Your app's unique identifier (e.g., `com.yourcompany.yourapp`)
   - Save the new entry

4. **Configure your Sparkle-enabled app**
   - Update your app's Sparkle configuration to point to the stats endpoint
   - Set the stats URL to: `https://stats.store/api/v1/ingest`
   - Ensure your app sends the correct bundle identifier with each request

## Example Bundle Identifiers

- macOS app: `com.yourcompany.yourapp`
- Beta version: `com.yourcompany.yourapp.beta`
- Pro version: `com.yourcompany.yourapp.pro`

## Important Notes

- The bundle identifier in your app must exactly match the one registered in the database
- Each app requires its own entry in the apps table
- The registration is required for security and to properly categorize incoming statistics
- Once registered, your app will immediately be able to send statistics to the endpoint

## Troubleshooting

If your app's statistics aren't showing up:

1. Verify the bundle identifier matches exactly (case-sensitive)
2. Check that the app entry is properly saved in the database
3. Ensure your Sparkle configuration is pointing to the correct endpoint
4. Review your app's logs for any connection or authentication errors
