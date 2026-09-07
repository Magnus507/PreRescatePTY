"use client";

import { useEffect } from "react";
import { buildManualRescueWhatsAppUrl } from "@/lib/public-access/manual-whatsapp";

const LEGACY_ALERT_LABELS = [
  "avisar a contactos",
  "contactos avisados",
  "preparando aviso",
];

function extractWhatsAppPhone(href: string): string | null {
  try {
    const parsed = new URL(href, window.location.origin);
    if (parsed.hostname !== "wa.me") return null;
    const digits = parsed.pathname.replace(/\D/g, "");
    return digits || null;
  } catch {
    return null;
  }
}

function hardenWhatsAppLinks(root: ParentNode) {
  root.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me/"]').forEach((anchor) => {
    const phone = extractWhatsAppPhone(anchor.href);
    if (!phone) return;

    const safeUrl = buildManualRescueWhatsAppUrl(phone);
    if (!safeUrl) {
      anchor.removeAttribute("href");
      anchor.setAttribute("aria-disabled", "true");
      return;
    }

    if (anchor.href !== safeUrl) anchor.href = safeUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.dataset.manualContact = "whatsapp";
  });
}

function hideLegacyServerAlertControls(root: ParentNode) {
  root.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const label = (button.textContent || "").toLowerCase().replace(/\s+/g, " ").trim();
    const isLegacyAlert =
      LEGACY_ALERT_LABELS.some((candidate) => label.includes(candidate)) ||
      Boolean(button.querySelector(".lucide-bell-ring"));

    if (!isLegacyAlert) return;

    button.hidden = true;
    button.disabled = true;
    button.setAttribute("aria-hidden", "true");
    button.dataset.legacyEmergencyAlert = "disabled";

    const parent = button.parentElement;
    if (parent && !parent.querySelector("p:not(:empty)")) {
      parent.style.display = "none";
    }
  });
}

function enforceManualContactOnly(root: ParentNode) {
  hardenWhatsAppLinks(root);
  hideLegacyServerAlertControls(root);
}

export default function ManualContactHardening() {
  useEffect(() => {
    enforceManualContactOnly(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) enforceManualContactOnly(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
