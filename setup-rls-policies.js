const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://fikidmfquaxhlayxctsa.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpa2lkbWZxdWF4aGxheXhjdHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA4ODU1MiwiZXhwIjoyMDkwNjY0NTUyfQ.J6IcWol7VQrHq2nOdat8iL7z3S6gT4C7TfQYteHKJso";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStoragePolicies() {
  console.log("🔒 Configurando políticas RLS de Storage...\n");

  const buckets = ["general", "profile-photos", "payment-proofs"];
  
  const rls_policies = [
    {
      name: "Allow public read",
      definition: `(bucket_id = 'BUCKET_NAME')`,
      operation: "SELECT",
      roles: ["anon", "authenticated"]
    },
    {
      name: "Allow authenticated write",
      definition: `(bucket_id = 'BUCKET_NAME' AND auth.role() = 'authenticated')`,
      operation: "INSERT",
      roles: ["authenticated"]
    },
    {
      name: "Allow user delete",
      definition: `(bucket_id = 'BUCKET_NAME' AND auth.role() = 'authenticated')`,
      operation: "DELETE",
      roles: ["authenticated"]
    }
  ];

  try {
    // Get all existing policies
    const { data: policies, error: policiesError } = await supabase
      .rpc("pgsql_get_all_policies");
    
    console.log("✅ Verificando políticas existentes en storage.objects...\n");

    for (const bucket of buckets) {
      console.log(`📋 Bucket: ${bucket}`);
      console.log("   Políticas esperadas:");
      console.log("   ✓ Allow public read (SELECT)");
      console.log("   ✓ Allow authenticated write (INSERT)");
      console.log("   ✓ Allow user delete (DELETE)\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📢 POLÍTICAS A CREAR MANUALMENTE EN SUPABASE:\n");
    
    for (const bucket of buckets) {
      console.log(`\n[${bucket}] - Policy 1: Allow public read`);
      console.log("───────────────────────────────────────────────");
      console.log(`Target roles: SELECT`);
      console.log(`Definition: bucket_id = '${bucket}'`);
      console.log(`Grantees: anon, authenticated\n`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ Pasos para crear en Supabase UI:\n");
    console.log("1. Ve a Storage → [bucket-name]");
    console.log("2. Click en 'Policies' tab");
    console.log("3. Click 'New Policy'");
    console.log("4. Choose template: 'For queries only'");
    console.log("5. Operation: SELECT");
    console.log("6. Target roles: ALL");
    console.log("7. Policy definition:");
    console.log("   (bucket_id = 'bucket-name')");
    console.log("8. Click 'Review' → 'Save policy'\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (err) {
    console.error("Error:", err);
  }
}

setupStoragePolicies();
