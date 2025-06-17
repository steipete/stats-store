-- Index on apps.name for faster sorting/lookup of app names
CREATE INDEX IF NOT EXISTS idx_apps_name ON public.apps(name);

-- Index on reports.model_identifier for "Top Models" chart
CREATE INDEX IF NOT EXISTS idx_reports_model_identifier ON public.reports(model_identifier) WHERE model_identifier IS NOT NULL;

-- Functional index for semantic version sorting on reports.app_version
-- This helps the get_latest_app_version function perform much faster.
-- It indexes the integer array representation of the version string.
CREATE INDEX IF NOT EXISTS idx_reports_app_version_semver ON public.reports ((string_to_array(app_version, '.')::INT[]))
WHERE app_version IS NOT NULL AND app_version ~ '^[0-9]+(\.[0-9]+)*$';

-- Consider composite indexes if specific combined queries are very frequent and slow.
-- For example, if filtering by app_id and then grouping by os_version is common:
-- CREATE INDEX IF NOT EXISTS idx_reports_app_id_os_version_received_at ON public.reports(app_id, os_version, received_at DESC);
-- However, start with single-column and functional indexes first, then analyze query performance (e.g. using EXPLAIN ANALYZE)
-- before adding too many composite indexes, as they can increase write overhead.
-- The existing idx_reports_app_id_received_at already covers app_id and received_at filtering well.
