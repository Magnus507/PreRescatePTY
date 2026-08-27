import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; 

// Initialized only when needed to prevent build failures if env vars are missing
function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function optimizeAndUploadImage(
  file: Buffer,
  bucket: string,
  path: string,
  options: { width?: number; height?: number; quality?: number } = {}
) {
  const supabase = getSupabase();
  const { width = 800, height, quality = 80 } = options;

  try {
    // 1. Optimize Image with Sharp
    let pipeline = sharp(file).rotate(); // Auto-rotate based on EXIF

    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const optimizedBuffer = await pipeline
      .webp({ quality }) // Convert to WebP for maximum compression
      .toBuffer();

    // 2. Ensure bucket exists (auto-provisioning for convenience)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucket);
    
    if (!bucketExists) {
      logger.info(`Creating missing bucket: ${bucket}`);
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: bucket !== "payment-proofs",
        allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
        fileSizeLimit: 5242880 // 5MB
      });
      if (createError) {
        logger.error("Could not auto-create bucket:", createError.message);
        throw new Error(`Fallo crítico al inicializar el baúl de almacenamiento '${bucket}': ${createError.message}`);
      }
    }

    // 3. Upload to Supabase
    const fileName = `${path}.webp`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, optimizedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) throw error;
    logger.debug(`File uploaded successfully: ${data.path}`);

    // 3. Get Public URL (use proxy endpoint for better compatibility)
    // Format: /api/image-proxy?bucket=bucket-name&path=fileName
    const proxyUrl = `/api/image-proxy?bucket=${bucket}&path=${encodeURIComponent(fileName)}`;
    return proxyUrl;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Storage Optimization Error:", errorMessage);
    throw new Error(`Detalle técnico: ${errorMessage}`);
  }
}
