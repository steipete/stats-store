BEGIN;
SET LOCAL TIME ZONE 'UTC';

INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('11111111-1111-4111-8111-111111111111', 'Database test app', 'com.example.database-test');

INSERT INTO public.reports (app_id, ip_hash, app_version)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'synthetic-daily-hash', '2.1.0'),
  ('11111111-1111-4111-8111-111111111111', 'synthetic-daily-hash', '2.1.0');

SELECT public.aggregate_stats_for_app('11111111-1111-4111-8111-111111111111');

DO $$
DECLARE
  kpis JSONB;
  new_users INT;
BEGIN
  SELECT stat_data INTO STRICT kpis FROM public.stats_cache
  WHERE app_id = '11111111-1111-4111-8111-111111111111' AND stat_type = 'kpis';
  IF (kpis->>'unique_users_today')::INT IS DISTINCT FROM 1 OR (kpis->>'total_reports_today')::INT IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'KPI aggregation failed: %', kpis;
  END IF;

  SELECT COUNT(*) INTO new_users FROM public.realtime_events
  WHERE app_id = '11111111-1111-4111-8111-111111111111' AND event_type = 'new_user';
  IF new_users <> 1 THEN RAISE EXCEPTION 'Expected one new-user event, got %', new_users; END IF;
END $$;

ROLLBACK;
