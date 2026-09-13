BEGIN;
SET LOCAL TIME ZONE 'America/New_York';

INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('33333333-3333-4333-8333-333333333333', 'UTC day test', 'com.example.utc-test');
INSERT INTO public.reports (app_id, received_at, ip_hash, app_version, os_version)
VALUES
  ('33333333-3333-4333-8333-333333333333', '2024-03-10 00:00:00+00', 'utc-start', '1.0', '14.0'),
  ('33333333-3333-4333-8333-333333333333', '2024-03-10 23:59:59.999999+00', 'utc-end', '1.0', '14.0'),
  ('33333333-3333-4333-8333-333333333333', '2024-03-11 00:00:00+00', 'next-day', '2.0', '15.0');

DO $$
DECLARE
  report_total BIGINT;
  user_total BIGINT;
BEGIN
  SELECT SUM(report_count) INTO report_total FROM public.get_daily_report_counts(
    '33333333-3333-4333-8333-333333333333', '2024-03-10 00:00:00+00', '2024-03-10 00:00:00+00');
  SELECT SUM(user_count) INTO user_total FROM public.get_os_version_distribution(
    '33333333-3333-4333-8333-333333333333', '2024-03-10 00:00:00+00', '2024-03-10 00:00:00+00');
  IF report_total IS DISTINCT FROM 2 OR user_total IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'UTC day must include both boundary reports across DST: reports %, users %', report_total, user_total;
  END IF;
END $$;
ROLLBACK;
