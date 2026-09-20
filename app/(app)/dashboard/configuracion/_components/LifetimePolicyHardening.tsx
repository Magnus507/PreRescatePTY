"use client";

import { useEffect } from "react";

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/^Suscripción y plan$/i, "Servicio y producto"],
  [/^Estado de la suscripción$/i, "Estado del servicio"],
  [/^Gestionar \/ Mejorar Plan$/i, "Gestionar producto"],
  [/^Gestionar \/ renovar servicio$/i, "Gestionar producto"],
  [/^Renovación requerida$/i, "Servicio sin vencimiento"],
  [/^Vencido · renovación disponible$/i, "Servicio sin vencimiento"],
  [/^Vencido$/i, "Servicio sin vencimiento"],
];

function normalizedText(element: Element) {
  return (element.textContent || "").replace(/\s+/g, " ").trim();
}

function hideRetiredControls(root: ParentNode) {
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
    if (label.includes("renovar servicio") || label === "renovar") {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.dataset.retiredServiceRenewal = "true";
    }
  });
}

function rewriteServiceCopy(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("p,span,h1,h2,h3,h4,a,button").forEach((element) => {
    if (element.children.length > 0) return;
    const current = normalizedText(element);
    if (!current) return;

    if (/^Válido hasta:/i.test(current) || /^Vence:/i.test(current) || /^Días restantes:/i.test(current)) {
      element.textContent = "Servicio sin vencimiento por tiempo";
      return;
    }

    if (/vencimiento comercial/i.test(current) || /24 meses/i.test(current) || /renovación/i.test(current)) {
      element.textContent = "Tu servicio no vence por tiempo. El perfil permanece disponible mientras el identificador esté activo y no haya sido revocado o reemplazado.";
      return;
    }

    for (const [pattern, replacement] of REPLACEMENTS) {
      if (pattern.test(current)) {
        element.textContent = replacement;
        break;
      }
    }
  });
}

function applyPolicy(root: ParentNode) {
  hideRetiredControls(root);
  rewriteServiceCopy(root);
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
