-- Migration to update display names for existing apps
-- This helps with Sparkle appName matching

-- Update specific apps with their known display names
-- These are examples - adjust based on your actual apps

-- Example: If you have an app with bundle identifier 'com.amantus.vibetunnel'
-- and Sparkle sends 'Vibe Tunnel' as the appName
UPDATE public.apps 
SET display_name = 'Vibe Tunnel'
WHERE bundle_identifier = 'com.amantus.vibetunnel' 
AND display_name IS NULL;

-- Add more app-specific updates here as needed
-- UPDATE public.apps 
-- SET display_name = 'Your App Display Name'
-- WHERE bundle_identifier = 'com.yourcompany.yourapp' 
-- AND display_name IS NULL;

-- For any remaining apps without a display_name, 
-- set it to match the name column (if not already done by migration 15)
UPDATE public.apps 
SET display_name = name 
WHERE display_name IS NULL;

-- Verify the updates
SELECT 
  name,
  bundle_identifier,
  display_name,
  CASE 
    WHEN display_name = name THEN 'Same as name'
    ELSE 'Custom display name'
  END as display_name_status
FROM public.apps
ORDER BY name;