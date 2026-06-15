import { NextResponse } from "next/server";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";

const DEMO_SHORT_CODE = "DEMO-ADMIN-VIP";

export async function GET() {
  try {
    const shortCode = await ConfigRepository.get("demo_profile_shortcode");

    if (!shortCode) {
      return NextResponse.json({ shortCode: DEMO_SHORT_CODE });
    }

    return NextResponse.json({ shortCode });
  } catch {
    return NextResponse.json({ shortCode: DEMO_SHORT_CODE });
  }
}
