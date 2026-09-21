"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/database/types";
import { getPublicEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
