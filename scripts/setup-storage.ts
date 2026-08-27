import { createClient } from "@supabase/supabase-js";

// ── Environment variable validation ──────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ FALTA VARIABLES DE ENTORNO REQUERIDAS:");
  if (!supabaseUrl) console.error("   - SUPABASE_URL");
  if (!supabaseServiceKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nEjecute:");
  console.error("  SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/setup-storage.ts");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBuckets() {
  console.log("🔧 Configurando Supabase Storage...\n");

  const buckets = [
    { name: "general", description: "Almacenamiento general", public: true },
    { name: "profile-photos", description: "Fotos de perfil de usuarios", public: true },
    { name: "payment-proofs", description: "Comprobantes de pago", public: false },
  ];

  for (const bucket of buckets) {
    try {
      // 1. Crear o verificar bucket
      console.log(`📦 Verificando bucket: ${bucket.name}...`);
      const { data: existingBuckets } = await supabase.storage.listBuckets();
      const bucketExists = existingBuckets?.some((b) => b.name === bucket.name);

      if (!bucketExists) {
        console.log(`   ✅ Creando bucket: ${bucket.name}`);
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          fileSizeLimit: 5242880, // 5MB
        });

        if (error) {
          console.error(`   ❌ Error al crear bucket: ${error.message}`);
          continue;
        }
        console.log(`   ✅ Bucket creado exitosamente`);
      } else {
        console.log(`   ✅ Bucket ya existe`);
      }

      // 2. Enforce the intended privacy mode.
      console.log(`   🔐 Configurando privacidad...`);
      const { error: updateError } = await supabase.storage.updateBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        fileSizeLimit: 5242880,
      });

      if (updateError) {
        console.error(`   ⚠️  Advertencia: ${updateError.message}`);
      } else {
        console.log(`   ✅ Bucket ${bucket.public ? "público" : "privado"}`);
      }

      // 3. Verify service-role upload. Private files are read through the app proxy.
      console.log(`   🧪 Probando carga...`);
      const testFile = Buffer.from("test");
      const fileName = `.test-${Date.now()}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket.name)
        .upload(fileName, testFile, { upsert: true });

      if (uploadError) {
        console.error(`   ⚠️  Error al subir archivo de prueba: ${uploadError.message}`);
      } else {
        console.log(`   ✅ Carga verificada`);

        // Limpiar archivo de prueba
        await supabase.storage.from(bucket.name).remove([fileName]);
        console.log(`   🧹 Archivo de prueba eliminado\n`);
      }
    } catch (err) {
      console.error(`❌ Error procesando bucket ${bucket.name}:`, err);
    }
  }

  console.log("\n✨ Configuración de Storage completada");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Buckets configurados:");
  console.log("   • general");
  console.log("   • profile-photos");
  console.log("   • payment-proofs (privado)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

setupStorageBuckets().catch(console.error);
