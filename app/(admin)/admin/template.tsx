"use client";

import { useEffect } from "react";

const adminStyles = `
  body:has(.admin-cinematic-theme) {
    background: #050812;
  }

  body:has(.admin-cinematic-theme) > div {
    isolation: isolate;
  }

  body:has(.admin-cinematic-theme) header {
    background: rgba(7, 11, 18, 0.78) !important;
    border-color: rgba(255, 255, 255, 0.07) !important;
    box-shadow: 0 18px 60px -38px rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(24px) saturate(140%);
    -webkit-backdrop-filter: blur(24px) saturate(140%);
  }

  body:has(.admin-cinematic-theme) aside {
    background: linear-gradient(180deg, rgba(8, 13, 22, 0.98), rgba(5, 8, 14, 0.98)) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.065);
    box-shadow: 24px 0 70px -52px rgba(37, 99, 235, 0.65);
  }

  body:has(.admin-cinematic-theme) aside nav a {
    border: 1px solid transparent;
  }

  body:has(.admin-cinematic-theme) aside nav a:hover {
    border-color: rgba(255, 255, 255, 0.055);
  }

  .admin-cinematic-theme {
    position: relative;
    min-height: calc(100vh - 5rem);
    isolation: isolate;
  }

  .admin-cinematic-theme::before {
    content: "";
    position: fixed;
    inset: 5rem 0 0;
    z-index: -2;
    pointer-events: none;
    background:
      radial-gradient(45% 55% at 85% 18%, rgba(37, 99, 235, 0.10), transparent 64%),
      radial-gradient(38% 50% at 18% 76%, rgba(6, 182, 212, 0.055), transparent 66%),
      #050812;
  }

  .admin-cinematic-theme::after {
    content: "";
    position: fixed;
    inset: 5rem 0 0;
    z-index: -1;
    pointer-events: none;
    opacity: .11;
    background-image:
      linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: linear-gradient(to bottom, black, transparent 78%);
  }

  .admin-cinematic-theme input,
  .admin-cinematic-theme select,
  .admin-cinematic-theme textarea {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .admin-cinematic-theme table {
    border-collapse: separate;
    border-spacing: 0;
  }

  .admin-cinematic-theme :is(button, a, input, select, textarea):focus-visible {
    outline: 2px solid rgba(125, 211, 252, 0.7);
    outline-offset: 2px;
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
