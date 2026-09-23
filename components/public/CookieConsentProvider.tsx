"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import CookieConsent from "./CookieConsent";
import { sanitizePublicAnalyticsUrl } from "@/lib/security/telemetry";

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((module) => module.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((module) => module.SpeedInsights),
  { ssr: false },
);

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
    const stored = window.localStorage.getItem(STORAGE_KEY);
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
    return () =>
      window.removeEventListener("prerescue:cookie-preferences-updated", handleUpdate);
  }, []);

  return (
    <>
      <CookieConsent />
      {isLoaded && analyticsConsent && (
        <>
          <Analytics
            beforeSend={(event) => {
              const url = sanitizePublicAnalyticsUrl(event.url);
              return url ? { ...event, url } : null;
            }}
          />
          <SpeedInsights
            beforeSend={(data) => {
              const url = sanitizePublicAnalyticsUrl(data.url);
              return url ? { ...data, url } : null;
            }}
          />
        </>
      )}
    </>
  );
}
