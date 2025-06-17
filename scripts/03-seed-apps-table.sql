-- Seed the 'apps' table with an example application.
-- Replace with your actual application details.
INSERT INTO public.apps (name, bundle_identifier)
VALUES ('My Awesome App', 'com.mycompany.myawesomeapp')
ON CONFLICT (bundle_identifier) DO NOTHING;

INSERT INTO public.apps (name, bundle_identifier)
VALUES ('Another Great App', 'com.example.anothergreatpp')
ON CONFLICT (bundle_identifier) DO NOTHING;
