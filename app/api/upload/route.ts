import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { optimizeAndUploadImage } from "@/lib/storage-utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  let bucketName = "general";
  
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    bucketName = formData.get("bucket") as string || "general";
    const type = formData.get("type") as string; // 'profile' or 'payment'

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Determine path and optimization settings
    let path = `${userId}/${Date.now()}`;
    let options: { width?: number; height?: number; quality?: number } = { width: 800, quality: 75 }; // Default

    if (type === "profile") {
      path = `${userId}/profile_${Date.now()}`;
      options = { width: 400, height: 400, quality: 80 }; // Square and smaller for avatars
    } else if (type === "payment") {
      path = `payments/${userId}_${Date.now()}`;
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

    const urlWithBuster = `${publicUrl}?_t=${Date.now()}`;
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
