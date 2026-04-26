import { createClient } from "@supabase/supabase-js";

async function provisionBuckets() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fikidmfquaxhlayxctsa.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpa2lkbWZxdWF4aGxheXhjdHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA4ODU1MiwiZXhwIjoyMDkwNjY0NTUyfQ.J6IcWol7VQrHq2nOdat8iL7z3S6gT4C7TfQYteHKJso";

  console.log("Connecting to Supabase to provision buckets...");
  const supabase = createClient(url, key);

  const bucketsToCreate = ["general", "profile-photos", "payment-proofs"];

  for (const bucket of bucketsToCreate) {
    try {
      console.log(`Checking bucket: ${bucket}...`);
      const { data, error } = await supabase.storage.createBucket(bucket, { public: true });
      if (error) {
        if (error.message.includes("already exists")) {
          console.log(`Bucket ${bucket} already exists.`);
        } else {
          console.error(`Error creating bucket ${bucket}:`, error);
        }
      } else {
        console.log(`Bucket ${bucket} created successfully.`);
      }
    } catch(e) {
      console.error("Exception:", e);
    }
  }
}

provisionBuckets();
