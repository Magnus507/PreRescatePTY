import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { FinishedGoodUnitActionSchema, getFirstValidationMessage } from "../finished-good-units.helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id } = await params;
  const unit = await prisma.operationFinishedGoodUnit.findUnique({
    where: { id },
    include: {
      digitalBatch: true,
      digitalBatchItem: true,
      printOrder: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!unit) return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
  return NextResponse.json({ unit });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = FinishedGoodUnitActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });

  const unit = await prisma.operationFinishedGoodUnit.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!unit) return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });

  const nextStatus = parsed.data.action === "qa_pass" ? "qa_passed" : "qa_failed";
  await prisma.operationFinishedGoodUnit.update({
    where: { id },
    data: {
      status: nextStatus,
      qaStatus: parsed.data.action === "qa_pass" ? "passed" : "failed",
      events: {
        create: {
          eventType: parsed.data.action === "qa_pass" ? "QA_PASSED" : "QA_FAILED",
          reason: parsed.data.reason || null,
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
