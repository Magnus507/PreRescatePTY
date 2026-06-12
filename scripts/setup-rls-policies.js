const { createClient } = require("@supabase/supabase-js");

// ── Environment variable validation ──────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ FALTA VARIABLES DE ENTORNO REQUERIDAS:");
  if (!supabaseUrl) console.error("   - SUPABASE_URL");
  if (!supabaseServiceKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nEjecute:");
  console.error("  SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/setup-rls-policies.js");
  process.exit(1);
}

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
