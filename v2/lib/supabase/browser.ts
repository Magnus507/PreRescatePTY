import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fikidmfquaxhlayxctsa.supabase.co";
const supabasePublishableKey = "sb_publishable_nIDL_KCbbJpki4Y1_3cR1g_nCmkNUe0";

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
