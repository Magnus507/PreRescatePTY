"use client";

import { useState, useEffect } from "react";
import CookieConsent from "./CookieConsent";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const STORAGE_KEY = "prerescue_cookie_preferences";

interface CookiePreferences {
  version: string;
  necessary: boolean;
  analytics: boolean;
  timestamp: number;
}

export default function CookieConsentProvider() {
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setAnalyticsConsent(parsed.analytics === true);
      } catch {
        setAnalyticsConsent(false);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<CookiePreferences>;
      if (customEvent.detail) {
        setAnalyticsConsent(customEvent.detail.analytics === true);
      }
    };
    window.addEventListener("prerescue:cookie-preferences-updated", handleUpdate);
    return () => window.removeEventListener("prerescue:cookie-preferences-updated", handleUpdate);
  }, []);

  return (
    <>
      <CookieConsent />
      {isLoaded && analyticsConsent && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
    </>
  );
}