import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data");

  if (!data) {
    console.error("[QR_GENERATOR] Missing data parameter");
    return new NextResponse("Missing data", { status: 400 });
  }

  try {
    // Generate QR code locally as a buffer (using PNG format)
    // We use a decent width and small margin for clean looks
    const buffer = await QRCode.toBuffer(data, {
      margin: 1,
      width: 600,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: 'H' // High error correction for better scanning
    });

    console.log("[QR_GENERATOR] Successfully generated locally for:", data.substring(0, 30) + "...");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff"
      },
    });
  } catch (error: any) {
    console.error("[QR_GENERATOR] Critical failure:", error.message);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
