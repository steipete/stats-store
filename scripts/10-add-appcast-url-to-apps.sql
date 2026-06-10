-- Add appcast URL field to apps table
ALTER TABLE public.apps 
ADD COLUMN appcast_base_url TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.apps.appcast_base_url IS 'Canonical stable appcast base URL. For GitHub repos, use the repo URL (e.g., https://github.com/owner/repo). For other domains, use the base domain or a direct stable XML feed (custom stable filenames supported; appcast-prerelease.xml and appcast-beta.xml are known unstable feed filenames).';
