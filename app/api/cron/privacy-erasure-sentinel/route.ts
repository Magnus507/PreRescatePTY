import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { SafeDeleteService } from "@/domains/users/services/safe-delete.service";

export const dynamic = "force-dynamic";

const SENTINEL_ID = /^b3sentinel_[a-z0-9_-]+$/i;
const SENTINEL_EMAIL_DOMAIN = "prerescatepty.com";
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2QAAAABJRU5ErkJggg==",
  "base64",
);

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

function expectedSentinelEmail(userId: string) {
  return `${userId}@${SENTINEL_EMAIL_DOMAIN}`.toLowerCase();
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { userId?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!SENTINEL_ID.test(userId)) {
    return NextResponse.json({ error: "Sentinel inválido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { select: { id: true } },
      orders: { orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
    },
  });
  if (
    !user ||
    user.email.trim().toLowerCase() !== expectedSentinelEmail(userId) ||
    !user.profile ||
    !user.orders[0]
  ) {
    return NextResponse.json({ error: "Sentinel incompleto" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Storage/Auth no configurado" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const orderId = user.orders[0].id;
  const generalPath = `${userId}/b3-sentinel-general.png`;
  const photoPath = `${userId}/b3-sentinel-photo.png`;
  const proofPath = `payments/${userId}/${orderId}/b3-sentinel-proof.png`;

  const authCreated = await supabase.auth.admin.createUser({
    email: user.email,
    password: randomBytes(24).toString("hex"),
    email_confirm: true,
  });
  const authUserId = authCreated.data.user?.id;
  if (authCreated.error || !authUserId) {
    const diagnostic = {
      name: authCreated.error?.name ?? null,
      status: authCreated.error?.status ?? null,
    };
    console.error("B3_SENTINEL_AUTH_CREATE_ERROR", diagnostic);
    return NextResponse.json({
      error: "No se pudo crear Auth sentinel",
      authError: diagnostic,
    }, { status: 500 });
  }

  const uploads = await Promise.all([
    supabase.storage.from("general").upload(generalPath, PNG_1X1, { contentType: "image/png", upsert: false }),
    supabase.storage.from("profile-photos").upload(photoPath, PNG_1X1, { contentType: "image/png", upsert: false }),
    supabase.storage.from("payment-proofs").upload(proofPath, PNG_1X1, { contentType: "image/png", upsert: false }),
  ]);
  if (uploads.some((result) => result.error)) {
    await Promise.allSettled([
      supabase.storage.from("general").remove([generalPath]),
      supabase.storage.from("profile-photos").remove([photoPath]),
      supabase.storage.from("payment-proofs").remove([proofPath]),
      supabase.auth.admin.deleteUser(authUserId),
    ]);
    return NextResponse.json({ error: "No se pudo crear Storage sentinel" }, { status: 500 });
  }

  await prisma.$transaction([
    prisma.profile.update({
      where: { id: user.profile.id },
      data: { photoUrl: `${supabaseUrl}/storage/v1/object/public/profile-photos/${photoPath}` },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProofUrl: `/api/image-proxy?bucket=payment-proofs&path=${encodeURIComponent(proofPath)}`,
      },
    }),
  ]);

  const deleted = await SafeDeleteService.deleteUserAccount(userId, userId);

  const [authPage, general, photos, proofs] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.storage.from("general").list(userId, { limit: 100 }),
    supabase.storage.from("profile-photos").list(userId, { limit: 100 }),
    supabase.storage.from("payment-proofs").list(`payments/${userId}/${orderId}`, { limit: 100 }),
  ]);

  const authResidual = authPage.error
    ? -1
    : authPage.data.users.filter((row) => row.email?.toLowerCase() === user.email.toLowerCase()).length;
  const generalResidual = general.error ? -1 : (general.data ?? []).length;
  const photoResidual = photos.error ? -1 : (photos.data ?? []).length;
  const retainedLegalProofs = proofs.error ? -1 : (proofs.data ?? []).length;
  const ok = deleted && authResidual === 0 && generalResidual === 0 && photoResidual === 0 && retainedLegalProofs === 1;

  return NextResponse.json({
    ok,
    safeDeleteCompleted: deleted,
    authResidual,
    deleteOnErasureStorageResidual: generalResidual + photoResidual,
    retainedLegalPaymentProofCount: retainedLegalProofs,
  }, { status: ok ? 200 : 500 });
}
