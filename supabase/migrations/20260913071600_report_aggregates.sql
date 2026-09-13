-- Count in one database snapshot instead of truncating the client set at PostgREST's row limit.
CREATE OR REPLACE FUNCTION public.get_report_counts(
  p_app_id_filter UUID,
  p_start_date_filter TIMESTAMPTZ,
  p_end_date_filter TIMESTAMPTZ
)
RETURNS TABLE (unique_client_days BIGINT, total_reports BIGINT)
LANGUAGE sql STABLE
SET timezone TO 'UTC'
AS $$
  SELECT COUNT(DISTINCT NULLIF(r.ip_hash, '')), COUNT(*)
  FROM public.reports AS r
  WHERE (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter)
    AND r.received_at >= p_start_date_filter
    AND r.received_at < p_end_date_filter + INTERVAL '1 day';
$$;

-- This performance index also rejected otherwise valid reports with large build numbers.
-- The existing app/date/version index covers the scoped query below.
DROP INDEX IF EXISTS public.idx_reports_app_version_semver;

CREATE OR REPLACE FUNCTION public.get_latest_app_version(
  app_id_filter UUID DEFAULT NULL,
  start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
  end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TEXT
LANGUAGE sql STABLE
SET timezone TO 'UTC'
AS $$
  WITH versions AS (
    SELECT r.app_version, MAX(r.received_at) AS last_seen
    FROM public.reports AS r
    WHERE (app_id_filter IS NULL OR r.app_id = app_id_filter)
      AND r.received_at >= start_date_filter
      AND r.received_at < end_date_filter + INTERVAL '1 day'
      AND r.app_version ~ '^[0-9]+(\.[0-9]+)*$'
    GROUP BY r.app_version
  )
  SELECT v.app_version FROM versions AS v
  ORDER BY ARRAY(
    -- Digit count plus normalized decimal text preserves numeric ordering without casts.
    SELECT LPAD(LENGTH(component.value)::TEXT, 10, '0') || component.value
    FROM unnest(string_to_array(v.app_version, '.')) WITH ORDINALITY AS part(value, position)
    CROSS JOIN LATERAL (VALUES (COALESCE(NULLIF(LTRIM(part.value, '0'), ''), '0'))) AS component(value)
    ORDER BY part.position
  ) COLLATE "C" DESC, v.last_seen DESC
  LIMIT 1;
$$;

-- BEFORE sees earlier rows in the same INSERT, without mistaking future batch rows for existing clients.
CREATE OR REPLACE FUNCTION public.track_report_client() RETURNS TRIGGER
LANGUAGE plpgsql
SET timezone TO 'UTC'
AS $$
DECLARE
  v_report_day DATE := DATE(NEW.received_at);
  v_unique_clients BIGINT;
  v_reports BIGINT;
  v_users_today BIGINT;
  v_reports_today BIGINT;
BEGIN
  -- This upsert holds the app lock until commit, including through the AFTER trigger.
  INSERT INTO public.aggregation_state (app_id, last_report_id, pending_count)
  VALUES (NEW.app_id, NEW.id, 1)
  ON CONFLICT (app_id) DO UPDATE SET
    pending_count = aggregation_state.pending_count + 1,
    last_report_id = NEW.id;

  IF v_report_day IS NOT NULL AND NEW.ip_hash <> '' AND NOT EXISTS (
    SELECT 1 FROM public.reports
    WHERE app_id = NEW.app_id AND ip_hash = NEW.ip_hash AND DATE(received_at) = v_report_day
  ) THEN
    SELECT COUNT(DISTINCT NULLIF(ip_hash, '')) + 1, COUNT(*) + 1
    INTO v_unique_clients, v_reports
    FROM public.reports
    WHERE app_id = NEW.app_id AND DATE(received_at) = v_report_day;

    v_users_today := v_unique_clients;
    v_reports_today := v_reports;
    IF v_report_day <> CURRENT_DATE THEN
      SELECT COUNT(DISTINCT NULLIF(ip_hash, '')), COUNT(*)
      INTO v_users_today, v_reports_today
      FROM public.reports
      WHERE app_id = NEW.app_id AND DATE(received_at) = CURRENT_DATE;
    END IF;

    INSERT INTO public.realtime_events (app_id, event_type, event_data)
    VALUES (NEW.app_id, 'new_user', jsonb_build_object(
      'ip_hash', NEW.ip_hash,
      'app_version', NEW.app_version,
      'os_version', NEW.os_version,
      'model', NEW.model_identifier,
      'report_day', v_report_day,
      'unique_users_report_day', v_unique_clients,
      'total_reports_report_day', v_reports,
      'unique_users_today', v_users_today,
      'total_reports_today', v_reports_today
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_realtime_stats() RETURNS TRIGGER
LANGUAGE plpgsql
SET timezone TO 'UTC'
AS $$
DECLARE
  v_pending_count INT;
  v_last_aggregation TIMESTAMPTZ;
  v_last_report_id BIGINT;
  v_new_version TEXT;
BEGIN
  SELECT pending_count, last_aggregation_at, last_report_id
  INTO STRICT v_pending_count, v_last_aggregation, v_last_report_id
  FROM public.aggregation_state WHERE app_id = NEW.app_id;

  -- Check for version updates
  IF NEW.app_version IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT FROM public.reports WHERE app_id = NEW.app_id
        AND received_at >= now() - INTERVAL '7 days'
        AND app_version !~ '^[0-9]+(\.[0-9]+)*$'
    ) THEN
      v_new_version := public.get_latest_app_version(NEW.app_id, now() - INTERVAL '7 days', CURRENT_DATE);
    ELSE
      -- Preserve lexical ordering for opaque versions, independent of the arriving format.
      SELECT MAX(app_version) INTO v_new_version
      FROM public.reports
      WHERE app_id = NEW.app_id
      AND received_at >= now() - INTERVAL '7 days';
    END IF;

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

  -- A bulk INSERT is visible in full here, so aggregate it once and use the last queued ID.
  IF v_pending_count >= 10 OR v_last_aggregation IS NULL OR
     v_last_aggregation < now() - INTERVAL '30 seconds' THEN
    PERFORM public.aggregate_stats_for_app(NEW.app_id);
    UPDATE public.aggregation_state
    SET pending_count = 0, last_aggregation_at = now()
    WHERE app_id = NEW.app_id;
    INSERT INTO public.realtime_events (app_id, event_type, event_data)
    VALUES (NEW.app_id, 'report_batch', jsonb_build_object(
      'batch_size', v_pending_count,
      'latest_report_id', v_last_report_id
    ));
  END IF;
  RETURN NEW;
END;
$$;

-- Separate report-day totals preserve the legacy meaning of *_today for deployed clients.
CREATE OR REPLACE FUNCTION public.check_milestones() RETURNS TRIGGER
LANGUAGE plpgsql
SET timezone TO 'UTC'
AS $$
DECLARE
  v_total_users BIGINT;
  v_report_day DATE;
BEGIN
  IF NEW.event_type = 'new_user' THEN
    v_total_users := COALESCE(NEW.event_data->>'unique_users_report_day', NEW.event_data->>'unique_users_today')::BIGINT;
    v_report_day := COALESCE((NEW.event_data->>'report_day')::DATE, DATE(NEW.created_at));
    IF v_total_users = ANY(ARRAY[10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000]) AND NOT EXISTS (
      SELECT 1 FROM public.realtime_events AS event
      WHERE event.app_id IS NOT DISTINCT FROM NEW.app_id
        AND event.event_type = 'milestone'
        AND event.event_data->>'type' = 'user_count'
        AND event.event_data->>'value' = v_total_users::TEXT
        AND COALESCE(event.event_data->>'report_day', DATE(event.created_at)::TEXT) = v_report_day::TEXT
    ) THEN
      INSERT INTO public.realtime_events (app_id, event_type, event_data)
      VALUES (NEW.app_id, 'milestone', jsonb_build_object(
        'type', 'user_count',
        'value', v_total_users,
        'report_day', v_report_day,
        'message', CASE WHEN v_report_day = CURRENT_DATE
          THEN format('%s users today!', v_total_users)
          ELSE format('%s users on %s!', v_total_users, v_report_day)
        END
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_track_report_client ON public.reports;
CREATE TRIGGER trigger_track_report_client
BEFORE INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.track_report_client();

NOTIFY pgrst, 'reload schema';
