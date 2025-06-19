-- Add additional indexes to improve query performance
-- These indexes support the new Sparkle telemetry columns and app matching

-- Composite index for efficient app + date range queries with new columns
CREATE INDEX IF NOT EXISTS idx_reports_app_date_version 
ON public.reports(app_id, received_at DESC, app_version);

-- Index for CPU architecture analysis including raw type
CREATE INDEX IF NOT EXISTS idx_reports_cpu_analysis 
ON public.reports(cpu_arch, cpu_type_raw, cpu_64bit);

-- Index for model identifier queries
CREATE INDEX IF NOT EXISTS idx_reports_model_identifier 
ON public.reports(model_identifier);

-- Partial index for reports with CPU frequency data
CREATE INDEX IF NOT EXISTS idx_reports_cpu_freq 
ON public.reports(cpu_freq_mhz) 
WHERE cpu_freq_mhz IS NOT NULL;

-- Index for bundle identifier lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_apps_bundle_identifier_lower 
ON public.apps(LOWER(bundle_identifier));

-- Index for display name lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_apps_display_name_lower 
ON public.apps(LOWER(display_name)) 
WHERE display_name IS NOT NULL;

-- Index for name lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_apps_name_lower 
ON public.apps(LOWER(name));

-- Composite index for reports filtering by multiple dimensions
CREATE INDEX IF NOT EXISTS idx_reports_app_os_cpu 
ON public.reports(app_id, os_version, cpu_arch);

-- Index for language distribution queries
CREATE INDEX IF NOT EXISTS idx_reports_language 
ON public.reports(language) 
WHERE language IS NOT NULL;

-- Analyze tables to update statistics for query planner
ANALYZE public.apps;
ANALYZE public.reports;