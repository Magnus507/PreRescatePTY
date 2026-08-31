import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations";
import { ACCOUNT_TYPES, USER_ROLES } from "@/domains/shared/constants";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { CONSENT_TEXT_VERSION, CONSENT_TYPE } from "@/domains/consents/consent.constants";

export const dynamic = "force-dynamic";

const ACTIVE_ACCOUNT_TYPES = new Set<string>([ACCOUNT_TYPES.PERSONAL, ACCOUNT_TYPES.COMPANY]);
const REGISTRATION_LEGAL_DOCUMENTS = {
  terms: "/legal/terminos",
  privacy: "/legal/privacidad",
} as const;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req, "auth-register");
    const limiter = await rateLimit("register", ip, { limit: 5, windowMs: 60_000 * 15 }); // 5 per 15 min
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo más tarde." }, { status: 429 });
    }

    const body = await req.json();
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const {
      email: emailLower,
      password,
      phone,
      accountType,
      acceptedTerms,
      consentTextVersion,
    } = validation.data;

    // The client must attest to the exact legal text version currently served.
    // This prevents a stale or handcrafted client from creating fabricated
    // consent evidence for a different version of the terms/privacy notice.
    if (consentTextVersion !== CONSENT_TEXT_VERSION.TERMS_AND_PRIVACY) {
      return NextResponse.json(
        { error: "Los términos fueron actualizados. Recarga la página y vuelve a aceptarlos." },
        { status: 400 }
      );
    }

    const packageId = typeof (body as { packageId?: unknown }).packageId === "string"
      ? (body as { packageId: string }).packageId
      : null;
    const userAgent = req.headers.get("user-agent");

    let selectedPackage = null;
    if (packageId) {
      selectedPackage = await prisma.package.findUnique({ where: { id: packageId } });
      if (!selectedPackage || !selectedPackage.isActive) {
        return NextResponse.json(
          { error: "Package inválido o inactivo" },
          { status: 400 }
        );
      }

      if (!ACTIVE_ACCOUNT_TYPES.has(selectedPackage.accountType)) {
        return NextResponse.json(
          { error: "Package con accountType inválido" },
          { status: 400 }
        );
      }

      if (body.accountType && accountType !== selectedPackage.accountType) {
        return NextResponse.json(
          { error: "accountType no coincide con el Package seleccionado" },
          { status: 400 }
        );
      }
    }

    const resolvedAccountType = selectedPackage?.accountType || accountType || ACCOUNT_TYPES.PERSONAL;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create account + user in transaction
    const user = await prisma.$transaction(async (tx) => {
      const accountData = {
        accountType: resolvedAccountType,
        accountName: emailLower,
        status: "active",
        packageId: selectedPackage?.id || null,
        maxChipsAllocated: 0, // Still 0 until paid
      };

      const account = await tx.account.create({
        data: accountData,
      });

      const newUser = await tx.user.create({
        data: {
          email: emailLower,
          phone: phone || null,
          passwordHash,
          accountId: account.id,
          role: USER_ROLES.OWNER,
        },
      });

      // Set account owner
      await tx.account.update({
        where: { id: account.id },
        data: { ownerUserId: newUser.id },
      });

      // Create blank profile so the user can activate chips immediately
      await tx.profile.create({
        data: {
          userId: newUser.id,
          accountId: account.id,
          firstName: "",
          lastName: "",
          bloodType: "Pendiente",
        },
      });

      await tx.consent.create({
        data: {
          accountId: account.id,
          userId: newUser.id,
          consentType: CONSENT_TYPE.TERMS_AND_PRIVACY,
          textVersion: consentTextVersion,
          ipAddress: ip,
          userAgent,
          evidenceJson: JSON.stringify({
            acceptedTerms,
            consentTextVersion,
            legalDocuments: REGISTRATION_LEGAL_DOCUMENTS,
            packageId: selectedPackage?.id || null,
            accountType: resolvedAccountType,
          }),
        },
      });

      return newUser;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "create",
        newValuesJson: JSON.stringify({ email: emailLower }),
      },
    });

    return NextResponse.json(
      { message: "Cuenta creada exitosamente", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
