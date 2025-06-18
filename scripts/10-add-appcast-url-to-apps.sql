-- Add appcast URL field to apps table
ALTER TABLE public.apps 
ADD COLUMN appcast_base_url TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.apps.appcast_base_url IS 'Base URL for the appcast. For GitHub repos, use the repo URL (e.g., https://github.com/owner/repo). For other domains, use the base domain (e.g., https://mydomain.com)';
