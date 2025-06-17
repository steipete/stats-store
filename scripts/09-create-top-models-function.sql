-- Function to get top Mac models
CREATE OR REPLACE FUNCTION get_top_models(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW(),
    p_limit_count INT DEFAULT 5
)
RETURNS TABLE (model_name TEXT, report_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(r.model_identifier, 'Unknown') AS model_name,
        COUNT(r.id) AS report_count -- Count total reports for this model
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day')
    GROUP BY
        COALESCE(r.model_identifier, 'Unknown')
    ORDER BY
        report_count DESC
    LIMIT p_limit_count;
END;
$$;
