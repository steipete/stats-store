-- Function to get the latest semantic app version within a date range, optionally filtered by app_id
CREATE OR REPLACE FUNCTION get_latest_app_version(
    app_id_filter UUID DEFAULT NULL,
    start_date_filter TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '29 days'),
    end_date_filter TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
SELECT
    r.app_version
FROM
    public.reports r
WHERE
    (app_id_filter IS NULL OR r.app_id = app_id_filter) AND
    r.received_at >= start_date_filter AND
    r.received_at < (end_date_filter + INTERVAL '1 day') AND
    r.app_version IS NOT NULL AND
    r.app_version ~ '^[0-9]+(\.[0-9]+)*$' -- Basic validation for dot-separated numeric versions
ORDER BY
    string_to_array(r.app_version, '.')::INT[] DESC,
    r.received_at DESC
LIMIT 1;
$$;
