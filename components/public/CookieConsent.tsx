"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    timestamp: Date.now(),
  });
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences(parsed);
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const savePreferences = (analytics: boolean) => {
    const newPreferences: CookiePreferences = {
      version: "1.0",
      necessary: true,
      analytics,
      timestamp: Date.now(),
    };
    setPreferences(newPreferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    window.dispatchEvent(new CustomEvent("prerescue:cookie-preferences-updated", { detail: newPreferences }));
    setShowBanner(false);
    setShowPreferences(false);
  };

  useEffect(() => {
    const handleOpenPreferences = () => {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setShowPreferences(true);
    };
    window.addEventListener("prerescue:open-cookie-preferences", handleOpenPreferences);
    return () => window.removeEventListener("prerescue:open-cookie-preferences", handleOpenPreferences);
  }, []);

  useEffect(() => {
    if (showPreferences) {
      document.body.style.overflow = "hidden";
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      if (dialog) {
        const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = dialog.querySelectorAll<HTMLElement>(focusableSelector);
        const firstFocusable = focusableElements[0];
        if (firstFocusable) {
          setTimeout(() => firstFocusable.focus(), 100);
        }

        const handleTabKey = (e: KeyboardEvent) => {
          if (e.key !== "Tab") return;
          if (focusableElements.length === 0) return;
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        };

        dialog.addEventListener("keydown", handleTabKey);
        return () => {
          dialog.removeEventListener("keydown", handleTabKey);
          document.body.style.overflow = "";
          if (previousFocusRef.current) {
            previousFocusRef.current.focus();
          }
        };
      }
    } else {
      document.body.style.overflow = "";
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPreferences]);

  const handleAcceptAll = () => {
    savePreferences(true);
  };

  const handleNecessaryOnly = () => {
    savePreferences(false);
  };

  const openPreferences = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setShowPreferences(true);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences.analytics);
  };

  const handleAnalyticsToggle = (checked: boolean) => {
    setPreferences((prev) => ({ ...prev, analytics: checked }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowPreferences(false);
    }
  };

  return (
    <>
      {/* Cookie Banner */}
      <AnimatePresence>
        {showBanner && !showPreferences && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-[#0c1630] border-t border-white/10 shadow-2xl"
            role="region"
            aria-label="Consentimiento de cookies"
          >
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-black text-[#EFF4FF] mb-2">
                    Cookies y privacidad
                  </h2>
                  <p className="text-sm text-[#A0AEC0]">
                    Utilizamos cookies necesarias para el funcionamiento del
                    sitio y cookies opcionales de análisis. Puedes aceptar las
                    cookies opcionales o rechazarlas. Lee nuestra{" "}
                    <a
                      href="/legal/cookies"
                      className="text-[#DA1A21] hover:text-white underline"
                    >
                      Política de Cookies
                    </a>{" "}
                    para más información.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleNecessaryOnly}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all min-h-[44px]"
                  >
                    Solo necesarias
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="px-4 py-3 rounded-xl bg-[#DA1A21] text-white font-bold hover:bg-[#B9141B] transition-all min-h-[44px]"
                  >
                    Aceptar opcionales
                  </button>
                  <button
                    type="button"
                    onClick={openPreferences}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all min-h-[44px]"
                  >
                    Preferencias
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPreferences && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setShowPreferences(false)}
            onKeyDown={handleKeyDown}
            aria-modal="true"
            role="dialog"
            aria-labelledby="cookie-preferences-title"
            aria-describedby="cookie-preferences-description"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c1630] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="cookie-preferences-title"
                className="text-2xl font-black text-[#EFF4FF] mb-4"
              >
                Preferencias de cookies
              </h2>
              <p
                id="cookie-preferences-description"
                className="text-sm text-[#A0AEC0] mb-6"
              >
                Gestiona tus preferencias de cookies. Las cookies necesarias son
                obligatorias y no se pueden desactivar.
              </p>

              <div className="space-y-4">
                {/* Necessary cookies - always on */}
                <div className="flex items-start justify-between gap-4 p-4 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <h3 className="font-bold text-[#EFF4FF] mb-1">
                      Cookies necesarias
                    </h3>
                    <p className="text-xs text-[#A0AEC0]">
                      Esenciales para el funcionamiento del sitio. Incluyen
                      autenticación, seguridad y diagnóstico técnico.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      Siempre activas
                    </span>
                  </div>
                </div>

                {/* Optional analytics */}
                <div className="flex items-start justify-between gap-4 p-4 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <h3 className="font-bold text-[#EFF4FF] mb-1">
                      Cookies de análisis
                    </h3>
                    <p className="text-xs text-[#A0AEC0]">
                      Nos ayudan a entender cómo los visitantes interactúan con
                      el sitio. Incluyen Vercel Analytics, Speed Insights y
                      Sentry.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => handleAnalyticsToggle(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors ${
                        preferences.analytics
                          ? "bg-[#DA1A21]"
                          : "bg-white/20"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          preferences.analytics
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#DA1A21] text-white font-bold hover:bg-[#B9141B] transition-all min-h-[44px]"
                >
                  Guardar preferencias
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all min-h-[44px]"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}