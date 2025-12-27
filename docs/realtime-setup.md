# Real-Time Analytics Setup Guide

This guide explains how to enable real-time analytics in stats.store using Supabase's real-time capabilities.

## Overview

The real-time system uses an aggregated update approach (Option 2) that provides:

- Near real-time updates (1-5 second delay)
- Efficient performance with batched updates
- Live user counts and activity feeds
- Milestone notifications
- Smooth animations for data changes

## Architecture

### Database Components

1. **`stats_cache`** - Stores pre-computed aggregates for efficient real-time updates
2. **`realtime_events`** - Tracks events like new users, milestones, and version updates
3. **`aggregation_state`** - Manages batching of updates to prevent overload
4. **Triggers** - Automatically update aggregates when new reports arrive

### Client Components

1. **`useRealtimeStats` hook** - Manages WebSocket subscriptions and state
2. **`RealtimeDashboard`** - Displays KPIs with real-time updates
3. **`RealtimeKpiCard`** - Animated card component for smooth transitions

## Setup Instructions

### 1. Run Database Migrations

Apply the Supabase migration:

\`\`\`bash
# Recommended (CLI)
supabase link --project-ref <your_project_ref>
supabase db push
\`\`\`

### 2. Configure Environment Variables

Ensure your `.env.local` includes the public Supabase keys:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
\`\`\`

### 3. Enable Realtime in Supabase

1. Go to your Supabase dashboard
2. Navigate to Database → Replication
3. Enable replication for these tables (if not already enabled by migration):
   - `realtime_events`
   - `stats_cache`

### 4. Test the Setup

1. Start your development server: `pnpm dev`
2. Open the dashboard
3. Look for the green "Real-time updates active" indicator
4. Send test reports to your API endpoint to see live updates

## How It Works

### Report Processing Flow

1. App sends telemetry report to `/api/v1/ingest`
2. Report is inserted into `reports` table
3. Trigger function checks if it's a new user
4. Aggregates are updated every 10 reports or 30 seconds
5. Events are broadcast to subscribed clients
6. Dashboard updates automatically with animations

### Batching Logic

Updates are batched to balance real-time feel with performance:

- Immediate updates for new users
- Batch updates every 10 reports
- Force update if 30 seconds have passed
- Milestone notifications at key user counts

## Features

### Live Activity Feed

- Shows recent app check-ins
- Displays new users with version and device info
- Highlights milestones (10, 50, 100, 500+ users)

### Animated KPIs

- Smooth transitions when values change
- Pulsing indicator for real-time connection
- Flash animation on updates

### Connection Status

- Visual indicator of WebSocket connection
- Last update timestamp
- Activity feed toggle

## Customization

### Adjust Update Frequency

In `supabase/migrations/20251227125800_realtime_tables_and_triggers.sql`, modify:

\`\`\`sql
-- Change batch size (default: 10)
IF v_pending_count >= 10 OR

-- Change time interval (default: 30 seconds)
v_last_aggregation < now() - INTERVAL '30 seconds' THEN
\`\`\`

### Add Custom Milestones

Edit the milestones array in the trigger:

\`\`\`sql
v_milestones INT[] := ARRAY[10, 50, 100, 500, 1000, 5000, 10000];
\`\`\`

### Customize Notifications

Modify toast notifications in `components/realtime-dashboard-wrapper.tsx`:

\`\`\`typescript
onNewUser: (event) => {
toast.success(`New user detected!`, {
description: `App version: ${event.event_data.app_version}`,
icon: <SparklesIcon className="h-4 w-4" />,
})
}
\`\`\`

## Troubleshooting

### No Real-time Updates

1. Check browser console for WebSocket errors
2. Verify environment variables are set correctly
3. Ensure Supabase replication is enabled
4. Check that triggers were created successfully

### Performance Issues

1. Increase batch size in trigger function
2. Reduce update frequency
3. Limit activity feed to fewer events
4. Consider implementing Option 3 (Edge Functions) for high traffic

### Connection Drops

1. Check Supabase service status
2. Implement reconnection logic in the hook
3. Monitor WebSocket connection state

## Future Enhancements

- Real-time charts with smooth animations
- Live geographic distribution map
- Push notifications for milestones
- Historical playback of activity
- Multi-app comparison views
