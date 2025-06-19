-- Add display_name column to apps table for Sparkle appName matching
-- This allows matching apps by the name Sparkle sends in the appName parameter
-- which may differ from the bundle identifier

ALTER TABLE public.apps 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create a unique index on display_name to ensure no duplicates
-- This allows efficient lookups when matching by appName
CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_display_name ON public.apps(display_name) 
WHERE display_name IS NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.apps.display_name IS 'The display name of the app as sent by Sparkle in the appName parameter. Used for matching when bundleIdentifier is not available. If NULL, falls back to the name column.';

-- Update existing apps to set display_name to match name initially
-- This ensures backward compatibility
UPDATE public.apps 
SET display_name = name 
WHERE display_name IS NULL;

-- Create a function to get app by identifier (bundleIdentifier or appName)
-- This centralizes the lookup logic
CREATE OR REPLACE FUNCTION public.get_app_by_identifier(
  p_bundle_identifier TEXT DEFAULT NULL,
  p_app_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  bundle_identifier TEXT,
  display_name TEXT,
  appcast_base_url TEXT
) AS $$
BEGIN
  -- First try to match by bundle identifier (most precise)
  IF p_bundle_identifier IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.bundle_identifier, a.display_name, a.appcast_base_url
    FROM public.apps a
    WHERE a.bundle_identifier = p_bundle_identifier
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Then try to match by display_name
  IF p_app_name IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.bundle_identifier, a.display_name, a.appcast_base_url
    FROM public.apps a
    WHERE a.display_name = p_app_name
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Finally try to match by name column (backward compatibility)
  IF p_app_name IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.name, a.bundle_identifier, a.display_name, a.appcast_base_url
    FROM public.apps a
    WHERE a.name = p_app_name
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_app_by_identifier TO anon, authenticated;