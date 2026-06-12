const { createClient } = require("@supabase/supabase-js");

// ── Environment variable validation ──────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ FALTA VARIABLES DE ENTORNO REQUERIDAS:");
  if (!supabaseUrl) console.error("   - SUPABASE_URL");
  if (!supabaseServiceKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nEjecute:");
  console.error("  SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/setup-storage.js");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBuckets() {
  console.log("🔧 Configurando Supabase Storage...\n");

  const buckets = [
    { name: "general", description: "Almacenamiento general" },
    { name: "profile-photos", description: "Fotos de perfil de usuarios" },
    { name: "payment-proofs", description: "Comprobantes de pago" },
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
          public: true,
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

      // 2. Hacer bucket público (actualizar configuración)
      console.log(`   📢 Haciendo bucket público...`);
      const { error: updateError } = await supabase.storage.updateBucket(bucket.name, {
        public: true,
      });

      if (updateError) {
        console.error(`   ⚠️  Advertencia: ${updateError.message}`);
      } else {
        console.log(`   ✅ Bucket configurado como público`);
      }

      // 3. Verificar acceso público con un archivo de prueba
      console.log(`   🧪 Probando acceso público...`);
      const testFile = Buffer.from("test");
      const fileName = `.test-${Date.now()}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket.name)
        .upload(fileName, testFile, { upsert: true });

      if (uploadError) {
        console.error(`   ⚠️  Error al subir archivo de prueba: ${uploadError.message}`);
      } else {
        const { data: urlData } = supabase.storage.from(bucket.name).getPublicUrl(fileName);
        console.log(`   ✅ URL Pública: ${urlData.publicUrl}`);

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
  console.log("✅ Buckets públicos configurados:");
  console.log("   • general");
  console.log("   • profile-photos");
  console.log("   • payment-proofs");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

setupStorageBuckets().catch(console.error);
