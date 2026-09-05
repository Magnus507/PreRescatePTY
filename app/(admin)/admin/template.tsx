"use client";

import { useEffect } from "react";

const adminStyles = `
  :root {
    --admin-bg: #03070d;
    --admin-surface: rgba(8, 14, 24, 0.78);
    --admin-surface-strong: rgba(10, 17, 29, 0.94);
    --admin-surface-soft: rgba(255, 255, 255, 0.035);
    --admin-border: rgba(255, 255, 255, 0.075);
    --admin-border-strong: rgba(125, 211, 252, 0.16);
    --admin-text: #edf4ff;
    --admin-muted: #8998ad;
    --admin-muted-2: #5f7088;
    --admin-cyan: #7dd3fc;
    --admin-blue: #4f8cff;
    --admin-red: #ff4d55;
    --admin-green: #34d399;
  }

  html:has(.admin-control-center) {
    background: var(--admin-bg);
  }

  body:has(.admin-control-center) {
    background: var(--admin-bg);
    color: var(--admin-text);
  }

  body:has(.admin-control-center) > div {
    isolation: isolate;
  }

  .admin-control-center {
    position: relative;
    min-height: calc(100vh - 5rem);
    isolation: isolate;
    color-scheme: dark;
    background: transparent;
  }

  .admin-control-center::before {
    content: "";
    position: fixed;
    inset: 5rem 0 0;
    z-index: -3;
    pointer-events: none;
    background:
      radial-gradient(44% 54% at 84% 8%, rgba(37, 99, 235, 0.16), transparent 65%),
      radial-gradient(34% 44% at 8% 78%, rgba(6, 182, 212, 0.07), transparent 68%),
      radial-gradient(28% 36% at 72% 88%, rgba(218, 26, 33, 0.055), transparent 70%),
      linear-gradient(180deg, #040812 0%, #03070d 52%, #02050a 100%);
  }

  .admin-control-center::after {
    content: "";
    position: fixed;
    inset: 5rem 0 0;
    z-index: -2;
    pointer-events: none;
    opacity: .075;
    background-image:
      linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: linear-gradient(to bottom, black 0%, rgba(0,0,0,.55) 58%, transparent 92%);
  }

  /* Global shell */
  body:has(.admin-control-center) header {
    background:
      linear-gradient(180deg, rgba(7, 12, 21, .94), rgba(5, 10, 18, .86)) !important;
    border-color: rgba(255, 255, 255, 0.065) !important;
    box-shadow: 0 18px 60px -42px rgba(0, 0, 0, .98), inset 0 -1px 0 rgba(255,255,255,.02);
    backdrop-filter: blur(28px) saturate(145%);
    -webkit-backdrop-filter: blur(28px) saturate(145%);
  }

  body:has(.admin-control-center) aside {
    background:
      radial-gradient(120% 42% at 0% 0%, rgba(37, 99, 235, .14), transparent 66%),
      radial-gradient(88% 30% at 100% 100%, rgba(6, 182, 212, .045), transparent 72%),
      linear-gradient(180deg, rgba(7, 12, 21, .995), rgba(3, 7, 13, .995)) !important;
    border-right: 1px solid rgba(255, 255, 255, .06);
    box-shadow: 28px 0 90px -65px rgba(37, 99, 235, .8), inset -1px 0 0 rgba(255,255,255,.015);
  }

  body:has(.admin-control-center) footer {
    background: rgba(4, 8, 14, .78) !important;
    border-color: rgba(255,255,255,.055) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .admin-control-center main {
    background: transparent !important;
  }

  /* Sidebar */
  body:has(.admin-control-center) aside > div:first-child {
    border-bottom: 1px solid rgba(255,255,255,.045);
    background: linear-gradient(180deg, rgba(255,255,255,.018), transparent);
  }

  body:has(.admin-control-center) aside nav {
    padding-top: .35rem;
    padding-bottom: .75rem;
  }

  body:has(.admin-control-center) aside nav a {
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
    min-height: 3.35rem;
    border-radius: 1rem !important;
    isolation: isolate;
  }

  body:has(.admin-control-center) aside nav a::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0;
    pointer-events: none;
    background:
      radial-gradient(120% 120% at 0% 50%, rgba(56,189,248,.14), transparent 52%),
      linear-gradient(90deg, rgba(255,255,255,.035), transparent 72%);
    transition: opacity .3s ease;
  }

  body:has(.admin-control-center) aside nav a::after {
    content: "";
    position: absolute;
    left: 0;
    top: 22%;
    bottom: 22%;
    width: 2px;
    border-radius: 999px;
    background: linear-gradient(180deg, #7dd3fc, #4f8cff);
    opacity: 0;
    box-shadow: 0 0 18px rgba(56,189,248,.55);
    transition: opacity .3s ease;
  }

  body:has(.admin-control-center) aside nav a:hover {
    border-color: rgba(255, 255, 255, .065);
    background: rgba(255,255,255,.025) !important;
    transform: translateX(2px);
  }

  body:has(.admin-control-center) aside nav a:hover::before {
    opacity: 1;
  }

  body:has(.admin-control-center) aside nav a[class*="bg-gradient-to-r"] {
    background:
      linear-gradient(90deg, rgba(37,99,235,.26), rgba(14,165,233,.10)) !important;
    border-color: rgba(125,211,252,.16) !important;
    box-shadow: 0 14px 40px -26px rgba(56,189,248,.8), inset 0 1px 0 rgba(255,255,255,.055) !important;
    color: #eff8ff !important;
    transform: none !important;
  }

  body:has(.admin-control-center) aside nav a[class*="bg-gradient-to-r"]::before,
  body:has(.admin-control-center) aside nav a[class*="bg-gradient-to-r"]::after {
    opacity: 1;
  }

  body:has(.admin-control-center) aside > div:last-child {
    background: linear-gradient(180deg, transparent, rgba(255,255,255,.012));
    border-color: rgba(255,255,255,.05) !important;
  }

  /* Header search + chrome */
  body:has(.admin-control-center) header form {
    position: relative;
  }

  body:has(.admin-control-center) header input {
    min-height: 2.55rem;
    background: rgba(255,255,255,.035) !important;
    border: 1px solid rgba(255,255,255,.065) !important;
    color: #eef6ff !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.025), 0 10px 26px -24px rgba(56,189,248,.8);
  }

  body:has(.admin-control-center) header input::placeholder {
    color: #65758b !important;
  }

  body:has(.admin-control-center) header input:focus {
    border-color: rgba(125,211,252,.24) !important;
    box-shadow: 0 0 0 4px rgba(56,189,248,.055), inset 0 1px 0 rgba(255,255,255,.03) !important;
  }

  /* Primary content surfaces */
  .admin-control-center .bg-background {
    background-color: transparent !important;
  }

  .admin-control-center .bg-card {
    background:
      linear-gradient(180deg, rgba(10,17,29,.88), rgba(7,13,22,.78)) !important;
    border-color: rgba(255, 255, 255, .065) !important;
    box-shadow: 0 24px 72px -52px rgba(0, 0, 0, .98), inset 0 1px 0 rgba(255,255,255,.022) !important;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .admin-control-center main [class*="bg-white"][class*="border"],
  .admin-control-center main [class*="dark:bg-slate-900"][class*="border"],
  .admin-control-center main [class*="dark:bg-slate-800"][class*="border"] {
    background:
      linear-gradient(155deg, rgba(12,20,34,.82), rgba(7,13,23,.74)) !important;
    border-color: rgba(255,255,255,.07) !important;
    box-shadow: 0 24px 70px -52px rgba(0,0,0,.98), inset 0 1px 0 rgba(255,255,255,.022) !important;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .admin-control-center main [class*="shadow-sm"][class*="border"] {
    border-color: rgba(255,255,255,.065) !important;
    box-shadow: 0 18px 52px -42px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.018) !important;
  }

  .admin-control-center main [class*="shadow-lg"][class*="border"],
  .admin-control-center main [class*="shadow-xl"][class*="border"] {
    box-shadow: 0 26px 76px -48px rgba(0,0,0,.98), 0 0 0 1px rgba(255,255,255,.018) !important;
  }

  .admin-control-center main [class*="rounded-[2rem]"],
  .admin-control-center main [class*="rounded-[2.5rem]"] {
    position: relative;
    overflow: hidden;
  }

  .admin-control-center main [class*="rounded-[2rem]"]::before,
  .admin-control-center main [class*="rounded-[2.5rem]"]::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255,255,255,.035), transparent 36%, rgba(56,189,248,.018));
    opacity: .8;
  }

  .admin-control-center main [class*="rounded-[2rem]"] > *,
  .admin-control-center main [class*="rounded-[2.5rem]"] > * {
    position: relative;
    z-index: 1;
  }

  /* Typography hierarchy */
  .admin-control-center main .text-slate-900,
  .admin-control-center main .dark\\:text-white {
    color: #edf4ff !important;
  }

  .admin-control-center main .text-slate-600 {
    color: #a2aec0 !important;
  }

  .admin-control-center main .text-slate-500,
  .admin-control-center main .text-muted-foreground {
    color: #8291a6 !important;
  }

  .admin-control-center main .text-slate-400 {
    color: #65758c !important;
  }

  .admin-control-center main :is(h1, h2, h3) {
    text-wrap: balance;
  }

  /* Inputs and controls */
  .admin-control-center :is(input, select, textarea) {
    background-color: rgba(10, 18, 31, .88) !important;
    border-color: rgba(255,255,255,.075) !important;
    color: #edf4ff !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.02);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: border-color .2s ease, background-color .2s ease, box-shadow .2s ease;
  }

  .admin-control-center :is(input, select, textarea)::placeholder {
    color: #617087 !important;
  }

  .admin-control-center :is(input, select, textarea):hover {
    border-color: rgba(125, 211, 252, .15) !important;
    background-color: rgba(13, 23, 38, .92) !important;
  }

  .admin-control-center :is(input, select, textarea):focus {
    border-color: rgba(125, 211, 252, .3) !important;
    box-shadow: 0 0 0 4px rgba(56, 189, 248, .055) !important;
  }

  .admin-control-center select option {
    background: #0b1320;
    color: #edf4ff;
  }

  /* Tables */
  .admin-control-center table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    color: #dce6f4;
  }

  .admin-control-center table thead {
    background: rgba(255,255,255,.022) !important;
  }

  .admin-control-center table thead th {
    color: #718198 !important;
    font-size: .66rem;
    letter-spacing: .12em;
    text-transform: uppercase;
    font-weight: 800;
    white-space: nowrap;
  }

  .admin-control-center table tbody tr {
    transition: background-color .2s ease, box-shadow .2s ease;
  }

  .admin-control-center table tbody tr:nth-child(even) {
    background: rgba(255,255,255,.008);
  }

  .admin-control-center table tbody tr:hover {
    background: rgba(56,189,248,.026) !important;
    box-shadow: inset 2px 0 0 rgba(125,211,252,.22);
  }

  .admin-control-center table :is(th, td) {
    border-color: rgba(255,255,255,.045) !important;
  }

  .admin-control-center table td {
    color: #aebacc;
  }

  /* Dialogs, drawers and floating panels */
  .admin-control-center [role="dialog"],
  .admin-control-center [aria-modal="true"] {
    background:
      linear-gradient(160deg, rgba(12,20,34,.985), rgba(6,11,20,.985)) !important;
    border: 1px solid rgba(255,255,255,.09) !important;
    box-shadow: 0 40px 120px -50px rgba(0,0,0,1), 0 0 60px -45px rgba(56,189,248,.7) !important;
    backdrop-filter: blur(26px);
    -webkit-backdrop-filter: blur(26px);
  }

  .admin-control-center [class*="fixed"][class*="inset-0"][class*="bg-black"],
  .admin-control-center [class*="fixed"][class*="inset-0"][class*="bg-slate-900"] {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  /* Buttons and interactive polish */
  .admin-control-center button,
  .admin-control-center a {
    -webkit-tap-highlight-color: transparent;
  }

  .admin-control-center main button,
  .admin-control-center main a {
    transition-property: color, background-color, border-color, box-shadow, transform, opacity;
    transition-duration: .22s;
    transition-timing-function: ease;
  }

  .admin-control-center main button:hover:not(:disabled),
  .admin-control-center main a:hover {
    filter: brightness(1.04);
  }

  .admin-control-center main button:active:not(:disabled),
  .admin-control-center main a:active {
    transform: translateY(1px) scale(.995);
  }

  .admin-control-center :is(button, a, input, select, textarea):focus-visible {
    outline: 2px solid rgba(125, 211, 252, .72);
    outline-offset: 2px;
  }

  /* Status colors on dark surfaces */
  .admin-control-center .text-emerald-700,
  .admin-control-center .text-emerald-600 {
    color: #34d399 !important;
  }

  .admin-control-center .text-blue-700,
  .admin-control-center .text-blue-600 {
    color: #60a5fa !important;
  }

  .admin-control-center .text-indigo-600 {
    color: #818cf8 !important;
  }

  .admin-control-center .text-purple-600,
  .admin-control-center .text-violet-600 {
    color: #c084fc !important;
  }

  .admin-control-center .text-amber-700,
  .admin-control-center .text-amber-600 {
    color: #fbbf24 !important;
  }

  .admin-control-center .text-red-700,
  .admin-control-center .text-red-600 {
    color: #fb7185 !important;
  }

  .admin-control-center .text-cyan-600 {
    color: #67e8f9 !important;
  }

  /* Selection + scrollbars */
  .admin-control-center ::selection {
    background: rgba(56,189,248,.28);
    color: white;
  }

  .admin-control-center ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  .admin-control-center ::-webkit-scrollbar-track {
    background: rgba(255,255,255,.012);
  }

  .admin-control-center ::-webkit-scrollbar-thumb {
    background: rgba(148,163,184,.16);
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
  }

  .admin-control-center ::-webkit-scrollbar-thumb:hover {
    background: rgba(125,211,252,.25);
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  /* Responsive admin */
  @media (max-width: 1279px) {
    .admin-control-center main table {
      font-size: .88rem;
    }
  }

  @media (max-width: 767px) {
    body:has(.admin-control-center) header {
      padding-left: .85rem !important;
      padding-right: .85rem !important;
    }

    .admin-control-center::before,
    .admin-control-center::after {
      inset-top: 5rem;
    }

    .admin-control-center main [class*="rounded-[2rem]"],
    .admin-control-center main [class*="rounded-[2.5rem]"] {
      border-radius: 1.35rem !important;
    }

    .admin-control-center main [class*="p-8"] {
      padding: 1.15rem;
    }

    .admin-control-center main [class*="p-6"] {
      padding: 1rem;
    }

    .admin-control-center table {
      min-width: 680px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .admin-control-center *,
    .admin-control-center *::before,
    .admin-control-center *::after {
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
      animation-duration: .01ms !important;
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
    <div className="admin-cinematic-theme admin-control-center">
      <style dangerouslySetInnerHTML={{ __html: adminStyles }} />
      {children}
    </div>
  );
}
