-- Real-time statistics infrastructure for stats.store
-- This enables aggregated real-time updates for app telemetry data

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Stats cache table for pre-computed aggregates
CREATE TABLE IF NOT EXISTS public.stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
  stat_type TEXT NOT NULL, -- 'kpis', 'os_distribution', 'cpu_distribution', 'hourly_reports'
  stat_data JSONB NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_id, stat_type, period_start)
);

-- Ensure a single row for stat types that use NULL period_start (NULLs are distinct in UNIQUE constraints)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_cache_unique_null_period ON public.stats_cache(app_id, stat_type)
WHERE period_start IS NULL;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_stats_cache_lookup ON public.stats_cache(app_id, stat_type, updated_at DESC);

-- 2. Real-time event notifications table
CREATE TABLE IF NOT EXISTS public.realtime_events (
  id BIGSERIAL PRIMARY KEY,
  app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'new_user', 'milestone', 'version_update', 'report_batch'
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for recent events
CREATE INDEX IF NOT EXISTS idx_realtime_events_recent ON public.realtime_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_events_app ON public.realtime_events(app_id, created_at DESC);

-- Auto-cleanup old events (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_events() RETURNS void AS $$
BEGIN
  DELETE FROM public.realtime_events 
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 3. Aggregation state table (tracks last processed report)
CREATE TABLE IF NOT EXISTS public.aggregation_state (
  app_id UUID PRIMARY KEY REFERENCES public.apps(id) ON DELETE CASCADE,
  last_report_id BIGINT,
  last_aggregation_at TIMESTAMPTZ DEFAULT now(),
  pending_count INT DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.stats_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregation_state ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read access" ON public.stats_cache;
CREATE POLICY "Public read access" ON public.stats_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read access" ON public.realtime_events;
CREATE POLICY "Public read access" ON public.realtime_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read access" ON public.aggregation_state;
CREATE POLICY "Public read access" ON public.aggregation_state FOR SELECT USING (true);
