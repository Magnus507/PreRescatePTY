import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { optimizeAndUploadImage } from "@/lib/storage-utils";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

const ALLOWED_BUCKETS = new Set(["general", "profile-photos"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function detectImageMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.slice(0, 8).equals(pngSignature)) return "image/png";

  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  return null;
}

async function parseMultipartFormData(req: NextRequest): Promise<FormData> {
  const contentType = req.headers.get("content-type") || "";
  if (/multipart\/form-data\s*;[^;]*boundary=/i.test(contentType)) return req.formData();
  if (!contentType.toLowerCase().includes("multipart/form-data")) throw new Error("INVALID_MULTIPART_CONTENT_TYPE");

  const body = await req.arrayBuffer();
  const bodyBuffer = Buffer.from(body);
  const firstLineEnd = bodyBuffer.indexOf(Buffer.from("\r\n"));
  if (firstLineEnd <= 2) throw new Error("MULTIPART_BOUNDARY_NOT_FOUND");

  const firstLine = bodyBuffer.subarray(0, firstLineEnd).toString("utf8");
  if (!firstLine.startsWith("--") || firstLine.length > 200) throw new Error("MULTIPART_BOUNDARY_NOT_FOUND");

  const boundary = firstLine.slice(2);
  if (!/^[0-9A-Za-z'()+_,\-.\/:=?]{1,180}$/.test(boundary)) throw new Error("INVALID_MULTIPART_BOUNDARY");

  const headers = new Headers(req.headers);
  headers.set("content-type", `multipart/form-data; boundary=${boundary}`);
  return new Request(req.url, { method: "POST", headers, body }).formData();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  let bucketName = "general";

  try {
    const ip = getClientIp(req, `upload:${userId}`);
    const limiter = await rateLimit("upload", `${userId}:${ip}`, { limit: 20, windowMs: 60_000 * 15 });
    if (!limiter.allowed) return NextResponse.json({ error: "Demasiadas cargas. Intenta más tarde." }, { status: 429 });

    const formData = await parseMultipartFormData(req);
    const file = formData.get("file");
    const type = String(formData.get("type") || "");
    bucketName = type === "profile" ? "profile-photos" : String(formData.get("bucket") || "general");

    if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    if (!ALLOWED_BUCKETS.has(bucketName)) return NextResponse.json({ error: "Destino de carga inválido" }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: "Solo se permiten imágenes JPG, PNG o WebP" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "El archivo supera el límite de 5MB" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectImageMagicBytes(buffer);
    if (!detectedMime || detectedMime !== file.type) {
      return NextResponse.json({ error: "El contenido no corresponde a una imagen permitida" }, { status: 400 });
    }

    let path = `${userId}/${Date.now()}`;
    let options: { width?: number; height?: number; quality?: number } = { width: 800, quality: 75 };

    if (type === "profile") {
      path = `${userId}/profile_${Date.now()}`;
      options = { width: 400, height: 400, quality: 80 };
    }

    const publicUrl = await optimizeAndUploadImage(buffer, bucketName, path, options);

    if (type === "profile") {
      const targetProfileId = String(formData.get("profileId") || "").trim();
      try {
        if (targetProfileId) {
          const [user, profile] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { accountId: true } }),
            prisma.profile.findUnique({ where: { id: targetProfileId }, select: { accountId: true } }),
          ]);
          if (user?.accountId && user.accountId === profile?.accountId) {
            await prisma.profile.update({ where: { id: targetProfileId }, data: { photoUrl: publicUrl } });
          }
        } else {
          await prisma.profile.upsert({
            where: { userId },
            update: { photoUrl: publicUrl },
            create: { userId, photoUrl: publicUrl, firstName: "", lastName: "", bloodType: "Pendiente" },
          });
        }
      } catch (error) {
        console.error("PROFILE_PHOTO_UPDATE_ERROR", error);
      }
    }

    const url = publicUrl.includes("?") ? `${publicUrl}&_t=${Date.now()}` : `${publicUrl}?_t=${Date.now()}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("UPLOAD_HANDLER_ERROR", error);
    const message = error instanceof Error ? error.message : "";
    if (["INVALID_MULTIPART_CONTENT_TYPE", "MULTIPART_BOUNDARY_NOT_FOUND", "INVALID_MULTIPART_BOUNDARY"].includes(message)) {
      return NextResponse.json({ error: "Solicitud de archivo inválida. Recarga la página e intenta nuevamente." }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo procesar la imagen" }, { status: 500 });
  }
}
