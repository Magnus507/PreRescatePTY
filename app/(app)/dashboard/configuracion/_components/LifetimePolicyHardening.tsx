"use client";

import { useEffect } from "react";

function normalizedText(element: Element) {
  return (element.textContent || "").replace(/\s+/g, " ").trim();
}

function hideRetiredAutomaticAlertControls(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("button").forEach((button) => {
    const label = normalizedText(button).toLowerCase();
    if (label.includes("avisar automáticamente al escanear")) {
      const container = button.closest("section") || button.parentElement;
      if (container instanceof HTMLElement) {
        container.hidden = true;
        container.setAttribute("aria-hidden", "true");
        container.dataset.retiredAutomaticAlerts = "true";
      } else {
        button.hidden = true;
      }
    }

    if (label.includes("notificaciones") && label.includes("alertas y avisos")) {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.dataset.retiredAutomaticAlertsTab = "true";
    }
  });
}

/**
 * Historical component name kept to avoid a broad layout rename.
 * It now hardens only retired automatic-alert controls. Annual access and
 * renewal controls must remain visible and must never be rewritten client-side.
 */
export default function LifetimePolicyHardening() {
  useEffect(() => {
    hideRetiredAutomaticAlertControls(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) hideRetiredAutomaticAlertControls(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
