"use client";

import { useEffect } from "react";

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/^Suscripción y plan$/i, "Producto y plan"],
  [/^Estado y gestión$/i, "Gestión del producto"],
  [/^Estado de la suscripción$/i, "Estado del producto"],
  [/^Servicio no activado$/i, "Sin vencimiento por tiempo"],
  [/^Válido hasta:.*$/i, "Sin vencimiento por tiempo"],
  [/^Gestionar \/ Mejorar Plan$/i, "Gestionar producto / opciones"],
];

function normalizedText(element: Element) {
  return (element.textContent || "").replace(/\s+/g, " ").trim();
}

function hideAutomaticAlertControls(root: ParentNode) {
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
  });

  root.querySelectorAll<HTMLElement>("button").forEach((button) => {
    const label = normalizedText(button).toLowerCase();
    if (label.includes("notificaciones") && label.includes("alertas y avisos")) {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.dataset.retiredAutomaticAlertsTab = "true";
    }
  });
}

function rewriteLifetimeCopy(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("p,span,h1,h2,h3,h4,a,button").forEach((element) => {
    if (element.children.length > 0) return;
    const current = normalizedText(element);
    if (!current) return;

    for (const [pattern, replacement] of REPLACEMENTS) {
      if (pattern.test(current)) {
        element.textContent = replacement;
        break;
      }
    }
  });
}

function applyPolicy(root: ParentNode) {
  hideAutomaticAlertControls(root);
  rewriteLifetimeCopy(root);
}

export default function LifetimePolicyHardening() {
  useEffect(() => {
    applyPolicy(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) applyPolicy(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
