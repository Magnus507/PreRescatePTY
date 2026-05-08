import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PUBLIC_BUCKETS = new Set(["general", "profile-photos"]);
const AUTHENTICATED_BUCKETS = new Set(["payment-proofs"]);
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_.,=-]{0,240}\.(?:jpg|jpeg|png|webp)$/i;

/**
 * PROXY ENDPOINT: Sirve imágenes de Supabase Storage
 * Evita problemas de CORS y cachea correctamente
 * 
 * Uso: /api/image-proxy?bucket=profile-photos&path=userId/filename
 */
export async function GET(req: NextRequest) {
  try {
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

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*", // CORS
      },
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
