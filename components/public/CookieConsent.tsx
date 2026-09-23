"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "prerescue_cookie_preferences";

interface CookiePreferences {
  version: string;
  necessary: boolean;
  analytics: boolean;
  timestamp: number;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    version: "1.0",
    necessary: true,
    analytics: false,
    timestamp: 0,
  });
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setShowBanner(true);
      return;
    }

    try {
      setPreferences(JSON.parse(stored) as CookiePreferences);
    } catch {
      setShowBanner(true);
    }
  }, []);

  useEffect(() => {
    const handleOpenPreferences = () => {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setShowPreferences(true);
    };

    window.addEventListener("prerescue:open-cookie-preferences", handleOpenPreferences);
    return () => window.removeEventListener("prerescue:open-cookie-preferences", handleOpenPreferences);
  }, []);

  useEffect(() => {
    if (!showPreferences) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowPreferences(false);
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog?.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog?.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [showPreferences]);

  const savePreferences = (analytics: boolean) => {
    const next: CookiePreferences = {
      version: "1.0",
      necessary: true,
      analytics,
      timestamp: Date.now(),
    };

    setPreferences(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent("prerescue:cookie-preferences-updated", { detail: next }),
    );
    setShowBanner(false);
    setShowPreferences(false);
  };

  return (
    <>
      {showBanner && !showPreferences && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0c1630] p-4 shadow-2xl md:p-6"
          role="region"
          aria-label="Consentimiento de cookies"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <h2 className="mb-2 text-lg font-black text-[#EFF4FF]">
                  Cookies y privacidad
                </h2>
                <p className="text-sm text-[#A0AEC0]">
                  Utilizamos cookies necesarias para el funcionamiento del sitio y
                  cookies opcionales de análisis. Puedes aceptar las cookies
                  opcionales o rechazarlas. Lee nuestra{" "}
                  <a href="/legal/cookies" className="text-[#DA1A21] underline hover:text-white">
                    Política de Cookies
                  </a>{" "}
                  para más información.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => savePreferences(false)}
                  className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white"
                >
                  Solo necesarias
                </button>
                <button
                  type="button"
                  onClick={() => savePreferences(true)}
                  className="min-h-[44px] rounded-xl bg-[#DA1A21] px-4 py-3 font-bold text-white"
                >
                  Aceptar opcionales
                </button>
                <button
                  type="button"
                  onClick={() => {
                    previousFocusRef.current = document.activeElement as HTMLElement;
                    setShowPreferences(true);
                  }}
                  className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white"
                >
                  Preferencias
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreferences && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowPreferences(false)}
          aria-modal="true"
          role="dialog"
          aria-labelledby="cookie-preferences-title"
          aria-describedby="cookie-preferences-description"
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1630] p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cookie-preferences-title" className="mb-4 text-2xl font-black text-[#EFF4FF]">
              Preferencias de cookies
            </h2>
            <p id="cookie-preferences-description" className="mb-6 text-sm text-[#A0AEC0]">
              Gestiona tus preferencias de cookies. Las cookies necesarias son
              obligatorias y no se pueden desactivar.
            </p>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 rounded-xl bg-white/5 p-4">
                <div className="flex-1">
                  <h3 className="mb-1 font-bold text-[#EFF4FF]">Cookies necesarias</h3>
                  <p className="text-xs text-[#A0AEC0]">
                    Esenciales para el funcionamiento y la seguridad del sitio.
                  </p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Siempre activas
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl bg-white/5 p-4">
                <div className="flex-1">
                  <h3 className="mb-1 font-bold text-[#EFF4FF]">Cookies de análisis</h3>
                  <p className="text-xs text-[#A0AEC0]">
                    Nos ayudan a entender uso y rendimiento del sitio mediante
                    Vercel Analytics y Speed Insights.
                  </p>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        analytics: event.target.checked,
                      }))
                    }
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-white/20 transition-colors peer-checked:bg-[#DA1A21]" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => savePreferences(preferences.analytics)}
                className="min-h-[44px] flex-1 rounded-xl bg-[#DA1A21] px-4 py-3 font-bold text-white"
              >
                Guardar preferencias
              </button>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
