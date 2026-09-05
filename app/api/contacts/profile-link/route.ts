import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveAccountSession } from "@/lib/rbac";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

export const dynamic = "force-dynamic";
const ids = { profileId: z.string().min(1).max(128), contactId: z.string().min(1).max(128) };
const actionSchema = z.object({ ...ids, action: z.enum(["link", "unlink"]) }).strict();
const patchSchema = z.object({
  ...ids,
  relationship: z.string().trim().min(1).max(100).optional(),
  priorityOrder: z.number().int().min(1).max(3).optional(),
  notifySms: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifyWhatsapp: z.boolean().optional(),
  active: z.boolean().optional(),
}).strict();

async function mutate(req: NextRequest, method: "POST" | "PATCH") {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;
  const parsed = (method === "POST" ? actionSchema : patchSchema).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { profileId, contactId } = parsed.data;
  const accountId = auth.current.accountId;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findFirst({ where: { id: profileId, accountId }, select: { id: true } });
      if (!profile) return null;
      const contact = await tx.contact.findFirst({ where: { id: contactId, user: { accountId } }, select: { id: true } });
      if (!contact) return null;
      const where = { profileId_contactId: { profileId, contactId } };
      const existing = await tx.profileContact.findUnique({ where });
      if (method === "PATCH") {
        if (!existing) return null;
        const data = patchSchema.omit({ profileId: true, contactId: true }).parse(Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key !== "profileId" && key !== "contactId")));
        return tx.profileContact.update({ where, data });
      }
      const { action } = actionSchema.parse(parsed.data);
      if (action === "unlink") {
        if (!existing) return null;
        await tx.profileContact.delete({ where });
        return { id: existing.id };
      }
      // Updating the profile row serializes link additions for the per-profile limit.
      await tx.profile.update({ where: { id: profileId }, data: { updatedAt: new Date() } });
      const count = await tx.profileContact.count({ where: { profileId } });
      if (!existing && count >= 3) throw new Error("CONTACT_LIMIT");
      return tx.profileContact.upsert({ where, update: { active: true }, create: { profileId, contactId, relationship: "Familiar", priorityOrder: count + 1 } });
    });
    if (!result) return NextResponse.json({ error: "Vínculo no encontrado" }, { status: 404 });
    await AccountStateService.invalidateCache(auth.session.user.id);
    return NextResponse.json({ success: true, pc: result });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTACT_LIMIT") return NextResponse.json({ error: "Límite de 3 contactos alcanzado" }, { status: 400 });
    return NextResponse.json({ error: "No se pudo actualizar el contacto" }, { status: 500 });
  }
}
export async function POST(req: NextRequest) { return mutate(req, "POST"); }
export async function PATCH(req: NextRequest) { return mutate(req, "PATCH"); }
