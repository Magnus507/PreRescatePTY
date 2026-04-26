import { createClient } from "@supabase/supabase-js";

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fikidmfquaxhlayxctsa.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpa2lkbWZxdWF4aGxheXhjdHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA4ODU1MiwiZXhwIjoyMDkwNjY0NTUyfQ.J6IcWol7VQrHq2nOdat8iL7z3S6gT4C7TfQYteHKJso";

  console.log("Connecting to Supabase...");
  const supabase = createClient(url, key);

  try {
    console.log("Attempting to create bucket payment-proofs...");
    const { data, error } = await supabase.storage.createBucket("payment-proofs", { public: true });
    if (error) {
      console.error("Create bucket error:", error);
    } else {
      console.log("Bucket created:", data);
    }
  } catch(e) {
    console.error("Exception:", e);
  }
}

test();
