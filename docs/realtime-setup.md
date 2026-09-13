# Real-time dashboard updates

Complete the [database setup](deployment.md#step-1-set-up-supabase), apply the managed migrations in order, and configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Supabase replication must include `realtime_events` and `stats_cache`.

`useRealtimeStats` subscribes immediately and owns its channel until unmount or an app change. It keeps the most recent 50 activity events and reports connection status. Supabase handles reconnection. Each consumer owns a distinct channel, including during React Strict Mode remounts.

`RealtimeDashboard` renders server-provided KPIs for the selected app and dates. Events and cache changes request a server refresh, coalesced over 500 milliseconds. The per-app, current-day cache never replaces filtered KPIs. Server refreshes also update chart data. Switching apps clears activity and cancels pending refreshes.

The footer toggles the activity panel, which remains readable while disconnected. Milestones use toast notifications when a specific app is selected. KPI values highlight when the server values change; keyboard focus exposes their explanatory tooltips.

## Database processing

A report emits an immediate new-client event when its daily hash is first seen for the app. Aggregates update on the tenth pending report or on the next report after thirty seconds; there is no idle timer. Version and milestone events share the same subscription.

To change batching or milestone thresholds, add a new migration replacing the relevant trigger function. Preserve already-applied migration files. Customize notification presentation in `components/realtime-dashboard.tsx`.

## Verification and troubleshooting

Run `pnpm dev`, select a registered test app, and send telemetry to a disposable database. The footer should show an active connection; its Activity Feed button should reveal incoming events. Select an earlier date range and verify current-day traffic does not replace historical counts.

For missing updates, inspect browser WebSocket errors, public configuration, Supabase replication, and database triggers. A disconnected footer keeps its activity controls and last update time. Database query failures remain visible in the affected dashboard sections.
