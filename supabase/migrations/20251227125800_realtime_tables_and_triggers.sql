-- Migration: real-time statistics infra for stats.store
-- Source: scripts/12-create-realtime-tables.sql + scripts/13-create-realtime-triggers.sql

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

-- Enable change feeds for Supabase Realtime (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'realtime_events'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_events';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stats_cache'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.stats_cache';
    END IF;
  END IF;
END $$;

-- Trigger functions for real-time statistics updates

-- Function to update aggregated stats after new reports
CREATE OR REPLACE FUNCTION update_realtime_stats() RETURNS TRIGGER AS $$
DECLARE
  v_pending_count INT;
  v_should_aggregate BOOLEAN := FALSE;
  v_last_aggregation TIMESTAMPTZ;
  v_unique_users_today INT;
  v_total_reports_today INT;
  v_new_version TEXT;
  v_is_new_user BOOLEAN := FALSE;
BEGIN
  -- Check if this is a new unique user today
  SELECT NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE app_id = NEW.app_id
    AND ip_hash = NEW.ip_hash
    AND DATE(received_at) = DATE(NEW.received_at)
    AND id < NEW.id
  ) INTO v_is_new_user;

  -- Update aggregation state
  INSERT INTO public.aggregation_state (app_id, last_report_id, pending_count)
  VALUES (NEW.app_id, NEW.id, 1)
  ON CONFLICT (app_id) DO UPDATE
  SET
    pending_count = aggregation_state.pending_count + 1,
    last_report_id = NEW.id
  RETURNING pending_count, last_aggregation_at
  INTO v_pending_count, v_last_aggregation;

  -- Decide if we should aggregate (every 10 reports or 30 seconds)
  IF v_pending_count >= 10 OR
     v_last_aggregation IS NULL OR
     v_last_aggregation < now() - INTERVAL '30 seconds' THEN
    v_should_aggregate := TRUE;
  END IF;

  -- If this is a new user, always trigger an event
  IF v_is_new_user THEN
    -- Get current stats for the event
    SELECT COUNT(DISTINCT ip_hash), COUNT(*)
    INTO v_unique_users_today, v_total_reports_today
    FROM public.reports
    WHERE app_id = NEW.app_id
    AND DATE(received_at) = CURRENT_DATE;

    INSERT INTO public.realtime_events (app_id, event_type, event_data)
    VALUES (
      NEW.app_id,
      'new_user',
      jsonb_build_object(
        'ip_hash', NEW.ip_hash,
        'app_version', NEW.app_version,
        'os_version', NEW.os_version,
        'model', NEW.model_identifier,
        'unique_users_today', v_unique_users_today,
        'total_reports_today', v_total_reports_today
      )
    );
  END IF;

  -- Check for version updates
  IF NEW.app_version IS NOT NULL THEN
    SELECT MAX(app_version) INTO v_new_version
    FROM public.reports
    WHERE app_id = NEW.app_id
    AND received_at >= now() - INTERVAL '7 days';

    IF v_new_version = NEW.app_version THEN
      -- Check if this version is newly seen
      IF NOT EXISTS (
        SELECT 1 FROM public.stats_cache
        WHERE app_id = NEW.app_id
        AND stat_type = 'latest_version'
        AND stat_data->>'version' = NEW.app_version
      ) THEN
        -- Update latest version cache
        INSERT INTO public.stats_cache (app_id, stat_type, stat_data)
        VALUES (NEW.app_id, 'latest_version', jsonb_build_object('version', NEW.app_version))
        ON CONFLICT (app_id, stat_type) WHERE period_start IS NULL
        DO UPDATE SET
          stat_data = jsonb_build_object('version', NEW.app_version),
          updated_at = now();

        -- Emit version update event
        INSERT INTO public.realtime_events (app_id, event_type, event_data)
        VALUES (
          NEW.app_id,
          'version_update',
          jsonb_build_object('new_version', NEW.app_version)
        );
      END IF;
    END IF;
  END IF;

  -- Perform aggregation if needed
  IF v_should_aggregate THEN
    PERFORM aggregate_stats_for_app(NEW.app_id);

    -- Reset pending count
    UPDATE public.aggregation_state
    SET pending_count = 0, last_aggregation_at = now()
    WHERE app_id = NEW.app_id;

    -- Emit batch update event
    INSERT INTO public.realtime_events (app_id, event_type, event_data)
    VALUES (
      NEW.app_id,
      'report_batch',
      jsonb_build_object(
        'batch_size', v_pending_count,
        'latest_report_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to perform the actual aggregation
CREATE OR REPLACE FUNCTION aggregate_stats_for_app(p_app_id UUID) RETURNS VOID AS $$
DECLARE
  v_kpis JSONB;
  v_os_dist JSONB;
  v_cpu_dist JSONB;
  v_hourly_stats JSONB;
BEGIN
  -- Calculate KPIs for today
  SELECT jsonb_build_object(
    'unique_users_today', COUNT(DISTINCT ip_hash),
    'total_reports_today', COUNT(*),
    'last_update', now()
  ) INTO v_kpis
  FROM public.reports
  WHERE app_id = p_app_id
  AND DATE(received_at) = CURRENT_DATE;

  -- Update KPIs cache
  INSERT INTO public.stats_cache (app_id, stat_type, stat_data, period_start, period_end)
  VALUES (p_app_id, 'kpis', v_kpis, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
  ON CONFLICT (app_id, stat_type, period_start)
  DO UPDATE SET
    stat_data = v_kpis,
    updated_at = now();

  -- Calculate OS distribution for last 30 days
  SELECT jsonb_agg(
    jsonb_build_object(
      'os_version', os_version,
      'count', user_count
    ) ORDER BY user_count DESC
  ) INTO v_os_dist
  FROM (
    SELECT os_version, COUNT(DISTINCT ip_hash) as user_count
    FROM public.reports
    WHERE app_id = p_app_id
    AND received_at >= now() - INTERVAL '30 days'
    AND os_version IS NOT NULL
    GROUP BY os_version
    LIMIT 10
  ) os_stats;

  -- Update OS distribution cache
  IF v_os_dist IS NOT NULL THEN
    INSERT INTO public.stats_cache (app_id, stat_type, stat_data)
    VALUES (p_app_id, 'os_distribution', v_os_dist)
    ON CONFLICT (app_id, stat_type) WHERE period_start IS NULL
    DO UPDATE SET
      stat_data = v_os_dist,
      updated_at = now();
  END IF;

  -- Calculate CPU distribution for last 30 days
  SELECT jsonb_agg(
    jsonb_build_object(
      'cpu_arch', cpu_arch,
      'count', user_count
    ) ORDER BY user_count DESC
  ) INTO v_cpu_dist
  FROM (
    SELECT cpu_arch, COUNT(DISTINCT ip_hash) as user_count
    FROM public.reports
    WHERE app_id = p_app_id
    AND received_at >= now() - INTERVAL '30 days'
    AND cpu_arch IS NOT NULL
    GROUP BY cpu_arch
  ) cpu_stats;

  -- Update CPU distribution cache
  IF v_cpu_dist IS NOT NULL THEN
    INSERT INTO public.stats_cache (app_id, stat_type, stat_data)
    VALUES (p_app_id, 'cpu_distribution', v_cpu_dist)
    ON CONFLICT (app_id, stat_type) WHERE period_start IS NULL
    DO UPDATE SET
      stat_data = v_cpu_dist,
      updated_at = now();
  END IF;

  -- Calculate hourly stats for today
  SELECT jsonb_agg(
    jsonb_build_object(
      'hour', hour,
      'count', report_count
    ) ORDER BY hour
  ) INTO v_hourly_stats
  FROM (
    SELECT
      EXTRACT(HOUR FROM received_at) as hour,
      COUNT(*) as report_count
    FROM public.reports
    WHERE app_id = p_app_id
    AND DATE(received_at) = CURRENT_DATE
    GROUP BY EXTRACT(HOUR FROM received_at)
  ) hourly;

  -- Update hourly stats cache
  IF v_hourly_stats IS NOT NULL THEN
    INSERT INTO public.stats_cache (app_id, stat_type, stat_data, period_start)
    VALUES (p_app_id, 'hourly_reports', v_hourly_stats, CURRENT_DATE)
    ON CONFLICT (app_id, stat_type, period_start)
    DO UPDATE SET
      stat_data = v_hourly_stats,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_realtime_stats ON public.reports;
CREATE TRIGGER trigger_update_realtime_stats
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION update_realtime_stats();

-- Function to check for milestones
CREATE OR REPLACE FUNCTION check_milestones() RETURNS TRIGGER AS $$
DECLARE
  v_total_users INT;
  v_milestones INT[] := ARRAY[10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
  v_milestone INT;
BEGIN
  -- Only check on new_user events
  IF NEW.event_type = 'new_user' THEN
    v_total_users := (NEW.event_data->>'unique_users_today')::INT;

    -- Check if we hit a milestone
    FOREACH v_milestone IN ARRAY v_milestones LOOP
      IF v_total_users = v_milestone THEN
        INSERT INTO public.realtime_events (app_id, event_type, event_data)
        VALUES (
          NEW.app_id,
          'milestone',
          jsonb_build_object(
            'type', 'user_count',
            'value', v_milestone,
            'message', format('%s users today!', v_milestone)
          )
        );
        EXIT; -- Only emit one milestone event
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create milestone trigger
DROP TRIGGER IF EXISTS trigger_check_milestones ON public.realtime_events;
CREATE TRIGGER trigger_check_milestones
AFTER INSERT ON public.realtime_events
FOR EACH ROW
EXECUTE FUNCTION check_milestones();
