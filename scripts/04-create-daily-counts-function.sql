-- Function to get daily report counts within a date range, optionally filtered by app_id
CREATE OR REPLACE FUNCTION get_daily_report_counts(
    app_id_filter UUID DEFAULT NULL,
    start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (report_day DATE, report_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(r.received_at AT TIME ZONE 'UTC') AS day, -- Ensure consistent timezone for date truncation
        COUNT(r.id) AS count
    FROM
        public.reports r
    WHERE
        (app_id_filter IS NULL OR r.app_id = app_id_filter) AND
        r.received_at >= start_date_filter AND
        r.received_at < (end_date_filter + INTERVAL '1 day') -- Ensure end_date_filter is inclusive for the whole day
    GROUP BY
        day
    ORDER BY
        day ASC;
END;
$$;
