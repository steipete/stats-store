-- Update functions to filter out unknown/null values

-- Update OS version distribution to exclude unknowns
CREATE OR REPLACE FUNCTION get_os_version_distribution(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (os_version_name TEXT, user_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.os_version AS os_version_name,
        COUNT(DISTINCT r.ip_hash) AS user_count
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        r.os_version IS NOT NULL AND 
        r.os_version != '' AND
        r.os_version != 'Unknown'
    GROUP BY
        r.os_version
    ORDER BY
        user_count DESC;
END;
$$;

-- Update CPU architecture distribution to exclude unknowns
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
            ELSE r.cpu_arch
        END AS cpu_arch_name,
        COUNT(DISTINCT r.ip_hash) AS user_count
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        r.cpu_arch IS NOT NULL AND 
        r.cpu_arch != '' AND
        r.cpu_arch != 'Unknown' AND
        r.cpu_arch IN ('arm64', 'x86_64') -- Only known architectures
    GROUP BY
        CASE 
            WHEN r.cpu_arch = 'arm64' THEN 'Apple Silicon'
            WHEN r.cpu_arch = 'x86_64' THEN 'Intel'
            ELSE r.cpu_arch
        END
    ORDER BY
        user_count DESC;
END;
$$;

-- Update top models to exclude unknowns
CREATE OR REPLACE FUNCTION get_top_models(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW(),
    p_limit_count INT DEFAULT 10  -- Increased from 5 to 10 for more visibility
)
RETURNS TABLE (model_name TEXT, report_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.model_identifier AS model_name,
        COUNT(DISTINCT r.ip_hash) AS report_count -- Changed to unique users instead of total reports
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        r.model_identifier IS NOT NULL AND 
        r.model_identifier != '' AND
        r.model_identifier != 'Unknown'
    GROUP BY
        r.model_identifier
    ORDER BY
        report_count DESC
    LIMIT p_limit_count;
END;
$$;

-- New function: Language distribution
CREATE OR REPLACE FUNCTION get_language_distribution(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW(),
    p_limit_count INT DEFAULT 10
)
RETURNS TABLE (language_name TEXT, user_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.language AS language_name,
        COUNT(DISTINCT r.ip_hash) AS user_count
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        r.language IS NOT NULL AND 
        r.language != '' AND
        r.language != 'Unknown'
    GROUP BY
        r.language
    ORDER BY
        user_count DESC
    LIMIT p_limit_count;
END;
$$;

-- New function: RAM distribution
CREATE OR REPLACE FUNCTION get_ram_distribution(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (ram_gb TEXT, user_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE 
            WHEN r.ram_mb < 8192 THEN '< 8 GB'
            WHEN r.ram_mb >= 8192 AND r.ram_mb < 16384 THEN '8 GB'
            WHEN r.ram_mb >= 16384 AND r.ram_mb < 32768 THEN '16 GB'
            WHEN r.ram_mb >= 32768 AND r.ram_mb < 65536 THEN '32 GB'
            WHEN r.ram_mb >= 65536 AND r.ram_mb < 131072 THEN '64 GB'
            WHEN r.ram_mb >= 131072 THEN '128+ GB'
        END AS ram_gb,
        COUNT(DISTINCT r.ip_hash) AS user_count
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        r.ram_mb IS NOT NULL AND 
        r.ram_mb > 0
    GROUP BY
        CASE 
            WHEN r.ram_mb < 8192 THEN '< 8 GB'
            WHEN r.ram_mb >= 8192 AND r.ram_mb < 16384 THEN '8 GB'
            WHEN r.ram_mb >= 16384 AND r.ram_mb < 32768 THEN '16 GB'
            WHEN r.ram_mb >= 32768 AND r.ram_mb < 65536 THEN '32 GB'
            WHEN r.ram_mb >= 65536 AND r.ram_mb < 131072 THEN '64 GB'
            WHEN r.ram_mb >= 131072 THEN '128+ GB'
        END
    ORDER BY
        -- Order by the actual RAM size for logical ordering
        MIN(r.ram_mb);
END;
$$;

-- New function: CPU core count distribution
CREATE OR REPLACE FUNCTION get_cpu_cores_distribution(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (core_count TEXT, user_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.core_count::TEXT || ' cores' AS core_count,
        COUNT(DISTINCT r.ip_hash) AS user_count
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        r.core_count IS NOT NULL AND 
        r.core_count > 0
    GROUP BY
        r.core_count
    ORDER BY
        r.core_count;
END;
$$;

-- New function: Version adoption over time
CREATE OR REPLACE FUNCTION get_version_adoption_timeline(
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
        SELECT app_version
        FROM public.reports
        WHERE 
            (p_app_id_filter IS NULL OR app_id = p_app_id_filter) AND
            received_at >= p_start_date_filter AND
            received_at < (p_end_date_filter + INTERVAL '1 day') AND
            app_version IS NOT NULL AND
            app_version != '' AND
            app_version != 'Unknown'
        GROUP BY app_version
        ORDER BY COUNT(DISTINCT ip_hash) DESC
        LIMIT p_top_versions
    )
    SELECT
        DATE(r.received_at) AS report_date,
        r.app_version,
        COUNT(DISTINCT r.ip_hash) AS user_count
    FROM
        public.reports r
    WHERE
        (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
        r.received_at >= p_start_date_filter AND
        r.received_at < (p_end_date_filter + INTERVAL '1 day') AND
        r.app_version IN (SELECT app_version FROM top_versions)
    GROUP BY
        DATE(r.received_at),
        r.app_version
    ORDER BY
        report_date,
        r.app_version;
END;
$$;

-- New function: Hourly activity pattern
CREATE OR REPLACE FUNCTION get_hourly_activity_pattern(
    p_app_id_filter UUID DEFAULT NULL,
    p_start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '6 days'),
    p_end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (hour_of_day INT, avg_reports NUMERIC)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH hourly_counts AS (
        SELECT
            EXTRACT(HOUR FROM r.received_at AT TIME ZONE 'UTC') AS hour_utc,
            DATE(r.received_at) AS report_date,
            COUNT(*) AS report_count
        FROM
            public.reports r
        WHERE
            (p_app_id_filter IS NULL OR r.app_id = p_app_id_filter) AND
            r.received_at >= p_start_date_filter AND
            r.received_at < (p_end_date_filter + INTERVAL '1 day')
        GROUP BY
            EXTRACT(HOUR FROM r.received_at AT TIME ZONE 'UTC'),
            DATE(r.received_at)
    )
    SELECT
        hour_utc::INT AS hour_of_day,
        ROUND(AVG(report_count), 1) AS avg_reports
    FROM
        hourly_counts
    GROUP BY
        hour_utc
    ORDER BY
        hour_utc;
END;
$$;