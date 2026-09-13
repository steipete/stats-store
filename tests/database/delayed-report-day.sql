BEGIN;
SET LOCAL TIME ZONE 'UTC';
INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Delayed report test', 'com.example.delayed-report');
INSERT INTO public.reports (app_id, received_at, ip_hash)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NOW(), 'current-day-client');
INSERT INTO public.reports (app_id, received_at, ip_hash)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '12 hours', 'previous-day-client-' || n
FROM generate_series(1, 10) AS n;
DO $$
DECLARE event_payload JSONB;
BEGIN
  SELECT event_data INTO event_payload FROM public.realtime_events
  WHERE app_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND event_type = 'new_user'
  ORDER BY id DESC LIMIT 1;
  IF (event_payload->>'unique_users_report_day')::BIGINT IS DISTINCT FROM 10
    OR (event_payload->>'total_reports_report_day')::BIGINT IS DISTINCT FROM 10
    OR (event_payload->>'unique_users_today')::BIGINT IS DISTINCT FROM 1
    OR (event_payload->>'total_reports_today')::BIGINT IS DISTINCT FROM 1
    OR event_payload->>'report_day' IS DISTINCT FROM (CURRENT_DATE - 1)::TEXT THEN
    RAISE EXCEPTION 'Report-day and legacy current-day totals must stay separate: %', event_payload;
  END IF;
  IF (SELECT COUNT(*) FROM public.realtime_events
    WHERE app_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND event_type = 'milestone'
      AND event_data->>'message' = format('10 users on %s!', CURRENT_DATE - 1)) <> 1 THEN
    RAISE EXCEPTION 'Delayed milestone must identify its report day';
  END IF;
END $$;
ROLLBACK;
