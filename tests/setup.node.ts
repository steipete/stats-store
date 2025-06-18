import { vi } from "vitest"

// Mock environment variables
process.env.SUPABASE_URL = "https://test.supabase.co"
process.env.SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"