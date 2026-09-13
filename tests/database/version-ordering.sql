BEGIN;
SET LOCAL TIME ZONE 'UTC';
INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('66666666-6666-4666-8666-666666666666', 'Version order test', 'com.example.version-order');
INSERT INTO public.reports (app_id, ip_hash, app_version)
VALUES ('66666666-6666-4666-8666-666666666666', 'version-client', '1.9'),
       ('66666666-6666-4666-8666-666666666666', 'version-client', '1.10'),
       ('66666666-6666-4666-8666-666666666666', 'version-client', '1.0009');
DO $$ BEGIN
  IF (SELECT stat_data->>'version' FROM public.stats_cache
      WHERE app_id = '66666666-6666-4666-8666-666666666666' AND stat_type = 'latest_version') IS DISTINCT FROM '1.10' THEN
    RAISE EXCEPTION 'Realtime numeric version ordering differs from the dashboard';
  END IF;
END $$;

INSERT INTO public.reports (app_id, ip_hash, app_version)
VALUES ('66666666-6666-4666-8666-666666666666', 'version-client', '1.2147483648'),
       ('66666666-6666-4666-8666-666666666666', 'version-client', '1.' || repeat('9', 100));
DO $$ BEGIN
  IF public.get_latest_app_version('66666666-6666-4666-8666-666666666666', CURRENT_DATE, CURRENT_DATE) IS DISTINCT FROM '1.' || repeat('9', 100) THEN
    RAISE EXCEPTION 'Large version components are not ordered numerically';
  END IF;
END $$;

INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('77777777-7777-4777-8777-777777777777', 'Opaque version test', 'com.example.opaque-version');
INSERT INTO public.reports (app_id, ip_hash, app_version)
VALUES ('77777777-7777-4777-8777-777777777777', 'opaque-client', 'preview-build');
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM public.realtime_events WHERE app_id = '77777777-7777-4777-8777-777777777777'
    AND event_type = 'version_update' AND event_data->>'new_version' = 'preview-build') THEN
    RAISE EXCEPTION 'Opaque version notifications must remain supported';
  END IF;
END $$;
-- Repeated mixed-format reports must not alternate the cached winner or emit duplicate updates.
INSERT INTO public.reports (app_id, ip_hash, app_version)
SELECT '77777777-7777-4777-8777-777777777777', 'mixed-client', version
FROM unnest(ARRAY['1.10', 'preview-build', '1.10', 'preview-build']) AS version;
DO $$ BEGIN
  IF (SELECT COUNT(*) FROM public.realtime_events
    WHERE app_id = '77777777-7777-4777-8777-777777777777' AND event_type = 'version_update') <> 1
    OR (SELECT stat_data->>'version' FROM public.stats_cache
      WHERE app_id = '77777777-7777-4777-8777-777777777777' AND stat_type = 'latest_version') IS DISTINCT FROM 'preview-build' THEN
    RAISE EXCEPTION 'Mixed formats must keep a stable winner';
  END IF;
END $$;
ROLLBACK;
