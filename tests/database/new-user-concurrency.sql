-- dblink ships with PostgreSQL contrib and gives this test independent transactions.
CREATE EXTENSION IF NOT EXISTS dblink;
INSERT INTO public.apps (id, name, bundle_identifier)
VALUES ('88888888-8888-4888-8888-888888888888', 'Concurrent report test', 'com.example.concurrent-test');

DO $$
DECLARE
  low_id BIGINT := nextval('public.reports_id_seq');
  high_id BIGINT := nextval('public.reports_id_seq');
  lower_pid INT;
  waiting BOOLEAN := FALSE;
  user_events INT;
BEGIN
  PERFORM dblink_connect('higher_report', 'dbname=' || current_database() || ' user=' || current_user);
  PERFORM dblink_connect('lower_report', 'dbname=' || current_database() || ' user=' || current_user);
  SELECT pid INTO lower_pid FROM dblink('lower_report', 'SELECT pg_backend_pid()') AS backend(pid INT);
  PERFORM dblink_exec('higher_report', 'BEGIN');
  PERFORM dblink_exec('higher_report', format(
    'INSERT INTO public.reports (id, app_id, ip_hash) VALUES (%s, %L, %L)',
    high_id, '88888888-8888-4888-8888-888888888888', 'same-daily-client'));
  PERFORM dblink_send_query('lower_report', format(
    'INSERT INTO public.reports (id, app_id, ip_hash) VALUES (%s, %L, %L)',
    low_id, '88888888-8888-4888-8888-888888888888', 'same-daily-client'));

  -- Release the first transaction only after the other insert reaches the app lock.
  FOR attempt IN 1..500 LOOP
    PERFORM pg_stat_clear_snapshot();
    SELECT wait_event_type = 'Lock' INTO waiting FROM pg_stat_activity WHERE pid = lower_pid;
    EXIT WHEN waiting;
    PERFORM pg_sleep(0.01);
  END LOOP;
  IF NOT COALESCE(waiting, FALSE) THEN RAISE EXCEPTION 'Second insert did not reach the concurrency barrier'; END IF;
  PERFORM dblink_exec('higher_report', 'COMMIT');
  PERFORM command FROM dblink_get_result('lower_report') AS completion(command TEXT);
  PERFORM dblink_disconnect('higher_report');
  PERFORM dblink_disconnect('lower_report');

  SELECT COUNT(*) INTO user_events FROM public.realtime_events
  WHERE app_id = '88888888-8888-4888-8888-888888888888' AND event_type = 'new_user';
  IF user_events <> 1 THEN RAISE EXCEPTION 'Concurrent check-ins emitted % new-user events instead of one', user_events; END IF;
END $$;
DELETE FROM public.apps WHERE id = '88888888-8888-4888-8888-888888888888';
