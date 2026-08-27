export type DispatchSourceEvent = {
  metadataJson?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
};

export function getDispatchCustomerOrderId(events: DispatchSourceEvent[]): string | null {
  for (const event of events) {
    if (event.referenceType === "order" && event.referenceId?.trim()) {
      return event.referenceId.trim();
    }

    if (!event.metadataJson) continue;
    try {
      const metadata = JSON.parse(event.metadataJson) as {
        customerOrderId?: unknown;
        orderId?: unknown;
      };
      if (typeof metadata.customerOrderId === "string" && metadata.customerOrderId.trim()) {
        return metadata.customerOrderId.trim();
      }
      if (typeof metadata.orderId === "string" && metadata.orderId.trim()) {
        return metadata.orderId.trim();
      }
    } catch {
      continue;
    }
  }

  return null;
}
