import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const {
    companyCode,
    firstName,
    lastName,
    employeeNationalId,
    employeeAge,
    employeePhone,
    employeePosition,
    employeeDepartment,
    employeeInternalId,
    employeeNote,
  } = await req.json();

  if (!companyCode) {
    return NextResponse.json({ error: "Código empresarial requerido" }, { status: 400 });
  }

  const normalizedCode = String(companyCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  const organization = await prisma.organization.findUnique({ where: { companyCode: normalizedCode } });

  if (!organization) {
    return NextResponse.json({ error: "Código empresarial no encontrado." }, { status: 404 });
  }
  if (organization.status === "suspended" || organization.status === "archived") {
    return NextResponse.json({ error: "Esta empresa no está habilitada para nuevas solicitudes." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Always use existing personal profile (never overwrite personal data)
  let profileId = user.profile?.id;
  if (!profileId) {
    const personalProfile = await prisma.profile.create({
      data: {
        userId: user.id,
        accountId: user.accountId || null,
        firstName: firstName || "Pendiente",
        lastName: lastName || "Pendiente",
        bloodType: "Pendiente",
        profileType: "personal",
      },
    });
    profileId = personalProfile.id;
  }
  // NOTE: Do NOT update firstName/lastName of personal profile

  const existing = await prisma.organizationMember.findFirst({
    where: {
      organizationId: organization.id,
      profileId,
      corporateStatus: { in: ["pending_company_review", "approved_unpaid", "paid_active", "suspended", "archived"] },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya tienes una solicitud/vinculación activa con esta empresa." }, { status: 409 });
  }

  // Create the OrganizationMember with personal profile reference
  const member = await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      profileId,
      corporateStatus: "pending_company_review",
      employeeNationalId: employeeNationalId || null,
      employeeAge: employeeAge ? Number(employeeAge) : null,
      employeePhone: employeePhone || null,
      employeePosition: employeePosition || null,
      employeeDepartment: employeeDepartment || null,
      employeeInternalId: employeeInternalId || null,
      employeeNote: employeeNote || null,
    },
  });

  // Create separate corporate profile (does NOT touch personal profile)
  const corporateProfile = await prisma.profile.create({
    data: {
      accountId: user.accountId || null,
      firstName: user.profile?.firstName || firstName || "Pendiente",
      lastName: user.profile?.lastName || lastName || "Pendiente",
      bloodType: "Pendiente",
      profileType: "corporate",
    },
  });

  // Link corporate profile to the OrganizationMember
  await prisma.organizationMember.update({
    where: { id: member.id },
    data: { corporateProfileId: corporateProfile.id },
  });

  return NextResponse.json({
    message: "Tu solicitud fue enviada y está pendiente de revisión por la empresa.",
    member,
  });
}
