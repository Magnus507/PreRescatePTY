import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = "https://fikidmfquaxhlayxctsa.supabase.co";
const supabasePublishableKey = "sb_publishable_nIDL_KCbbJpki4Y1_3cR1g_nCmkNUe0";

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
