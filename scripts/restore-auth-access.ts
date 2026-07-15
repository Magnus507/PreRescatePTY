import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const CONFIRM_ENV = "CONFIRM_AUTH_RECOVERY";
const REQUIRED_CONFIRMATION = "YES_RESTORE_ACCESS";

type RecoveryUserInput = {
  emailEnv: string;
  passwordEnv: string;
  role: "superadmin" | "owner";
  isAdmin: boolean;
  adminRole: string | null;
  accountType?: "personal" | "company";
  organizationName?: string;
  organizationDisplayName?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateTempPassword(length = 20): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }

  if (!/[A-Z]/.test(password)) password = `A${password.slice(1)}`;
  if (!/[a-z]/.test(password)) password = `${password.slice(0, -1)}a`;
  if (!/[0-9]/.test(password)) password = `${password.slice(0, -1)}2`;
  if (!/[!@#$%^&*]/.test(password)) password = `${password.slice(0, -1)}!`;

  return password;
}

async function upsertUser(input: RecoveryUserInput) {
  const email = normalizeEmail(requiredEnv(input.emailEnv));
  const password = requiredEnv(input.passwordEnv);
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: input.role,
          isAdmin: input.isAdmin,
          adminRole: input.adminRole,
          status: "active",
          deletedAt: null,
          mfaEnabled: false,
          mfaSecret: null,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: input.role,
          isAdmin: input.isAdmin,
          adminRole: input.adminRole,
          status: "active",
        },
      });

  return { user, email, password };
}

async function ensureClientAccess() {
  const email = normalizeEmail(requiredEnv("AUTH_RECOVERY_CLIENT_EMAIL"));
  const password = requiredEnv("AUTH_RECOVERY_CLIENT_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "owner",
      isAdmin: false,
      adminRole: null,
      status: "active",
      deletedAt: null,
      mfaEnabled: false,
      mfaSecret: null,
    },
    create: {
      email,
      passwordHash,
      role: "owner",
      isAdmin: false,
      adminRole: null,
      status: "active",
    },
  });

  const existingAccount = await prisma.account.findFirst({
    where: { ownerUserId: user.id },
  });

  const account = existingAccount
    ? await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accountType: "personal",
          status: "active",
          accountName: "Cliente de recuperación",
          ownerUserId: user.id,
        },
      })
    : await prisma.account.create({
        data: {
          accountType: "personal",
          status: "active",
          accountName: "Cliente de recuperación",
          ownerUserId: user.id,
        },
      });

  await prisma.user.update({
    where: { id: user.id },
    data: { accountId: account.id },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      accountId: account.id,
      firstName: "Cliente",
      lastName: "Recuperación",
      bloodType: "Pendiente",
    },
    create: {
      userId: user.id,
      accountId: account.id,
      firstName: "Cliente",
      lastName: "Recuperación",
      bloodType: "Pendiente",
    },
  });

  await prisma.consent.createMany({
    data: [{
      userId: user.id,
      accountId: account.id,
      consentType: "auth_recovery",
      textVersion: "auth-recovery-2026-07-14",
      evidenceJson: JSON.stringify({ reason: "restore_customer_login" }),
    }],
    skipDuplicates: true,
  });

  return { email, password, userId: user.id, accountId: account.id };
}

async function ensureCorporateAccess() {
  const email = normalizeEmail(requiredEnv("AUTH_RECOVERY_CORPORATE_EMAIL"));
  const password = requiredEnv("AUTH_RECOVERY_CORPORATE_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "owner",
      isAdmin: false,
      adminRole: null,
      status: "active",
      deletedAt: null,
      mfaEnabled: false,
      mfaSecret: null,
    },
    create: {
      email,
      passwordHash,
      role: "owner",
      isAdmin: false,
      adminRole: null,
      status: "active",
    },
  });

  const existingAccount = await prisma.account.findFirst({
    where: { ownerUserId: user.id },
  });

  const account = existingAccount
    ? await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accountType: "company",
          status: "active",
          accountName: "Corporativo de recuperación",
          ownerUserId: user.id,
        },
      })
    : await prisma.account.create({
        data: {
          accountType: "company",
          status: "active",
          accountName: "Corporativo de recuperación",
          ownerUserId: user.id,
        },
      });

  await prisma.user.update({
    where: { id: user.id },
    data: { accountId: account.id },
  });

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      accountId: account.id,
      firstName: "Corporativo",
      lastName: "Recuperación",
      bloodType: "Pendiente",
      profileType: "corporate",
    },
    create: {
      userId: user.id,
      accountId: account.id,
      firstName: "Corporativo",
      lastName: "Recuperación",
      bloodType: "Pendiente",
      profileType: "corporate",
    },
  });

  const existingOrg = await prisma.organization.findFirst({
    where: { accountId: account.id },
  });

  const organization = existingOrg
    ? await prisma.organization.update({
        where: { id: existingOrg.id },
        data: {
          legalName: "Corporativo de recuperación",
          displayName: "Corporativo de recuperación",
          organizationType: "company",
          status: "active",
          contactEmail: email,
        },
      })
    : await prisma.organization.create({
        data: {
          accountId: account.id,
          legalName: "Corporativo de recuperación",
          displayName: "Corporativo de recuperación",
          organizationType: "company",
          status: "active",
          contactEmail: email,
        },
      });

  await prisma.organizationMember.upsert({
    where: { corporateProfileId: profile.id },
    update: {
      organizationId: organization.id,
      profileId: profile.id,
      corporateStatus: "paid_active",
      memberStatus: "active",
    },
    create: {
      organizationId: organization.id,
      profileId: profile.id,
      corporateProfileId: profile.id,
      corporateStatus: "paid_active",
      memberStatus: "active",
    },
  });

  await prisma.consent.createMany({
    data: [{
      userId: user.id,
      accountId: account.id,
      profileId: profile.id,
      consentType: "auth_recovery",
      textVersion: "auth-recovery-2026-07-14",
      evidenceJson: JSON.stringify({ reason: "restore_corporate_login" }),
    }],
    skipDuplicates: true,
  });

  return { email, password, userId: user.id, accountId: account.id, organizationId: organization.id };
}

async function main() {
  const confirmation = process.env[CONFIRM_ENV]?.trim();
  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(`Falta confirmación: ${CONFIRM_ENV}=${REQUIRED_CONFIRMATION}`);
  }

  const superadmin = await upsertUser({
    emailEnv: "AUTH_RECOVERY_SUPERADMIN_EMAIL",
    passwordEnv: "AUTH_RECOVERY_SUPERADMIN_PASSWORD",
    role: "owner",
    isAdmin: true,
    adminRole: "superadmin",
  });

  const client = await ensureClientAccess();
  const corporate = await ensureCorporateAccess();

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.organization.count(),
    prisma.profile.count(),
  ]);

  console.log(JSON.stringify({
    createdOrUpdated: {
      superadmin: { email: superadmin.email, userId: superadmin.user.id },
      client: { email: client.email, userId: client.userId, accountId: client.accountId },
      corporate: { email: corporate.email, userId: corporate.userId, accountId: corporate.accountId, organizationId: corporate.organizationId },
    },
    counts: {
      users: counts[0],
      accounts: counts[1],
      organizations: counts[2],
      profiles: counts[3],
    },
    passwords: {
      superadmin: superadmin.password,
      client: client.password,
      corporate: corporate.password,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
