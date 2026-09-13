-- Calendar buckets and inclusive end days must not depend on a connection's time zone.
ALTER FUNCTION public.get_daily_report_counts(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET timezone TO 'UTC';
ALTER FUNCTION public.get_latest_app_version(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET timezone TO 'UTC';
ALTER FUNCTION public.get_os_version_distribution(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET timezone TO 'UTC';
ALTER FUNCTION public.get_cpu_architecture_distribution(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET timezone TO 'UTC';
ALTER FUNCTION public.get_top_models(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT) SET timezone TO 'UTC';
ALTER FUNCTION public.get_language_distribution(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT) SET timezone TO 'UTC';
ALTER FUNCTION public.get_ram_distribution(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET timezone TO 'UTC';
ALTER FUNCTION public.get_cpu_cores_distribution(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET timezone TO 'UTC';
ALTER FUNCTION public.get_version_adoption_timeline(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT) SET timezone TO 'UTC';
ALTER FUNCTION public.get_hourly_activity_pattern(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET timezone TO 'UTC';
ALTER FUNCTION public.update_realtime_stats() SET timezone TO 'UTC';
ALTER FUNCTION public.aggregate_stats_for_app(UUID) SET timezone TO 'UTC';
