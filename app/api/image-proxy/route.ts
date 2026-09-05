import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PUBLIC_BUCKETS = new Set(["general", "profile-photos"]);
const AUTHENTICATED_BUCKETS = new Set(["payment-proofs"]);
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_.,=-]{0,240}\.(?:jpg|jpeg|png|webp)$/i;

function getFrontendCorsOrigin(req: NextRequest) {
  const requestOrigin = req.headers.get("origin");
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const currentOrigin = req.nextUrl.origin;

  if (requestOrigin && (requestOrigin === appOrigin || requestOrigin === currentOrigin)) {
    return requestOrigin;
  }

  return appOrigin || currentOrigin;
}

/**
 * PROXY ENDPOINT: Sirve imágenes de Supabase Storage
 * Evita problemas de CORS y cachea correctamente
 * 
 * Uso: /api/image-proxy?bucket=profile-photos&path=userId/filename
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit: 200 req/min per IP for image proxy (mitigates egress cost attacks)
    const ip = getClientIp(req, "image-proxy");
    const rl = await rateLimit("image-proxy", ip, {
      limit: 200,
      windowMs: 60_000,
      productionFailureMode: "memory",
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta nuevamente." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket");
    const path = searchParams.get("path");

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "Missing bucket or path parameter" },
        { status: 400 }
      );
    }

    if (!PUBLIC_BUCKETS.has(bucket) && !AUTHENTICATED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { error: "Bucket not allowed" },
        { status: 403 }
      );
    }

    if (
      path.includes("..") ||
      path.startsWith("/") ||
      path.includes("\\") ||
      !SAFE_PATH_PATTERN.test(path)
    ) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    if (AUTHENTICATED_BUCKETS.has(bucket)) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }

      const role = session.user.role;
      const isAdmin = role === "admin" || role === "superadmin";
      const userId = session.user.id;
      const isOwnPaymentProof =
        bucket === "payment-proofs" &&
        (path.startsWith(`payments/${userId}/`) || path.startsWith(`payments/${userId}_`));

      if (!isAdmin && !isOwnPaymentProof) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 403 }
        );
      }
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Storage configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download file from Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      console.error(`[IMAGE_PROXY] Error downloading ${path}:`, error);
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await data.arrayBuffer());

    // Determine content type based on bucket
    let contentType = data.type || "image/webp";
    if (path.endsWith(".png")) contentType = "image/png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) contentType = "image/jpeg";
    if (path.endsWith(".webp")) contentType = "image/webp";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": AUTHENTICATED_BUCKETS.has(bucket)
        ? "private, no-store, max-age=0"
        : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (AUTHENTICATED_BUCKETS.has(bucket)) {
      headers["Access-Control-Allow-Origin"] = getFrontendCorsOrigin(req);
      headers["Vary"] = "Origin";
    } else {
      headers["Access-Control-Allow-Origin"] = "*";
    }

    return new NextResponse(buffer, {
      headers,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[IMAGE_PROXY] Error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
