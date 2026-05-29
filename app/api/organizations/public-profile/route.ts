import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EDITABLE_FIELDS = [
  "status",
  "logoUrl",
  "displayName",
  "legalName",
  "ruc",
  "foundedYear",
  "industry",
  "description",
  "slogan",
  "phone",
  "whatsapp",
  "email",
  "website",
  "address",
  "mapUrl",
  "businessHours",
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "xTwitter",
  "youtube",
  "mainServices",
  "mainProducts",
  "branches",
  "contactPerson",
  "contactDepartment",
  "certifications",
  "licenses",
  "operationNotice",
  "securityContactName",
  "securityPhone",
  "emergencyProcedure",
  "meetingPoint",
  "receptionPhone",
  "corporateWhatsapp",
  "customEmployeeMessage",
  "showCompanyCode",
  "showLogo",
  "showDisplayName",
  "showLegalName",
  "showRuc",
  "showFoundedYear",
  "showIndustry",
  "showDescription",
  "showSlogan",
  "showPhone",
  "showWhatsapp",
  "showEmail",
  "showWebsite",
  "showAddress",
  "showMapUrl",
  "showBusinessHours",
  "showInstagram",
  "showFacebook",
  "showLinkedin",
  "showTiktok",
  "showXTwitter",
  "showYoutube",
  "showMainServices",
  "showMainProducts",
  "showBranches",
  "showContactPerson",
  "showContactDepartment",
  "showCertifications",
  "showLicenses",
  "showOperationNotice",
  "showSecurityContactName",
  "showSecurityPhone",
  "showEmergencyProcedure",
  "showMeetingPoint",
  "showReceptionPhone",
  "showCorporateWhatsapp",
  "showCustomEmployeeMessage",
] as const;

function generateShortCode() {
  return `emp-${Math.random().toString(36).slice(2, 8)}`;
}

async function getOrganizationIdFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId) return null;

  const organization = await prisma.organization.findFirst({
    where: { accountId: session.user.accountId },
    select: { id: true, displayName: true, legalName: true, taxId: true, contactEmail: true },
  });

  return organization;
}

export async function GET() {
  const organization = await getOrganizationIdFromSession();
  if (!organization) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const profile = await prisma.corporatePublicProfile.findUnique({
    where: { organizationId: organization.id },
  });

  return NextResponse.json({ profile: profile ?? null });
}

export async function POST() {
  const organization = await getOrganizationIdFromSession();
  if (!organization) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const existing = await prisma.corporatePublicProfile.findUnique({
    where: { organizationId: organization.id },
  });

  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  let shortCode = generateShortCode();
  for (let i = 0; i < 8; i++) {
    const found = await prisma.corporatePublicProfile.findUnique({ where: { shortCode } });
    if (!found) break;
    shortCode = generateShortCode();
  }

  const profile = await prisma.corporatePublicProfile.create({
    data: {
      organizationId: organization.id,
      shortCode,
      status: "draft",
      displayName: organization.displayName ?? undefined,
      legalName: organization.legalName ?? undefined,
      ruc: organization.taxId ?? undefined,
      email: organization.contactEmail ?? undefined,
      showCompanyCode: false,
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}

export async function PATCH(req: Request) {
  const organization = await getOrganizationIdFromSession();
  if (!organization) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const existing = await prisma.corporatePublicProfile.findUnique({
    where: { organizationId: organization.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Perfil no existe" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const key of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      data[key] = body[key as keyof typeof body];
    }
  }

  if (data.status && !["draft", "active", "hidden"].includes(String(data.status))) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const profile = await prisma.corporatePublicProfile.update({
    where: { organizationId: organization.id },
    data,
  });

  return NextResponse.json({ profile });
}