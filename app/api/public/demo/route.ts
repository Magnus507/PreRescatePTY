import { NextResponse } from "next/server";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";

export async function GET() {
  try {
    const shortCode = await ConfigRepository.get("demo_profile_shortcode");

    if (!shortCode) {
      return NextResponse.json({ shortCode: "44R6DBNQ" });
    }

    return NextResponse.json({ shortCode });
  } catch {
    return NextResponse.json({ shortCode: "44R6DBNQ" });
  }
}
