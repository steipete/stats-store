import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

export function createSupabaseServerClient(useServiceRole = false) {
  const supabaseUrl = process.env.SUPABASE_URL
  let supabaseKey: string | undefined

  if (useServiceRole) {
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  } else {
    supabaseKey = process.env.SUPABASE_ANON_KEY
  }

  if (!supabaseUrl) {
    console.error("ERROR: SUPABASE_URL environment variable is not defined.")
    throw new Error("Supabase URL is not defined in environment variables. Check SUPABASE_URL.")
  }

  if (!supabaseKey) {
    const keyName = useServiceRole ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY"
    console.error(`ERROR: ${keyName} environment variable is not defined.`)
    throw new Error(`Supabase Key (${keyName}) is not defined in environment variables. Check ${keyName}.`)
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}
