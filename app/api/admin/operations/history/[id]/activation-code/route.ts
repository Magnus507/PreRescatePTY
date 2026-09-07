import { NextResponse } from "next/server";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { decryptSensitiveValue } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { requireRole, SUPERADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(SUPERADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  if (req.headers.get("x-prerescate-reveal") !== "activation-code") {
    return NextResponse.json(
      { error: "Solicitud de revelado inválida" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { id } = await params;
  const url = new URL(req.url);
  const unitId = url.searchParams.get("unitId")?.trim();
  if (!unitId) {
    return NextResponse.json(
      { error: "Unidad requerida" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const now = new Date();
    const order = await prisma.operationCommercialOrder.findUnique({
      where: { id },
      select: {
        id: true,
        dispatch: {
          select: {
            items: {
              select: {
                unitRecord: {
                  select: {
                    id: true,
                    internalLabel: true,
                    activationStatus: true,
                    chip: {
                      select: {
                        claimTokens: {
                          where: {
                            status: "active",
                            usedAt: null,
                            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                          },
                          orderBy: { createdAt: "desc" },
                          take: 1,
                          select: {
                            id: true,
                            activationCode: true,
                            expiresAt: true,
                            status: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido histórico no encontrado" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const unit = order.dispatch?.items
      .map((item) => item.unitRecord)
      .find((candidate) => candidate?.id === unitId);

    if (!unit) {
      return NextResponse.json(
        { error: "La unidad no pertenece a este pedido" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const claimToken = unit.chip?.claimTokens[0];
    if (!claimToken?.activationCode) {
      return NextResponse.json(
        { error: "No hay un código de activación vigente disponible para esta unidad" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    // Activation codes are encrypted at rest. Decrypt only for this explicit,
    // superadmin-only support action. Plaintext legacy rows remain readable
    // while older data is migrated, but the stored value is never logged.
    const activationCode = decryptSensitiveValue(claimToken.activationCode, {
      allowPlaintextLegacy: true,
    }).plaintext;

    await writeAuditLog(prisma, {
      actorUserId: auth.session.user.id,
      entityType: "operation_finished_good_unit",
      entityId: unit.id,
      action: "activation_code_revealed",
      requestId: getAuditRequestId(req),
      after: {
        orderId: order.id,
        unitLabel: unit.internalLabel,
        activationStatus: unit.activationStatus,
        claimTokenId: claimToken.id,
        claimTokenStatus: claimToken.status,
      },
    });

    return NextResponse.json(
      {
        activationCode,
        expiresAt: claimToken.expiresAt?.toISOString() || null,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    console.error("[operations/history/:id/activation-code] POST failed");
    return NextResponse.json(
      { error: "No se pudo revelar el código de activación" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
