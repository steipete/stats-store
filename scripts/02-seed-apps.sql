-- Seed the apps table with a sample application
-- In a real application, you would add your own apps here.
INSERT INTO public.apps (name, bundle_identifier)
VALUES ('My Awesome App', 'com.mycompany.myawesomeapp')
ON CONFLICT (bundle_identifier) DO NOTHING;
