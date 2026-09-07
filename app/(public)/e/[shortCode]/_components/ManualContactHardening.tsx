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

function hardenWhatsAppAnchor(anchor: HTMLAnchorElement) {
  if (!anchor.href.includes("wa.me/")) return;

  const phone = extractWhatsAppPhone(anchor.href);
  if (!phone) return;

  const safeUrl = buildManualRescueWhatsAppUrl(phone);
  if (!safeUrl) {
    anchor.removeAttribute("href");
    anchor.setAttribute("aria-disabled", "true");
    return;
  }

  // React may update href later when geolocation/profile state resolves. The
  // observer below watches href mutations too, so location-rich legacy URLs are
  // immediately replaced again by the privacy-minimal manual message.
  if (anchor.href !== safeUrl) anchor.href = safeUrl;
  anchor.removeAttribute("aria-disabled");
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.dataset.manualContact = "whatsapp";
}

function hardenWhatsAppLinks(root: ParentNode) {
  if (root instanceof HTMLAnchorElement) hardenWhatsAppAnchor(root);
  root.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me/"]').forEach(hardenWhatsAppAnchor);
}

function hideLegacyButton(button: HTMLButtonElement) {
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
}

function hideLegacyServerAlertControls(root: ParentNode) {
  if (root instanceof HTMLButtonElement) hideLegacyButton(root);
  root.querySelectorAll<HTMLButtonElement>("button").forEach(hideLegacyButton);
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
        if (mutation.type === "attributes" && mutation.target instanceof HTMLAnchorElement) {
          hardenWhatsAppAnchor(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) enforceManualContactOnly(node);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
