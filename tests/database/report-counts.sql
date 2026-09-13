BEGIN;
SET LOCAL TIME ZONE 'UTC';
INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('55555555-5555-4555-8555-555555555555', 'Large count test', 'com.example.large-count');
INSERT INTO public.reports (app_id, received_at, ip_hash)
SELECT '55555555-5555-4555-8555-555555555555', '2026-09-03T12:00:00Z', 'client-' || n
FROM generate_series(1, 1105) AS n;
INSERT INTO public.reports (app_id, received_at, ip_hash)
VALUES ('55555555-5555-4555-8555-555555555555', '2026-09-03T23:59:59.999999Z', 'client-1'),
       ('55555555-5555-4555-8555-555555555555', '2026-09-04T00:00:00Z', 'next-day');
DO $$
DECLARE counts RECORD;
BEGIN
  SELECT * INTO counts FROM public.get_report_counts(
    '55555555-5555-4555-8555-555555555555', '2026-09-03T00:00:00Z', '2026-09-03T00:00:00Z');
  IF counts.unique_client_days IS DISTINCT FROM 1105 OR counts.total_reports IS DISTINCT FROM 1106 THEN
    RAISE EXCEPTION 'Aggregate count is truncated or outside the requested day: %', counts;
  END IF;
END $$;
ROLLBACK;
