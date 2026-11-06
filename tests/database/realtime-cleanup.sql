BEGIN;
SET LOCAL TIME ZONE 'UTC';

INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Cleanup test app', 'com.example.cleanup-test');

INSERT INTO public.realtime_events (app_id, event_type, event_data, created_at)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'report_batch',
    '{"age":"old"}'::jsonb,
    now() - INTERVAL '25 hours'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'report_batch',
    '{"age":"new"}'::jsonb,
    now()
  );

DO $$
DECLARE
  old_rows INT;
  new_rows INT;
BEGIN
  SELECT COUNT(*) INTO old_rows FROM public.realtime_events
  WHERE app_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND event_data->>'age' = 'old';
  IF old_rows <> 0 THEN
    RAISE EXCEPTION 'expected the 25 hour event to be deleted, got %', old_rows;
  END IF;

  SELECT COUNT(*) INTO new_rows FROM public.realtime_events
  WHERE app_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND event_data->>'age' = 'new';
  IF new_rows <> 1 THEN
    RAISE EXCEPTION 'expected the new event to remain, got %', new_rows;
  END IF;
END $$;

ROLLBACK;
