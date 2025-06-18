-- Update existing apps with example appcast URLs

-- Example 1: GitHub-based appcast (will be converted to raw.githubusercontent.com)
UPDATE public.apps 
SET appcast_base_url = 'https://github.com/amantus-ai/vibetunnel'
WHERE bundle_identifier = 'com.mycompany.myawesomeapp';

-- Example 2: Direct domain appcast (folder URL)
UPDATE public.apps 
SET appcast_base_url = 'https://example.com/updates'
WHERE bundle_identifier = 'com.example.anothergreatpp';

-- Example 3: Add a new app with GitHub appcast
INSERT INTO public.apps (name, bundle_identifier, appcast_base_url)
VALUES ('VibeTunnel', 'com.amantus.vibetunnel', 'https://github.com/amantus-ai/vibetunnel')
ON CONFLICT (bundle_identifier) DO UPDATE 
SET appcast_base_url = EXCLUDED.appcast_base_url;

-- Example 4: Direct URL with .xml file included (smart detection will handle this)
INSERT INTO public.apps (name, bundle_identifier, appcast_base_url)
VALUES ('Direct XML App', 'com.example.directxml', 'https://example.com/downloads/appcast.xml')
ON CONFLICT (bundle_identifier) DO UPDATE 
SET appcast_base_url = EXCLUDED.appcast_base_url;