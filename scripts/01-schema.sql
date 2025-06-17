-- Stores metadata for each application being tracked.
CREATE TABLE public.apps (
  -- A unique identifier for the app.
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The user-facing name of the application, e.g., "My Awesome App".
  name TEXT NOT NULL UNIQUE,
  
  -- The app's bundle identifier, e.g., "com.mycompany.myawesomeapp".
  -- This is the key used to validate incoming reports.
  bundle_identifier TEXT NOT NULL UNIQUE,
  
  -- Timestamp of when the app was added.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security to control data access.
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Stores every individual, sanitized profile report received.
CREATE TABLE public.reports (
  -- A unique, auto-incrementing identifier for each report.
  id BIGSERIAL PRIMARY KEY,
  
  -- A foreign key linking this report to an app in the 'apps' table.
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  
  -- Timestamp of when the report was received by the server.
  received_at TIMESTAMPTZ DEFAULT now(),
  
  -- A SHA-256 hash of the user's IP address salted with the current date.
  -- This allows for counting daily unique users without storing PII.
  ip_hash TEXT NOT NULL,
  
  -- Application version, e.g., "1.2.3".
  app_version TEXT,
  
  -- macOS version, e.g., "14.5".
  os_version TEXT,
  
  -- CPU architecture: 'arm64' or 'x86_64'.
  cpu_arch TEXT,
  
  -- Number of CPU cores.
  core_count INT,
  
  -- The user's primary system language code, e.g., "en".
  language TEXT,
  
  -- The Mac model identifier, e.g., "MacBookPro17,1".
  model_identifier TEXT,
  
  -- System RAM in megabytes.
  ram_mb INT
);

-- Indexes to optimize common query patterns.
CREATE INDEX idx_reports_app_id_received_at ON public.reports(app_id, received_at DESC);
CREATE INDEX idx_reports_os_version ON public.reports(os_version);
CREATE INDEX idx_reports_cpu_arch ON public.reports(cpu_arch);

-- Enable Row Level Security.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
