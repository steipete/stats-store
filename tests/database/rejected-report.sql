BEGIN;
INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Rejected report test', 'com.example.rejected-report');
DO $$
DECLARE existing_id BIGINT;
BEGIN
  INSERT INTO public.reports (app_id, ip_hash)
  VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'accepted-client') RETURNING id INTO existing_id;
  BEGIN
    INSERT INTO public.reports (id, app_id, ip_hash)
    VALUES (existing_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rejected-client');
    RAISE EXCEPTION 'Duplicate report ID unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  IF EXISTS (SELECT FROM public.realtime_events WHERE app_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    AND event_data->>'ip_hash' = 'rejected-client') THEN
    RAISE EXCEPTION 'Rejected report leaked a new-user event';
  END IF;
  IF (SELECT pending_count FROM public.aggregation_state WHERE app_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Rejected report changed aggregation state';
  END IF;
END $$;
ROLLBACK;
