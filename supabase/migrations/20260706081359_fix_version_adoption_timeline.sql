-- PL/pgSQL output columns are variables. Qualify app_version throughout the
-- query so it cannot conflict with the function's app_version output column.
CREATE OR REPLACE FUNCTION public.get_version_adoption_timeline(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW(),
    p_top_versions INT DEFAULT 5
)
RETURNS TABLE (report_date DATE, app_version TEXT, user_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH top_versions AS (
        SELECT top_report.app_version
        FROM public.reports AS top_report
        WHERE
            (p_app_id_filter IS NULL OR top_report.app_id = p_app_id_filter) AND
            top_report.received_at >= p_start_date_filter AND
            top_report.received_at < (p_end_date_filter + INTERVAL '1 day') AND
            top_report.app_version IS NOT NULL AND
            top_report.app_version != '' AND
            top_report.app_version != 'Unknown'
        GROUP BY top_report.app_version
        ORDER BY COUNT(DISTINCT top_report.ip_hash) DESC
        LIMIT p_top_versions
    )
    SELECT
        DATE(report.received_at) AS report_date,
        report.app_version,
        COUNT(DISTINCT report.ip_hash) AS user_count
    FROM public.reports AS report
    WHERE
        (p_app_id_filter IS NULL OR report.app_id = p_app_id_filter) AND
        report.received_at >= p_start_date_filter AND
        report.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        report.app_version IN (SELECT top_versions.app_version FROM top_versions)
    GROUP BY
        DATE(report.received_at),
        report.app_version
    ORDER BY
        DATE(report.received_at),
        report.app_version;
END;
$$;
