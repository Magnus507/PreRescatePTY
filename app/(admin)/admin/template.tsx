"use client";

import { useEffect } from "react";

const adminStyles = `
  body:has(.admin-cinematic-theme) {
    background: #04070d;
  }

  body:has(.admin-cinematic-theme) > div {
    isolation: isolate;
  }

  body:has(.admin-cinematic-theme) header {
    background: rgba(5, 9, 16, 0.78) !important;
    border-color: rgba(255, 255, 255, 0.065) !important;
    box-shadow: 0 18px 70px -42px rgba(0, 0, 0, 0.98);
    backdrop-filter: blur(26px) saturate(145%);
    -webkit-backdrop-filter: blur(26px) saturate(145%);
  }

  body:has(.admin-cinematic-theme) aside {
    background:
      radial-gradient(130% 42% at 0% 0%, rgba(37, 99, 235, 0.11), transparent 65%),
      linear-gradient(180deg, rgba(7, 12, 21, 0.995), rgba(4, 8, 14, 0.995)) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 28px 0 80px -58px rgba(37, 99, 235, 0.72);
  }

  body:has(.admin-cinematic-theme) aside nav a {
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
  }

  body:has(.admin-cinematic-theme) aside nav a::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(110deg, transparent 18%, rgba(255,255,255,.055), transparent 58%);
    transition: opacity .35s ease;
  }

  body:has(.admin-cinematic-theme) aside nav a:hover {
    border-color: rgba(255, 255, 255, 0.06);
    transform: translateX(2px);
  }

  body:has(.admin-cinematic-theme) aside nav a:hover::after {
    opacity: 1;
  }

  .admin-cinematic-theme {
    position: relative;
    min-height: calc(100vh - 5rem);
    isolation: isolate;
    color-scheme: dark;
  }

  .admin-cinematic-theme::before {
    content: "";
    position: fixed;
    inset: 5rem 0 0;
    z-index: -2;
    pointer-events: none;
    background:
      radial-gradient(48% 58% at 87% 18%, rgba(37, 99, 235, 0.105), transparent 65%),
      radial-gradient(38% 50% at 14% 80%, rgba(6, 182, 212, 0.052), transparent 68%),
      radial-gradient(30% 40% at 68% 92%, rgba(218, 26, 33, 0.045), transparent 68%),
      #04070d;
  }

  .admin-cinematic-theme::after {
    content: "";
    position: fixed;
    inset: 5rem 0 0;
    z-index: -1;
    pointer-events: none;
    opacity: .085;
    background-image:
      linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
    background-size: 76px 76px;
    mask-image: linear-gradient(to bottom, black, transparent 82%);
  }

  .admin-cinematic-theme .bg-background {
    background-color: transparent !important;
  }

  .admin-cinematic-theme .bg-card {
    background: rgba(8, 14, 24, 0.72) !important;
    border-color: rgba(255, 255, 255, 0.065) !important;
    box-shadow: 0 24px 70px -52px rgba(0, 0, 0, 0.96);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .admin-cinematic-theme :is(input, select, textarea) {
    background-color: rgba(12, 20, 33, 0.82) !important;
    border-color: rgba(255, 255, 255, 0.075) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.02);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .admin-cinematic-theme :is(input, select, textarea):hover {
    border-color: rgba(125, 211, 252, 0.16) !important;
  }

  .admin-cinematic-theme :is(input, select, textarea):focus {
    border-color: rgba(125, 211, 252, 0.3) !important;
    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.06) !important;
  }

  .admin-cinematic-theme table {
    border-collapse: separate;
    border-spacing: 0;
  }

  .admin-cinematic-theme thead {
    background: rgba(255,255,255,.018);
  }

  .admin-cinematic-theme tbody tr {
    transition: background-color .22s ease, transform .22s ease;
  }

  .admin-cinematic-theme tbody tr:hover {
    background-color: rgba(56, 189, 248, 0.025);
  }

  .admin-cinematic-theme :is(th, td) {
    border-color: rgba(255,255,255,.05) !important;
  }

  .admin-cinematic-theme button,
  .admin-cinematic-theme a {
    -webkit-tap-highlight-color: transparent;
  }

  .admin-cinematic-theme :is(button, a, input, select, textarea):focus-visible {
    outline: 2px solid rgba(125, 211, 252, 0.72);
    outline-offset: 2px;
  }

  .admin-cinematic-theme ::selection {
    background: rgba(56, 189, 248, 0.3);
    color: white;
  }

  .admin-cinematic-theme ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  .admin-cinematic-theme ::-webkit-scrollbar-track {
    background: rgba(255,255,255,.018);
  }

  .admin-cinematic-theme ::-webkit-scrollbar-thumb {
    background: rgba(148,163,184,.17);
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
  }

  .admin-cinematic-theme ::-webkit-scrollbar-thumb:hover {
    background: rgba(125,211,252,.25);
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  @media (max-width: 767px) {
    body:has(.admin-cinematic-theme) header {
      padding-left: 1rem !important;
      padding-right: 1rem !important;
    }

    .admin-cinematic-theme::before,
    .admin-cinematic-theme::after {
      inset-top: 5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .admin-cinematic-theme *,
    .admin-cinematic-theme *::before,
    .admin-cinematic-theme *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const alreadyDark = root.classList.contains("dark");
    root.classList.add("dark");

    return () => {
      if (!alreadyDark) root.classList.remove("dark");
    };
  }, []);

  return (
    <div className="admin-cinematic-theme">
      <style dangerouslySetInnerHTML={{ __html: adminStyles }} />
      {children}
    </div>
  );
}
