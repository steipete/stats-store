-- Function to get macOS version distribution
CREATE OR REPLACE FUNCTION get_os_version_distribution(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (os_version_name TEXT, user_count BIGINT)
LANGUAGE plpgsql
STABLE -- Indicates the function does not modify the database
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(r.os_version, 'Unknown') AS os_version_name,
        COUNT(DISTINCT r.ip_hash) AS user_count -- Count unique users
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') -- Inclusive of the whole end day
    GROUP BY
        COALESCE(r.os_version, 'Unknown')
    ORDER BY
        user_count DESC;
END;
$$;
