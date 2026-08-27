import { Prisma } from "@prisma/client";
import { sendEmergencyNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { CONSENT_TYPE } from "@/domains/consents/consent.constants";

export type EmergencyAlertChannel = "email" | "sms" | "whatsapp";
export type EmergencyNotificationStatus =
  | "pending"
  | "processing"
  | "sent"
  | "partially_sent"
  | "retrying"
  | "failed"
  | "skipped"
  | "disabled";

export type EmergencyNotificationPayload = {
  scanEventId: string;
  chipId: string;
  shortCode: string;
  profileId: string;
  profileName: string;
  accountId?: string | null;
  publicUrl: string;
  location?: { lat: number; lng: number } | null;
  trigger?: "automatic" | "manual";
};

type ContactCandidate = {
  id: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  active?: boolean;
  priorityOrder?: number;
  contact: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
};

type EmergencyNotificationRow = {
  id: string;
  eventId: string;
  channel: string;
  recipient: string;
  status: string;
  providerResponse: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

type DbClient = Prisma.TransactionClient | PrismaClientLike;

type PrismaClientLike = {
  notification: {
    findFirst: (args: Prisma.NotificationFindFirstArgs) => Promise<{
      id: string;
      status: string;
      providerResponse: string | null;
    } | null>;
    findMany: (args: Prisma.NotificationFindManyArgs) => Promise<EmergencyNotificationRow[]>;
    create: (args: Prisma.NotificationCreateArgs) => Promise<EmergencyNotificationRow>;
    update: (args: Prisma.NotificationUpdateArgs) => Promise<EmergencyNotificationRow>;
    updateMany: (args: Prisma.NotificationUpdateManyArgs) => Promise<{ count: number }>;
  };
  scanEvent: {
    findUnique: (args: Prisma.ScanEventFindUniqueArgs) => Promise<{
      id: string;
      chipId: string;
      profileId: string | null;
      accountId: string | null;
      scannedAt: Date;
      notificationStatus: string;
      chip: {
        shortCode: string;
        assignedProfile: {
          id: string;
          firstName: string;
          lastName: string;
          displayNamePublic: string | null;
          profileVisibilityStatus: string;
          contacts: Array<{
            id: string;
            active: boolean;
            priorityOrder: number;
            notifyEmail: boolean;
            notifySms: boolean;
            notifyWhatsapp: boolean;
            contact: {
              fullName: string;
              phone: string;
              email: string | null;
            };
          }>;
        } | null;
      };
    } | null>;
    update: (args: Prisma.ScanEventUpdateArgs) => Promise<{ id: string; notificationStatus: string }>;
  };
  consent: {
    findFirst: (args: Prisma.ConsentFindFirstArgs) => Promise<{ id: string } | null>;
  };
};

type ConsentCheck = {
  profileId?: string | null;
  accountId?: string | null;
  userId?: string | null;
};

const TEMPORARY_ERROR_PATTERNS = [
  /timeout/i,
  /rate limit/i,
  /429/,
  /5\d\d/,
  /unavailable/i,
  /econnreset/i,
  /etimedout/i,
  /network/i,
];

const PERMANENT_ERROR_PATTERNS = [
  /invalid email/i,
  /invalid phone/i,
  /phone invalid/i,
  /missing .*provider/i,
  /not configured/i,
  /unauthorized/i,
  /forbidden/i,
  /rejected permanently/i,
];

function isValidEmail(email: string | null | undefined) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "").trim();
  if (!digits) return null;
  return digits;
}

function isValidPhone(phone: string | null | undefined) {
  const normalized = normalizePhone(phone);
  return !!normalized && normalized.replace(/\D/g, "").length >= 7;
}

function selectChannel(candidate: ContactCandidate): EmergencyAlertChannel | null {
  if (candidate.notifyWhatsapp && isValidPhone(candidate.contact.phone)) return "whatsapp";
  if (candidate.notifySms && isValidPhone(candidate.contact.phone)) return "sms";
  if (candidate.notifyEmail && isValidEmail(candidate.contact.email)) return "email";
  return null;
}

function getRecipient(candidate: ContactCandidate, channel: EmergencyAlertChannel): string | null {
  if (channel === "email") return candidate.contact.email?.trim() || null;
  return normalizePhone(candidate.contact.phone);
}

function isProviderAvailable(channel: EmergencyAlertChannel): boolean {
  if (channel === "email") {
    return !!process.env.RESEND_API_KEY;
  }

  return !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!(process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_FROM);
}

function buildNotificationRecipientMask(recipient: string, channel: EmergencyAlertChannel) {
  if (channel === "email") {
    const [name, domain] = recipient.split("@");
    if (!domain) return "correo oculto";
    return `${name.slice(0, 2)}***@${domain}`;
  }

  const digits = recipient.replace(/\D/g, "");
  return digits.length <= 4 ? "***" : `***${digits.slice(-4)}`;
}

function serializeMeta(meta: Record<string, unknown>) {
  return JSON.stringify(meta);
}

function parseMeta(input: string | null | undefined): Record<string, unknown> {
  if (!input) return {};
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function nextRetryAtForAttempt(attempts: number) {
  const minutes = Math.min(30, 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function classifyFailure(message?: string, code?: string) {
  const normalized = `${code || ""} ${message || ""}`.trim();
  if (!normalized) return "temporary";
  if (PERMANENT_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) return "permanent";
  if (TEMPORARY_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) return "temporary";
  return "temporary";
}

async function hasEmergencyConsent(db: DbClient, input: ConsentCheck) {
  const consent = await db.consent.findFirst({
    where: {
      consentType: CONSENT_TYPE.AUTOMATIC_EMERGENCY_ALERTS,
      revokedAt: null,
      OR: [
        input.profileId ? { profileId: input.profileId } : undefined,
        input.accountId ? { accountId: input.accountId } : undefined,
        input.userId ? { userId: input.userId } : undefined,
      ].filter(Boolean) as Prisma.ConsentWhereInput[],
    },
    select: { id: true },
  });

  return !!consent;
}

export function buildEmergencyNotificationMessage(profileName: string, publicUrl: string) {
  return `Se registró un escaneo de emergencia asociado a ${profileName}. Revisa el enlace seguro para más información: ${publicUrl}`;
}

export function isEmergencyChannelConfigured(channel: EmergencyAlertChannel) {
  return isProviderAvailable(channel);
}

export async function queueEmergencyNotificationsFromScan(
  db: DbClient,
  payload: EmergencyNotificationPayload
) {
  const scan = await db.scanEvent.findUnique({
    where: { id: payload.scanEventId },
    include: {
      chip: {
        include: {
          assignedProfile: {
            include: {
              contacts: {
                where: { active: true },
                orderBy: { priorityOrder: "asc" },
                include: { contact: true },
              },
            },
          },
        },
      },
    },
  });

  if (!scan || !scan.chip.assignedProfile) {
    return {
      status: "skipped" as EmergencyNotificationStatus,
      queued: 0,
      skipped: 0,
      disabled: 0,
      reason: "profile_missing",
    };
  }

  const profile = scan.chip.assignedProfile;
  const trigger = payload.trigger || "automatic";
  const consentGranted = trigger === "manual" || await hasEmergencyConsent(db, {
      profileId: profile.id,
      accountId: scan.accountId,
    });

  if (!consentGranted) {
    await db.scanEvent.update({
      where: { id: payload.scanEventId },
      data: { notificationStatus: "skipped" },
    });
    return {
      status: "skipped" as EmergencyNotificationStatus,
      queued: 0,
      skipped: 0,
      disabled: 0,
      reason: "consent_missing",
    };
  }

  const candidates = profile.contacts
    .filter((row) => row.active)
    .sort((a, b) => a.priorityOrder - b.priorityOrder);

  if (candidates.length === 0) {
    await db.scanEvent.update({
      where: { id: payload.scanEventId },
      data: { notificationStatus: "skipped" },
    });
    return {
      status: "skipped" as EmergencyNotificationStatus,
      queued: 0,
      skipped: 0,
      disabled: 0,
      reason: "no_contacts",
    };
  }

  let queued = 0;
  let skipped = 0;
  let disabled = 0;

  for (const candidate of candidates) {
    const channel = selectChannel(candidate);
    if (!channel) {
      skipped += 1;
      continue;
    }

    const recipient = getRecipient(candidate, channel);
    if (!recipient) {
      skipped += 1;
      continue;
    }

    const providerAvailable = isProviderAvailable(channel);
    const providerResponse = serializeMeta({
      channel,
      recipientMask: buildNotificationRecipientMask(recipient, channel),
      providerAvailable,
      attempts: 0,
      createdAt: new Date().toISOString(),
      reason: providerAvailable ? "queued" : "provider_missing",
      trigger,
    });

    const existing = await db.notification.findFirst({
      where: {
        eventId: payload.scanEventId,
        channel,
        recipient,
      },
      select: { id: true, status: true, providerResponse: true },
    });

    if (existing) {
      continue;
    }

    await db.notification.create({
      data: {
        chipId: payload.chipId,
        eventId: payload.scanEventId,
        channel,
        recipient,
        status: providerAvailable ? "pending" : "disabled",
        providerResponse,
      },
    });

    if (providerAvailable) queued += 1;
    else disabled += 1;
  }

  const notificationStatus: EmergencyNotificationStatus =
    queued > 0 ? "pending" : disabled > 0 ? "disabled" : "skipped";

  await db.scanEvent.update({
    where: { id: payload.scanEventId },
    data: { notificationStatus },
  });

  return {
    status: notificationStatus,
    queued,
    skipped,
    disabled,
    reason: queued > 0 ? "queued" : disabled > 0 ? "provider_missing" : "no_eligible_contacts",
  };
}

async function sendOneNotification(db: DbClient, notification: EmergencyNotificationRow) {
  const meta = parseMeta(notification.providerResponse);
  const attempts = Number(meta.attempts || 0) + 1;

  const scan = await db.scanEvent.findUnique({
    where: { id: notification.eventId },
    include: {
      chip: {
        include: {
          assignedProfile: {
            include: {
              contacts: {
                where: { active: true },
                orderBy: { priorityOrder: "asc" },
                include: { contact: true },
              },
            },
          },
        },
      },
    },
  });

  if (!scan || !scan.chip.assignedProfile) {
    const nextMeta = serializeMeta({
      ...meta,
      attempts,
      lastError: "profile_missing",
      completedAt: new Date().toISOString(),
    });
    await db.notification.update({
      where: { id: notification.id },
      data: { status: "skipped", providerResponse: nextMeta },
    });
    return { status: "skipped" as const, reason: "profile_missing" };
  }

  const profile = scan.chip.assignedProfile;
  const channel = notification.channel as EmergencyAlertChannel;
  const recipient = notification.recipient;

  if (!isProviderAvailable(channel)) {
    const nextMeta = serializeMeta({
      ...meta,
      attempts,
      lastError: "provider_missing",
      completedAt: new Date().toISOString(),
    });
    await db.notification.update({
      where: { id: notification.id },
      data: { status: "disabled", providerResponse: nextMeta },
    });
    return { status: "disabled" as const, reason: "provider_missing" };
  }

  const sendResult = await sendEmergencyNotification({
    recipient,
    type: channel,
    profileName: profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`.trim(),
    shortCode: scan.chip.shortCode,
    notificationId: notification.id,
  });

  const providerResponse = serializeMeta({
    ...meta,
    attempts,
    providerSuccess: sendResult.success,
    providerResponse: sendResult.providerResponse || null,
    completedAt: new Date().toISOString(),
  });

  if (sendResult.success) {
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: "sent",
        providerResponse,
        sentAt: new Date(),
      },
    });
    return { status: "sent" as const, reason: "sent" };
  }

  const failureClass = classifyFailure(sendResult.providerResponse, undefined);
  if (failureClass === "permanent") {
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: "failed",
        providerResponse: serializeMeta({
          ...meta,
          attempts,
          providerSuccess: false,
          providerResponse: sendResult.providerResponse || null,
          failureClass,
          completedAt: new Date().toISOString(),
        }),
      },
    });
    return { status: "failed" as const, reason: "permanent_failure" };
  }

  const nextRetryAt = nextRetryAtForAttempt(attempts);
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "retrying",
      providerResponse: serializeMeta({
        ...meta,
        attempts,
        providerSuccess: false,
        providerResponse: sendResult.providerResponse || null,
        failureClass,
        nextRetryAt,
        completedAt: new Date().toISOString(),
      }),
    },
  });

  return { status: "retrying" as const, reason: "temporary_failure" };
}

export async function processPendingEmergencyNotifications(
  db: DbClient,
  options?: { limit?: number }
) {
  const limit = Math.min(Math.max(options?.limit || 25, 1), 100);
  const notifications = await db.notification.findMany({
    where: {
      status: { in: ["pending", "retrying", "processing"] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let retrying = 0;
  let disabled = 0;
  let claimed = 0;

  for (const notification of notifications) {
    const meta = parseMeta(notification.providerResponse);
    const nextRetryAt = typeof meta.nextRetryAt === "string" ? new Date(meta.nextRetryAt) : null;

    if (notification.status === "retrying" && nextRetryAt && nextRetryAt.getTime() > Date.now()) {
      continue;
    }

    const claim = await db.notification.updateMany({
      where: {
        id: notification.id,
        status: notification.status,
      },
      data: {
        status: "processing",
        providerResponse: serializeMeta({
          ...meta,
          processingAt: new Date().toISOString(),
        }),
      },
    });

    if (!claim.count) {
      continue;
    }

    claimed += 1;
    const result = await sendOneNotification(db, notification);

    switch (result.status) {
      case "sent":
        sent += 1;
        break;
      case "retrying":
        retrying += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "disabled":
        disabled += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
    }
  }

  logger.info("[emergency-alerts] processed batch", {
    claimed,
    sent,
    failed,
    skipped,
    retrying,
    disabled,
  });

  return { claimed, sent, failed, skipped, retrying, disabled };
}
