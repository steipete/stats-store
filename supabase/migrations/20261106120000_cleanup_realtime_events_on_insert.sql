-- cleanup_old_events() existed, but nothing called it.
-- Run it after each insert so rows older than 24 hours do not stay forever.

CREATE OR REPLACE FUNCTION public.cleanup_realtime_events_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.cleanup_old_events();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS realtime_events_cleanup ON public.realtime_events;
CREATE TRIGGER realtime_events_cleanup
AFTER INSERT ON public.realtime_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_realtime_events_on_insert();
