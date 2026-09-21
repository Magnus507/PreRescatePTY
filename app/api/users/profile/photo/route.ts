import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optimizeAndUploadImage } from "@/lib/storage-utils";
import { cleanupUploadedObjectOrRecordOrphan } from "@/lib/storage-cleanup-outbox";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectImageMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.subarray(0, 8).equals(pngSignature)) return "image/png";

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const requestedProfileId = String(req.nextUrl.searchParams.get("profileId") || "").trim();

  try {
    const ip = getClientIp(req, `profile-photo:${userId}`);
    const limiter = await rateLimit("upload", `${userId}:${ip}`, {
      limit: 20,
      windowMs: 60_000 * 15,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Demasiadas cargas. Intenta más tarde." },
        { status: 429 }
      );
    }

    const rawBody = await req.arrayBuffer();
    const buffer = Buffer.from(rawBody);

    if (buffer.length <= 0) {
      return NextResponse.json(
        { error: "La foto llegó vacía. Vuelve a seleccionarla e intenta nuevamente." },
        { status: 400 }
      );
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "La foto debe pesar menos de 5 MB." },
        { status: 400 }
      );
    }

    const detectedMime = detectImageMagicBytes(buffer);
    if (!detectedMime || !ALLOWED_IMAGE_TYPES.has(detectedMime)) {
      return NextResponse.json(
        { error: "Usa una foto JPG, PNG o WebP." },
        { status: 400 }
      );
    }

    const declaredMime = String(req.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (
      declaredMime &&
      declaredMime !== "application/octet-stream" &&
      ALLOWED_IMAGE_TYPES.has(declaredMime) &&
      declaredMime !== detectedMime
    ) {
      return NextResponse.json(
        { error: "El formato declarado no coincide con el contenido de la imagen." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true },
    });
    if (!user?.accountId) {
      return NextResponse.json({ error: "Cuenta no disponible" }, { status: 400 });
    }

    let targetProfileId = requestedProfileId;
    let previousPhotoUrl: string | null = null;

    if (requestedProfileId) {
      const profile = await prisma.profile.findUnique({
        where: { id: requestedProfileId },
        select: { id: true, accountId: true, photoUrl: true },
      });

      if (!profile || profile.accountId !== user.accountId) {
        return NextResponse.json(
          { error: "No autorizado para modificar este perfil" },
          { status: 403 }
        );
      }

      previousPhotoUrl = profile.photoUrl;
    } else {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true, accountId: true, photoUrl: true },
      });

      if (profile && profile.accountId !== user.accountId) {
        return NextResponse.json(
          { error: "No autorizado para modificar este perfil" },
          { status: 403 }
        );
      }

      if (profile) {
        targetProfileId = profile.id;
        previousPhotoUrl = profile.photoUrl;
      }
    }

    const path = `${userId}/profile_${Date.now()}`;
    const publicUrl = await optimizeAndUploadImage(
      buffer,
      "profile-photos",
      path,
      { width: 400, height: 400, quality: 80 }
    );

    try {
      if (targetProfileId) {
        await prisma.profile.update({
          where: { id: targetProfileId },
          data: { photoUrl: publicUrl },
        });
      } else {
        const created = await prisma.profile.upsert({
          where: { userId },
          update: { photoUrl: publicUrl },
          create: {
            userId,
            accountId: user.accountId,
            photoUrl: publicUrl,
            firstName: "",
            lastName: "",
            bloodType: "Pendiente",
          },
          select: { id: true },
        });
        targetProfileId = created.id;
      }
    } catch (error) {
      await cleanupUploadedObjectOrRecordOrphan(publicUrl, {
        actorUserId: userId,
        accountId: user.accountId,
      }).catch(() => null);
      throw error;
    }

    if (previousPhotoUrl && previousPhotoUrl !== publicUrl) {
      await cleanupUploadedObjectOrRecordOrphan(previousPhotoUrl, {
        actorUserId: userId,
        accountId: user.accountId,
      }).catch(() => null);
    }

    const url = publicUrl.includes("?")
      ? `${publicUrl}&_t=${Date.now()}`
      : `${publicUrl}?_t=${Date.now()}`;

    return NextResponse.json({ url, profileId: targetProfileId });
  } catch (error) {
    console.error("PROFILE_PHOTO_UPLOAD_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo procesar la imagen" },
      { status: 500 }
    );
  }
}
