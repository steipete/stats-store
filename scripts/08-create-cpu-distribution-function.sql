-- Function to get CPU architecture distribution
CREATE OR REPLACE FUNCTION get_cpu_architecture_distribution(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (cpu_arch_name TEXT, user_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE 
            WHEN r.cpu_arch = 'arm64' THEN 'Apple Silicon'
            WHEN r.cpu_arch = 'x86_64' THEN 'Intel'
            ELSE COALESCE(r.cpu_arch, 'Unknown')
        END AS cpu_arch_name,
        COUNT(DISTINCT r.ip_hash) AS user_count -- Count unique users
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day')
    GROUP BY
        CASE 
            WHEN r.cpu_arch = 'arm64' THEN 'Apple Silicon'
            WHEN r.cpu_arch = 'x86_64' THEN 'Intel'
            ELSE COALESCE(r.cpu_arch, 'Unknown')
        END
    ORDER BY
        user_count DESC;
END;
$$;
