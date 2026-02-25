import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Server-only admin client with service role key.
 * Bypasses RLS, has auth admin API access.
 * Never expose in browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for admin client");
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
