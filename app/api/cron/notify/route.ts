import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const disabledResponse = {
  disabled: true,
  processed: 0,
  sent: 0,
  failed: 0,
  message: "Las notificaciones automáticas están deshabilitadas.",
};

export async function POST() {
  return NextResponse.json(disabledResponse);
}

export async function GET() {
  return NextResponse.json(disabledResponse);
}
