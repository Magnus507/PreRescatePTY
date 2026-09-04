import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
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
  | "dead_letter"
  | "skipped"
  | "suppressed"
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
  idempotencyKey: string;
  attempts: number;
  availableAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  providerResponse: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

type DbClient = Prisma.TransactionClient | PrismaClientLike;

type PrismaClientLike = {
  $executeRaw?: (query: Prisma.Sql) => Promise<number>;
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

export const EMERGENCY_NOTIFICATION_COOLDOWN_MS = 5 * 60_000;
export const EMERGENCY_NOTIFICATION_LEASE_MS = 5 * 60_000;
export const EMERGENCY_NOTIFICATION_MAX_ATTEMPTS = 5;

function buildNotificationIdempotencyKey(input: {
  scanEventId: string;
  chipId: string;
  channel: EmergencyAlertChannel;
  recipient: string;
}) {
  const recipientHash = createHash("sha256").update(input.recipient).digest("hex").slice(0, 24);
  return ["emergency", input.scanEventId, input.chipId, input.channel, recipientHash].join(":");
}

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
  // Serialize notification planning per chip inside the caller transaction.
  // This closes the race where two simultaneous scans both observe an empty
  // cooldown window and enqueue separate deliveries.
  if ("$executeRaw" in db && typeof db.$executeRaw === "function") {
    await db.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${payload.chipId}, 0))`
    );
  }

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
  let suppressed = 0;

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
    const idempotencyKey = buildNotificationIdempotencyKey({
      scanEventId: payload.scanEventId,
      chipId: payload.chipId,
      channel,
      recipient,
    });
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

    const recentAutomaticDelivery = trigger === "automatic"
      ? await db.notification.findFirst({
          where: {
            chipId: payload.chipId,
            channel,
            recipient,
            createdAt: { gte: new Date(Date.now() - EMERGENCY_NOTIFICATION_COOLDOWN_MS) },
            status: { in: ["pending", "processing", "retrying", "sent"] },
          },
          select: { id: true, status: true, providerResponse: true },
          orderBy: { createdAt: "desc" },
        })
      : null;

    if (recentAutomaticDelivery) {
      await db.notification.create({
        data: {
          chipId: payload.chipId,
          eventId: payload.scanEventId,
          channel,
          recipient,
          idempotencyKey,
          status: "suppressed",
          providerResponse: serializeMeta({
            ...parseMeta(providerResponse),
            reason: "cooldown",
            suppressedByNotificationId: recentAutomaticDelivery.id,
            cooldownMs: EMERGENCY_NOTIFICATION_COOLDOWN_MS,
          }),
        },
      });
      suppressed += 1;
      continue;
    }

    await db.notification.create({
      data: {
        chipId: payload.chipId,
        eventId: payload.scanEventId,
        channel,
        recipient,
        idempotencyKey,
        status: providerAvailable ? "pending" : "disabled",
        providerResponse,
      },
    });

    if (providerAvailable) queued += 1;
    else disabled += 1;
  }

  const notificationStatus: EmergencyNotificationStatus =
    queued > 0
      ? "pending"
      : suppressed > 0
        ? "suppressed"
        : disabled > 0
          ? "disabled"
          : "skipped";

  await db.scanEvent.update({
    where: { id: payload.scanEventId },
    data: { notificationStatus },
  });

  return {
    status: notificationStatus,
    queued,
    skipped,
    disabled,
    suppressed,
    reason: queued > 0
      ? "queued"
      : suppressed > 0
        ? "cooldown"
        : disabled > 0
          ? "provider_missing"
          : "no_eligible_contacts",
  };
}

async function finalizeClaim(
  db: DbClient,
  notificationId: string,
  workerId: string,
  data: Prisma.NotificationUpdateManyMutationInput
) {
  const result = await db.notification.updateMany({
    where: {
      id: notificationId,
      status: "processing",
      lockedBy: workerId,
    },
    data: {
      ...data,
      lockedAt: null,
      lockedBy: null,
    },
  });
  return result.count === 1;
}

async function sendOneNotification(
  db: DbClient,
  notification: EmergencyNotificationRow,
  workerId: string
) {
  const meta = parseMeta(notification.providerResponse);
  const attempts = notification.attempts;

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
    await finalizeClaim(db, notification.id, workerId, {
      status: "skipped",
      providerResponse: nextMeta,
      lastErrorCode: "PROFILE_MISSING",
      lastErrorMessage: "Profile unavailable while processing emergency notification",
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
    await finalizeClaim(db, notification.id, workerId, {
      status: "disabled",
      providerResponse: nextMeta,
      lastErrorCode: "PROVIDER_MISSING",
      lastErrorMessage: "Notification provider is not configured",
    });
    return { status: "disabled" as const, reason: "provider_missing" };
  }

  const sendResult = await sendEmergencyNotification({
    recipient,
    type: channel,
    profileName: profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`.trim(),
    shortCode: scan.chip.shortCode,
    notificationId: notification.id,
    idempotencyKey: notification.idempotencyKey,
  });

  const providerResponse = serializeMeta({
    ...meta,
    attempts,
    providerSuccess: sendResult.success,
    providerResponse: sendResult.providerResponse || null,
    completedAt: new Date().toISOString(),
  });

  if (sendResult.success) {
    await finalizeClaim(db, notification.id, workerId, {
      status: "sent",
      providerResponse,
      sentAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
    });
    return { status: "sent" as const, reason: "sent" };
  }

  const failureClass = classifyFailure(sendResult.providerResponse, undefined);
  if (failureClass === "permanent") {
    await finalizeClaim(db, notification.id, workerId, {
      status: "failed",
      providerResponse: serializeMeta({
        ...meta,
        attempts,
        providerSuccess: false,
        providerResponse: sendResult.providerResponse || null,
        failureClass,
        completedAt: new Date().toISOString(),
      }),
      lastErrorCode: "PERMANENT_PROVIDER_FAILURE",
      lastErrorMessage: (sendResult.providerResponse || "Permanent provider failure").slice(0, 500),
    });
    return { status: "failed" as const, reason: "permanent_failure" };
  }

  const exhausted = attempts >= EMERGENCY_NOTIFICATION_MAX_ATTEMPTS;
  const nextRetryAt = new Date(nextRetryAtForAttempt(attempts));
  await finalizeClaim(db, notification.id, workerId, {
    status: exhausted ? "dead_letter" : "retrying",
    availableAt: exhausted ? notification.availableAt : nextRetryAt,
    providerResponse: serializeMeta({
      ...meta,
      attempts,
      providerSuccess: false,
      providerResponse: sendResult.providerResponse || null,
      failureClass,
      nextRetryAt: exhausted ? null : nextRetryAt.toISOString(),
      completedAt: new Date().toISOString(),
    }),
    lastErrorCode: exhausted ? "MAX_ATTEMPTS_EXCEEDED" : "TEMPORARY_PROVIDER_FAILURE",
    lastErrorMessage: (sendResult.providerResponse || "Temporary provider failure").slice(0, 500),
  });

  return exhausted
    ? { status: "dead_letter" as const, reason: "max_attempts" }
    : { status: "retrying" as const, reason: "temporary_failure" };
}

export async function recoverExpiredEmergencyNotificationLeases(
  db: DbClient,
  options?: { limit?: number; now?: Date; leaseMs?: number }
) {
  const limit = Math.min(Math.max(options?.limit || 100, 1), 500);
  const now = options?.now ?? new Date();
  const expiredBefore = new Date(now.getTime() - (options?.leaseMs ?? EMERGENCY_NOTIFICATION_LEASE_MS));
  const expired = await db.notification.findMany({
    where: {
      status: "processing",
      OR: [{ lockedAt: null }, { lockedAt: { lte: expiredBefore } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let recovered = 0;
  let deadLettered = 0;
  for (const notification of expired) {
    const safeProviderRetry = notification.channel === "email";
    const result = await db.notification.updateMany({
      where: {
        id: notification.id,
        status: "processing",
        lockedBy: notification.lockedBy,
        lockedAt: notification.lockedAt,
      },
      data: safeProviderRetry
        ? {
            status: "retrying",
            availableAt: now,
            lockedAt: null,
            lockedBy: null,
            lastErrorCode: "LEASE_EXPIRED_RETRY_SAFE",
            lastErrorMessage: "Expired email lease recovered with provider idempotency",
          }
        : {
            status: "dead_letter",
            lockedAt: null,
            lockedBy: null,
            lastErrorCode: "AMBIGUOUS_PROVIDER_RESULT",
            lastErrorMessage: "SMS/WhatsApp lease expired; automatic resend blocked to prevent duplicates",
          },
    });
    if (result.count !== 1) continue;
    if (safeProviderRetry) recovered += 1;
    else deadLettered += 1;
  }

  return { recovered, deadLettered };
}

export async function processPendingEmergencyNotifications(
  db: DbClient,
  options?: { limit?: number; workerId?: string; now?: Date }
) {
  const limit = Math.min(Math.max(options?.limit || 25, 1), 100);
  const now = options?.now ?? new Date();
  const workerId = options?.workerId || `notify-${randomUUID()}`;
  const leaseRecovery = await recoverExpiredEmergencyNotificationLeases(db, { limit, now });
  const notifications = await db.notification.findMany({
    where: {
      status: { in: ["pending", "retrying"] },
      availableAt: { lte: now },
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let retrying = 0;
  let disabled = 0;
  let deadLettered = leaseRecovery.deadLettered;
  let claimed = 0;

  for (const notification of notifications) {
    const claim = await db.notification.updateMany({
      where: {
        id: notification.id,
        status: { in: ["pending", "retrying"] },
        availableAt: { lte: now },
      },
      data: {
        status: "processing",
        lockedAt: now,
        lockedBy: workerId,
        attempts: { increment: 1 },
      },
    });

    if (!claim.count) {
      continue;
    }

    claimed += 1;
    const result = await sendOneNotification(
      db,
      { ...notification, attempts: notification.attempts + 1, lockedAt: now, lockedBy: workerId },
      workerId
    );

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
      case "dead_letter":
        deadLettered += 1;
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
    recoveredLeases: leaseRecovery.recovered,
    deadLettered,
    workerId,
  });

  return {
    claimed,
    sent,
    failed,
    skipped,
    retrying,
    disabled,
    recoveredLeases: leaseRecovery.recovered,
    deadLettered,
  };
}
