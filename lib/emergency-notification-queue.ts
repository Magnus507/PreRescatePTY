import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmergencyNotification } from "@/lib/notifications";

type PendingNotification = Prisma.NotificationGetPayload<{
  include: {
    chip: {
      include: {
        assignedProfile: {
          select: {
            firstName: true;
            lastName: true;
            displayNamePublic: true;
          };
        };
      };
    };
  };
}>;

export async function processPendingEmergencyNotifications(options: {
  eventId?: string;
  take?: number;
  includeStaleProcessing?: boolean;
}) {
  const take = options.take ?? 50;
  const staleProcessingBefore = new Date(Date.now() - 5 * 60_000);
  const statusFilter: Prisma.NotificationWhereInput[] = [{ status: "pending" }];

  if (options.includeStaleProcessing) {
    statusFilter.push({
      status: "processing",
      createdAt: { lte: staleProcessingBefore },
    });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      ...(options.eventId ? { eventId: options.eventId } : {}),
      OR: statusFilter,
    },
    include: {
      chip: {
        include: {
          assignedProfile: {
            select: {
              firstName: true,
              lastName: true,
              displayNamePublic: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take,
  });

  if (notifications.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  const eventIds = [...new Set(notifications.map((notif) => notif.eventId))];
  const scanEvents = await prisma.scanEvent.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, geoLat: true, geoLng: true },
  });
  const scanEventById = new Map(scanEvents.map((event) => [event.id, event]));

  let sent = 0;
  let failed = 0;

  await Promise.all(
    notifications.map(async (notif) => {
      const success = await processOneNotification(notif, scanEventById);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    })
  );

  for (const eventId of eventIds) {
    const statuses = await prisma.notification.findMany({
      where: { eventId },
      select: { status: true },
    });
    const total = statuses.length;
    const sentCount = statuses.filter((item) => item.status === "sent").length;
    const failedCount = statuses.filter((item) => item.status === "failed").length;

    if (total > 0 && sentCount + failedCount === total) {
      await prisma.scanEvent.update({
        where: { id: eventId },
        data: {
          notificationStatus:
            sentCount === total ? "sent" : sentCount > 0 ? "partial_failure" : "failed",
        },
      });
    }
  }

  return { processed: notifications.length, sent, failed };
}

async function processOneNotification(
  notif: PendingNotification,
  scanEventById: Map<string, { id: string; geoLat: number | null; geoLng: number | null }>
) {
  const profile = notif.chip.assignedProfile;
  const profileName = profile
    ? profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`.trim()
    : "Usuario PreRescate";
  const event = scanEventById.get(notif.eventId);
  const location =
    event?.geoLat && event.geoLng ? { lat: event.geoLat, lng: event.geoLng } : undefined;

  await prisma.notification.update({
    where: { id: notif.id },
    data: { status: "processing" },
  });

  try {
    const result = await sendEmergencyNotification({
      recipient: notif.recipient,
      type: notif.channel as "email" | "sms" | "whatsapp",
      profileName,
      location,
      shortCode: notif.chip.shortCode,
      notificationId: notif.id,
    });

    await prisma.notification.update({
      where: { id: notif.id },
      data: {
        status: result.success ? "sent" : "failed",
        providerResponse: result.providerResponse ?? null,
        sentAt: result.success ? new Date() : null,
      },
    });

    return result.success;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.notification.update({
      where: { id: notif.id },
      data: { status: "failed", providerResponse: message },
    });
    return false;
  }
}
