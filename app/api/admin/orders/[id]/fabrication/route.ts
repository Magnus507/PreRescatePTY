import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["admin", "superadmin", "imprenta"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      organization: {
        select: {
          legalName: true,
          displayName: true,
        },
      },
      corporateEmployeeItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              productType: true,
            },
          },
          chip: {
            select: {
              id: true,
              shortCode: true,
              serialPublic: true,
              qrUrl: true,
              status: true,
            },
          },
          organizationMember: {
            select: {
              id: true,
              employeePosition: true,
              employeeNationalId: true,
              corporateProfileId: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json(
      { error: "Esta orden no es una compra corporativa" },
      { status: 400 }
    );
  }

  const items = order.corporateEmployeeItems.map((item) => ({
    itemId: item.id,
    productName: item.product.name,
    productType: item.product.productType,
    quantity: item.quantity,
    fulfillmentStatus: item.fulfillmentStatus,
    organizationMemberId: item.organizationMember.id,
    collaboratorName:
      item.organizationMember.profile
        ? `${item.organizationMember.profile.firstName} ${item.organizationMember.profile.lastName}`
        : "—",
    employeePosition: item.organizationMember.employeePosition || "—",
    employeeNationalId: item.organizationMember.employeeNationalId || "—",
    corporateProfileId: item.organizationMember.corporateProfileId || null,
    chipId: item.chip?.id || null,
    chipShortCode: item.chip?.shortCode || null,
    chipQrUrl: item.chip?.qrUrl || null,
    chipStatus: item.chip?.status || null,
    publicLink: item.chip?.shortCode
      ? `/e/${item.chip.shortCode}`
      : null,
  }));

  // Resumen por tipo de producto
  const summaryByProductType: Record<string, number> = {};
  for (const item of items) {
    const type = item.productType || "otro";
    summaryByProductType[type] = (summaryByProductType[type] || 0) + item.quantity;
  }

  // Calcular materiales necesarios (runtime, no persistido)
  const chipsNfc = (summaryByProductType.initial_chip || 0) + (summaryByProductType.sticker_nfc_qr || 0);
  const pulseras = summaryByProductType.bracelet || 0;
  const credenciales = summaryByProductType.credential || 0;
  const stickers = summaryByProductType.sticker_nfc_qr || 0;
  const totalProductos = items.reduce((sum, i) => sum + i.quantity, 0);

  const materialSummary = {
    chipsNfc,
    pulseras,
    credenciales,
    stickers,
    sobresActivacion: chipsNfc,
    cajasCorporativas: Math.max(1, Math.ceil(totalProductos / 10)),
    lanyards: credenciales,
  };

  return NextResponse.json({
    orderNumber: order.orderNumber,
    companyName: order.organization?.displayName || order.organization?.legalName || "—",
    totalItems: items.length,
    summaryByProductType,
    materialSummary,
    items,
  });
}