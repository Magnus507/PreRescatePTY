import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "./config";

let browserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  return browserClient;
}
