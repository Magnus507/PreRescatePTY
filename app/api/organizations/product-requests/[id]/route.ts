import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

// PATCH /api/organizations/product-requests/[id]
// Company approves or rejects a product request.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId || !session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const adminUserId = session.user.id;

  const limitResult = await rateLimit("product-request-review", adminUserId, { limit: 20, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  // Verify the session user belongs to an organization
  const organization = await prisma.organization.findFirst({
    where: { accountId: session.user.accountId },
    select: { id: true, status: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  if (organization.status !== "active") {
    return NextResponse.json({ error: "Organización inactiva" }, { status: 400 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Acción inválida" },
      { status: 400 }
    );
  }

  const { action, rejectionReason } = parsed.data;

  // Fetch the product request and verify it belongs to this organization
  const request = await prisma.corporateProductRequest.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      status: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (request.organizationId !== organization.id) {
    return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
  }

  if (request.status !== "pending_company_approval") {
    return NextResponse.json(
      { error: "Esta solicitud ya fue revisada o cancelada." },
      { status: 400 }
    );
  }

  const now = new Date();
  const newStatus = action === "approve" ? "approved_pending_payment" : "rejected_by_company";

  const updated = await prisma.corporateProductRequest.update({
    where: { id },
    data: {
      status: newStatus,
      companyReviewedAt: now,
      companyReviewedById: adminUserId,
      rejectionReason: action === "reject" ? (rejectionReason || null) : null,
    },
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
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return NextResponse.json({ request: updated });
}