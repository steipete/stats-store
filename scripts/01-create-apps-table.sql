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

-- Enable Row Level Security (though for a public dashboard, policies might be permissive).
-- For a truly public setup without user-specific data, RLS might not be strictly necessary
-- for read operations if all data is meant to be public.
-- However, it's good practice to enable it and define policies.
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all apps
CREATE POLICY "Allow public read access to apps"
ON public.apps
FOR SELECT
USING (true);
