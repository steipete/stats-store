import { createClient } from "@supabase/supabase-js"

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server environment
// Never expose these keys to the browser
export const supabaseAdmin = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
