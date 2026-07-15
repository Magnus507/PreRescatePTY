import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { requireActiveAccountSession } from "@/lib/rbac";
import { multiplyMoney, parseMoney, serializeMoney } from "@/lib/money";
import { z } from "zod";

const createRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
        note: z.string().optional(),
      })
    )
    .min(1, "Debes solicitar al menos un producto."),
});

// GET /api/organizations/product-requests
// Company sees requests from their collaborators.
// Optional query: ?status=pending_company_approval
export async function GET(req: NextRequest) {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;

  const organization = await prisma.organization.findFirst({
    where: { accountId: auth.current.accountId },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const where: Record<string, unknown> = {
    organizationId: organization.id,
  };

  if (statusFilter) {
    where.status = statusFilter;
  }

  const requests = await prisma.corporateProductRequest.findMany({
    where,
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, price: true, productType: true },
          },
        },
      },
      organizationMember: {
        select: {
          id: true,
          employeeNationalId: true,
          employeePosition: true,
          employeeDepartment: true,
          profile: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
      },
      requestedBy: {
        select: { id: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map((request) => ({
      ...request,
      items: request.items.map((item) => ({
        ...item,
        unitPrice: serializeMoney(item.unitPrice),
        subtotal: serializeMoney(item.subtotal),
        product: {
          ...item.product,
          price: serializeMoney(item.product.price),
        },
      })),
    })),
  });
}

// POST /api/organizations/product-requests
// Employee creates a product request.
export async function POST(req: NextRequest) {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;
  const userId = auth.session.user.id;

  // Rate limit: 10 product requests per minute per user
  const limiter = await rateLimit("product-request", userId, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = createRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Datos inválidos" },
      { status: 400 }
    );
  }

  const { items } = parsed.data;

  // Validate products exist and are active, read prices from DB
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, price: true, name: true, productType: true },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: "Uno o más productos no existen o están inactivos." },
      { status: 400 }
    );
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const includesInitialChip = products.some((p) => p.productType === "initial_chip");
  const includesOtherProducts = products.some((p) => p.productType !== "initial_chip");
  const isInitialChipOnly = includesInitialChip && !includesOtherProducts;

  if (includesInitialChip && includesOtherProducts) {
    return NextResponse.json(
      { error: "No puedes mezclar el primer chip empresarial con otros productos." },
      { status: 400 }
    );
  }

  if (isInitialChipOnly && items.some((item) => item.quantity !== 1)) {
    return NextResponse.json(
      { error: "Solo puedes solicitar un primer chip empresarial." },
      { status: 400 }
    );
  }

  // Anti-duplicado: evitar múltiples solicitudes de primer chip
  if (isInitialChipOnly) {
    const existingInitialChipRequest = await prisma.corporateProductRequest.findFirst({
      where: {
        organizationMember: {
          profile: { userId },
        },
        status: {
          in: [
            "pending_company_approval",
            "approved_pending_payment",
            "payment_under_review",
            "paid_approved",
          ],
        },
        items: {
          some: {
            product: { productType: "initial_chip" },
          },
        },
      },
      select: { id: true },
    });

    if (existingInitialChipRequest) {
      return NextResponse.json(
        { error: "Ya tienes una solicitud de primer chip empresarial registrada." },
        { status: 409 }
      );
    }

    const existingInitialChipOrderItem = await prisma.corporateOrderEmployeeItem.findFirst({
      where: {
        organizationMember: {
          profile: { userId },
        },
        product: { productType: "initial_chip" },
      },
      select: { id: true },
    });

    if (existingInitialChipOrderItem) {
      return NextResponse.json(
        { error: "Ya tienes una solicitud de primer chip empresarial registrada." },
        { status: 409 }
      );
    }
  }

  // Bloquear accesorios hasta que el primer chip esté activado
  if (!isInitialChipOnly) {
    const hasActivatedInitialChip = await prisma.corporateOrderEmployeeItem.findFirst({
      where: {
        organizationMember: {
          profile: { userId },
        },
        product: { productType: "initial_chip" },
        fulfillmentStatus: "activated",
        chipId: { not: null },
      },
      select: { id: true },
    });

    if (!hasActivatedInitialChip) {
      return NextResponse.json(
        { error: "Debes activar tu primer chip empresarial antes de solicitar accesorios." },
        { status: 403 }
      );
    }
  }

  const allowedCorporateStatuses = isInitialChipOnly
    ? ["approved_unpaid", "paid_active"]
    : ["paid_active"];

  // Find the employee's organization membership with the status required for this request type.
  const member = await prisma.organizationMember.findFirst({
    where: {
      profile: { userId },
      corporateStatus: { in: allowedCorporateStatuses },
    },
    select: {
      id: true,
      organizationId: true,
      corporateStatus: true,
      organization: { select: { status: true } },
    },
  });

  if (!member) {
    return NextResponse.json(
      { error: "No tienes un vínculo empresarial activo para solicitar productos." },
      { status: 403 }
    );
  }

  if (member.organization.status !== "active") {
    return NextResponse.json(
      { error: "Tu organización no está habilitada para recibir solicitudes." },
      { status: 403 }
    );
  }

  // Build request items with prices from DB
  const requestItems = items.map((item) => {
    const product = productMap.get(item.productId)!;
    const subtotal = multiplyMoney(product.price, item.quantity);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: parseMoney(product.price),
      subtotal,
      note: item.note || null,
    };
  });

  // Create the request with items in a transaction
  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.corporateProductRequest.create({
      data: {
        organizationId: member.organizationId,
        organizationMemberId: member.id,
        requestedByUserId: userId,
        status: "pending_company_approval",
        items: {
          createMany: {
            data: requestItems,
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, productType: true },
            },
          },
        },
      },
    });

    return created;
  });

  return NextResponse.json(
    {
      request: {
        ...request,
        items: request.items.map((item) => ({
          ...item,
          unitPrice: serializeMoney(item.unitPrice),
          subtotal: serializeMoney(item.subtotal),
          product: {
            ...item.product,
            price: serializeMoney(item.product.price),
          },
        })),
      },
    },
    { status: 201 }
  );
}
