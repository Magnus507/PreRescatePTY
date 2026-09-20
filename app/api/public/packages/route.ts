import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 * Packages are no longer a sellable concept; the public catalog is device/product based.
 */
export async function GET() {
  return NextResponse.json(
    { packages: [], deprecated: true },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
