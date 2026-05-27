import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { optimizeAndUploadImage } from "@/lib/storage-utils";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

const ALLOWED_BUCKETS = new Set(["general", "profile-photos", "payment-proofs"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Validate file content via magic bytes (first bytes of the buffer).
 * Returns the detected MIME type or null if unknown/invalid.
 */
function detectImageMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: starts with FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.slice(0, 8).equals(pngSignature)) {
    return "image/png";
  }

  // WebP: RIFF + 4 bytes size + WEBP
  const riff = buffer.slice(0, 4).toString("ascii");
  const webp = buffer.slice(8, 12).toString("ascii");
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  let bucketName = "general";
  
  try {
    const ip = getClientIp(req, `upload:${userId}`);
    const limiter = await rateLimit("upload", `${userId}:${ip}`, {
      limit: 20,
      windowMs: 60_000 * 15,
    });
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiadas cargas. Intenta mas tarde." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    bucketName = formData.get("bucket") as string || "general";
    const type = formData.get("type") as string; // 'profile' or 'payment'

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    if (type === "profile") {
      bucketName = "profile-photos";
    } else if (type === "payment") {
      bucketName = "payment-proofs";
    }

    if (!ALLOWED_BUCKETS.has(bucketName)) {
      return NextResponse.json({ error: "Destino de carga invalido" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG o WebP" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "El archivo supera el limite de 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // P0 SECURITY: Validate magic bytes before any processing
    const detectedMime = detectImageMagicBytes(buffer);
    if (!detectedMime) {
      return NextResponse.json(
        { error: "Archivo inválido: el contenido no corresponde a una imagen permitida." },
        { status: 400 }
      );
    }
    
    // Determine path and optimization settings
    let path = `${userId}/${Date.now()}`;
    let options: { width?: number; height?: number; quality?: number } = { width: 800, quality: 75 }; // Default

    if (type === "profile") {
      path = `${userId}/profile_${Date.now()}`;
      options = { width: 400, height: 400, quality: 80 }; // Square and smaller for avatars
    } else if (type === "payment") {
      path = `payments/${userId}/${Date.now()}`;
      options = { width: 1200, quality: 70 }; // Legibility is more important for proofs
    }

    const publicUrl = await optimizeAndUploadImage(buffer, bucketName, path, options);

    // If it's a profile photo, update the profile automatically
    if (type === "profile") {
      const targetProfileId = formData.get("profileId") as string;
      try {
        if (targetProfileId) {
          // Verify ownership: profile must belong to the same account as the user
          const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountId: true } });
          const profile = await prisma.profile.findUnique({ where: { id: targetProfileId }, select: { accountId: true } });
          
          if (user?.accountId === profile?.accountId) {
             await prisma.profile.update({
               where: { id: targetProfileId },
               data: { photoUrl: publicUrl }
             });
          }
        } else {
          // Default to current user's profile
          await prisma.profile.upsert({
            where: { userId: userId },
            update: { photoUrl: publicUrl },
            create: {
              userId: userId,
              photoUrl: publicUrl,
              firstName: "",
              lastName: "",
              bloodType: "Pendiente"
            }
          });
        }
      } catch (prismaError: unknown) {
        console.error("Prisma update error after upload:", prismaError);
      }
    }

    const urlWithBuster = publicUrl.includes("?") 
      ? `${publicUrl}&_t=${Date.now()}`
      : `${publicUrl}?_t=${Date.now()}`;
    return NextResponse.json({ url: urlWithBuster });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Upload handler error:", error);
    
    // Check for specific common errors
    if (error.message?.includes("bucket")) {
      return NextResponse.json({ 
        error: `El baúl '${bucketName}' no existe. Asegúrate de crearlo en el panel de Supabase.`,
        details: error.message 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      error: error.message || "Error interno en el servidor de carga",
      details: error.message
    }, { status: 500 });
  }
}