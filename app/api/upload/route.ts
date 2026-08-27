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

/**
 * Some legacy browser bundles sent `multipart/form-data` without the boundary
 * parameter. `Request.formData()` cannot parse that even though the boundary
 * is still present in the multipart body. Recover it from the first body line
 * so old clients can finish their upload while the canonical signed-upload
 * flow replaces this endpoint for payment proofs.
 */
async function parseMultipartFormData(req: NextRequest): Promise<FormData> {
  const contentType = req.headers.get("content-type") || "";
  if (/multipart\/form-data\s*;[^;]*boundary=/i.test(contentType)) {
    return req.formData();
  }

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error("INVALID_MULTIPART_CONTENT_TYPE");
  }

  const body = await req.arrayBuffer();
  const bodyBuffer = Buffer.from(body);
  const firstLineEnd = bodyBuffer.indexOf(Buffer.from("\r\n"));
  if (firstLineEnd <= 2) {
    throw new Error("MULTIPART_BOUNDARY_NOT_FOUND");
  }

  const firstLine = bodyBuffer.subarray(0, firstLineEnd).toString("utf8");
  if (!firstLine.startsWith("--") || firstLine.length > 200) {
    throw new Error("MULTIPART_BOUNDARY_NOT_FOUND");
  }

  const boundary = firstLine.slice(2);
  if (!/^[0-9A-Za-z'()+_,\-.\/:=?]{1,180}$/.test(boundary)) {
    throw new Error("INVALID_MULTIPART_BOUNDARY");
  }

  const repairedHeaders = new Headers(req.headers);
  repairedHeaders.set("content-type", `multipart/form-data; boundary=${boundary}`);
  const repairedRequest = new Request(req.url, {
    method: "POST",
    headers: repairedHeaders,
    body,
  });
  return repairedRequest.formData();
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

    const formData = await parseMultipartFormData(req);
    const file = formData.get("file");
    bucketName = String(formData.get("bucket") || "general");
    const type = String(formData.get("type") || ""); // 'profile' or 'payment'

    if (!(file instanceof File) || file.size <= 0) {
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

    // P0 SECURITY: Validate magic bytes before any processing.
    const detectedMime = detectImageMagicBytes(buffer);
    if (!detectedMime || detectedMime !== file.type) {
      return NextResponse.json(
        { error: "Archivo inválido: el contenido no corresponde a una imagen permitida." },
        { status: 400 }
      );
    }

    // Determine path and optimization settings.
    let path = `${userId}/${Date.now()}`;
    let options: { width?: number; height?: number; quality?: number } = { width: 800, quality: 75 };

    if (type === "profile") {
      path = `${userId}/profile_${Date.now()}`;
      options = { width: 400, height: 400, quality: 80 };
    } else if (type === "payment") {
      const requestedOrderId = String(formData.get("orderId") || "").trim();
      if (requestedOrderId) {
        const ownedOrder = await prisma.order.findFirst({
          where: { id: requestedOrderId, userId },
          select: { id: true },
        });
        if (!ownedOrder) {
          return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
        }
        path = `payments/${userId}/${requestedOrderId}/${Date.now()}`;
      } else {
        // Compatibility for already-loaded legacy clients.
        path = `payments/${userId}/${Date.now()}`;
      }
      options = { width: 1200, quality: 70 };
    }

    const publicUrl = await optimizeAndUploadImage(buffer, bucketName, path, options);

    // If it's a profile photo, update the profile automatically.
    if (type === "profile") {
      const targetProfileId = String(formData.get("profileId") || "").trim();
      try {
        if (targetProfileId) {
          // Verify ownership: profile must belong to the same account as the user.
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { accountId: true },
          });
          const profile = await prisma.profile.findUnique({
            where: { id: targetProfileId },
            select: { accountId: true },
          });

          if (user?.accountId && user.accountId === profile?.accountId) {
            await prisma.profile.update({
              where: { id: targetProfileId },
              data: { photoUrl: publicUrl },
            });
          }
        } else {
          // Default to current user's profile.
          await prisma.profile.upsert({
            where: { userId },
            update: { photoUrl: publicUrl },
            create: {
              userId,
              photoUrl: publicUrl,
              firstName: "",
              lastName: "",
              bloodType: "Pendiente",
            },
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

    if (
      error.message === "INVALID_MULTIPART_CONTENT_TYPE" ||
      error.message === "MULTIPART_BOUNDARY_NOT_FOUND" ||
      error.message === "INVALID_MULTIPART_BOUNDARY"
    ) {
      return NextResponse.json(
        { error: "Solicitud de archivo inválida. Recarga la página e intenta nuevamente." },
        { status: 400 }
      );
    }

    if (error.message?.includes("bucket")) {
      return NextResponse.json(
        {
          error: `El baúl '${bucketName}' no existe. Asegúrate de crearlo en el panel de Supabase.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ error: "No se pudo procesar la imagen" }, { status: 500 });
  }
}
