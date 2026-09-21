import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types";
import { getPublicEnv, getServiceRoleKey } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { supabaseUrl } = getPublicEnv();

  return createClient<Database>(supabaseUrl, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
