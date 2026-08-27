import { NextResponse } from "next/server";
import {
  getYappyButtonScriptUrl,
  getYappyConfig,
  YappyConfigurationError,
} from "@/lib/payments/yappy";

export async function GET() {
  try {
    getYappyConfig();
    return NextResponse.json({
      available: true,
      buttonScriptUrl: getYappyButtonScriptUrl(),
    });
  } catch (error) {
    if (error instanceof YappyConfigurationError) {
      return NextResponse.json({ available: false });
    }
    throw error;
  }
}
