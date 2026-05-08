import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { optimizeAndUploadImage } from "@/lib/storage-utils";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const ALLOWED_BUCKETS = new Set(["general", "profile-photos", "payment-proofs"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  let bucketName = "general";
  
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      userId;
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
