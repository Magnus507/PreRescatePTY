import { createClient } from "@supabase/supabase-js";

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fikidmfquaxhlayxctsa.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpa2lkbWZxdWF4aGxheXhjdHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA4ODU1MiwiZXhwIjoyMDkwNjY0NTUyfQ.J6IcWol7VQrHq2nOdat8iL7z3S6gT4C7TfQYteHKJso";

  console.log("Connecting to Supabase...");
  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Error listing buckets:", error);
    } else {
      console.log("Buckets found:", data?.map((b) => b.name));
    }
    
    const { data: uploadData, error: uploadError } = await supabase.storage.from("general").upload("test.txt", "hello world", { upsert: true });
    if (uploadError) {
      console.error("Upload error:", uploadError);
    } else {
      console.log("Upload successful:", uploadData);
    }
  } catch(e) {
    console.error("Exception:", e);
  }
}

test();
