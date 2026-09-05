const clientDashboardStyles = `
  :root {
    --client-shell: #07101c;
    --client-shell-2: #0b1624;
    --client-bg: #f4f7fb;
    --client-card: #ffffff;
    --client-border: rgba(15, 23, 42, 0.085);
    --client-text: #0f172a;
    --client-muted: #64748b;
    --client-red: #da1a21;
    --client-red-dark: #b9141b;
    --client-blue: #2563eb;
  }

  body:has(.client-dashboard-mobile-theme) {
    background: var(--client-bg);
  }

  body:has(.client-dashboard-mobile-theme) main {
    background:
      radial-gradient(circle at 88% 2%, rgba(37, 99, 235, 0.055), transparent 24%),
      radial-gradient(circle at 8% 0%, rgba(218, 26, 33, 0.045), transparent 22%),
      linear-gradient(180deg, #f7f9fc 0%, #f2f5f9 100%) !important;
  }

  body:has(.client-dashboard-mobile-theme) aside {
    background:
      radial-gradient(120% 44% at 0% 0%, rgba(37, 99, 235, .16), transparent 62%),
      radial-gradient(90% 30% at 100% 100%, rgba(218, 26, 33, .07), transparent 68%),
      linear-gradient(180deg, #091321 0%, #060d17 100%) !important;
    border-color: rgba(255,255,255,.065) !important;
    box-shadow: 26px 0 80px -62px rgba(15,23,42,.95);
  }

  body:has(.client-dashboard-mobile-theme) aside :is(p, span) {
    text-shadow: none;
  }

  body:has(.client-dashboard-mobile-theme) aside a:not([aria-current="page"]) {
    color: #a8b6c9 !important;
  }

  body:has(.client-dashboard-mobile-theme) aside a:not([aria-current="page"]):hover {
    background: rgba(255,255,255,.045) !important;
    border-color: rgba(255,255,255,.07) !important;
    color: #fff !important;
  }

  body:has(.client-dashboard-mobile-theme) aside [aria-current="page"] {
    background: linear-gradient(135deg, #e1262d 0%, #b9141b 100%) !important;
    border-color: rgba(255,255,255,.1) !important;
    color: #fff !important;
    box-shadow: 0 16px 34px -22px rgba(218,26,33,.68) !important;
  }

  .client-dashboard-mobile-theme {
    min-height: 100%;
    color: var(--client-text);
  }

  .client-dashboard-mobile-theme :is(h1, h2, h3) {
    text-wrap: balance;
  }

  .client-dashboard-mobile-theme [class*="bg-white"][class*="border"] {
    border-color: var(--client-border) !important;
    box-shadow: 0 20px 50px -38px rgba(15,23,42,.22) !important;
  }

  .client-dashboard-mobile-theme [class*="rounded-"][class*="border"] {
    transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
  }

  .client-dashboard-mobile-theme :is(input, select, textarea) {
    border-color: rgba(15,23,42,.11) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
  }

  .client-dashboard-mobile-theme :is(input, select, textarea):focus {
    border-color: rgba(218,26,33,.35) !important;
    box-shadow: 0 0 0 4px rgba(218,26,33,.07) !important;
  }

  .client-dashboard-mobile-theme :is(button, a, input, select, textarea):focus-visible {
    outline: 2px solid rgba(218,26,33,.72);
    outline-offset: 2px;
  }

  .client-dashboard-mobile-theme table {
    border-collapse: separate;
    border-spacing: 0;
  }

  .client-dashboard-mobile-theme thead {
    background: #f8fafc;
  }

  .client-dashboard-mobile-theme tbody tr {
    transition: background-color .18s ease;
  }

  .client-dashboard-mobile-theme tbody tr:hover {
    background: rgba(37,99,235,.025);
  }

  .client-dashboard-mobile-theme [role="dialog"],
  .client-dashboard-mobile-theme [aria-modal="true"] {
    border-color: rgba(15,23,42,.09) !important;
    box-shadow: 0 32px 90px -44px rgba(15,23,42,.42) !important;
  }

  /* Floating mobile app navigation */
  @media (max-width: 1023px) {
    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] {
      left: 50% !important;
      right: auto !important;
      bottom: calc(env(safe-area-inset-bottom) + .5rem) !important;
      width: calc(100% - 1rem) !important;
      max-width: 34rem;
      transform: translateX(-50%);
      padding: .42rem !important;
      border: 1px solid rgba(255,255,255,.085) !important;
      border-radius: 1.45rem !important;
      background: rgba(7, 16, 28, .94) !important;
      box-shadow: 0 20px 52px -22px rgba(2,6,23,.58), inset 0 1px 0 rgba(255,255,255,.045) !important;
      backdrop-filter: blur(24px) saturate(150%);
      -webkit-backdrop-filter: blur(24px) saturate(150%);
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] > div {
      gap: .25rem !important;
      overflow: visible !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] :is(a, button) {
      min-width: 0 !important;
      min-height: 3.65rem !important;
      padding: .48rem .3rem !important;
      border-radius: 1.05rem !important;
      color: #8fa0b6 !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] [aria-current="page"],
    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] button[aria-expanded="true"] {
      color: #fff !important;
      background: linear-gradient(145deg, rgba(218,26,33,.96), rgba(185,20,27,.86)) !important;
      box-shadow: 0 12px 24px -16px rgba(218,26,33,.9) !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] svg {
      width: 1.25rem !important;
      height: 1.25rem !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] span {
      font-size: .6rem !important;
      letter-spacing: .055em !important;
      text-transform: none !important;
      line-height: 1.05 !important;
    }

    body:has(.client-dashboard-mobile-theme) main > div {
      padding-top: .85rem !important;
      padding-left: .85rem !important;
      padding-right: .85rem !important;
      padding-bottom: calc(env(safe-area-inset-bottom) + 6.7rem) !important;
    }

    .client-dashboard-mobile-theme {
      width: 100%;
      overflow-x: clip;
    }

    .client-dashboard-mobile-theme > * {
      max-width: 100%;
    }

    .client-dashboard-mobile-theme [class*="rounded-[2rem]"] {
      border-radius: 1.45rem !important;
    }

    .client-dashboard-mobile-theme [class*="rounded-[2.5rem]"],
    .client-dashboard-mobile-theme [class*="rounded-[3rem]"] {
      border-radius: 1.55rem !important;
    }

    .client-dashboard-mobile-theme [class*="p-8"] {
      padding: 1.1rem !important;
    }

    .client-dashboard-mobile-theme [class*="p-6"] {
      padding: 1rem !important;
    }

    .client-dashboard-mobile-theme [class*="p-5"] {
      padding: .95rem !important;
    }

    .client-dashboard-mobile-theme [class*="gap-6"] {
      gap: 1rem !important;
    }

    .client-dashboard-mobile-theme [class*="space-y-8"] > :not([hidden]) ~ :not([hidden]) {
      margin-top: 1.25rem !important;
    }

    .client-dashboard-mobile-theme h1 {
      font-size: clamp(2rem, 10vw, 2.7rem) !important;
      line-height: .98 !important;
      letter-spacing: -.035em !important;
    }

    .client-dashboard-mobile-theme h2 {
      line-height: 1.04;
    }

    .client-dashboard-mobile-theme :is(input, select, textarea) {
      min-height: 3rem;
      font-size: 16px !important;
      border-radius: 1rem !important;
    }

    .client-dashboard-mobile-theme textarea {
      min-height: 7rem;
    }

    .client-dashboard-mobile-theme button {
      min-height: 44px;
      touch-action: manipulation;
    }

    .client-dashboard-mobile-theme a {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .client-dashboard-mobile-theme table {
      font-size: .82rem;
    }

    .client-dashboard-mobile-theme th {
      white-space: nowrap;
      font-size: .66rem;
      letter-spacing: .07em;
    }

    .client-dashboard-mobile-theme td,
    .client-dashboard-mobile-theme th {
      padding-top: .75rem !important;
      padding-bottom: .75rem !important;
    }

    body:has(.client-dashboard-mobile-theme) div[class*="max-h-[75vh]"][class*="bottom-0"] {
      left: .5rem !important;
      right: .5rem !important;
      bottom: calc(env(safe-area-inset-bottom) + .5rem) !important;
      max-height: min(78vh, 42rem) !important;
      border: 1px solid rgba(255,255,255,.085) !important;
      border-radius: 1.55rem !important;
      background: linear-gradient(180deg, #0b1624 0%, #07101c 100%) !important;
      color: white !important;
      box-shadow: 0 28px 80px -30px rgba(2,6,23,.72) !important;
      padding: 1rem !important;
    }

    body:has(.client-dashboard-mobile-theme) div[class*="max-h-[75vh]"][class*="bottom-0"] a {
      min-height: 3.25rem;
      border-color: rgba(255,255,255,.075) !important;
      background: rgba(255,255,255,.045) !important;
      color: #eef5ff !important;
      border-radius: 1rem !important;
    }

    body:has(.client-dashboard-mobile-theme) div[class*="max-h-[75vh]"][class*="bottom-0"] a:active {
      background: rgba(218,26,33,.14) !important;
    }
  }

  @media (max-width: 390px) {
    body:has(.client-dashboard-mobile-theme) main > div {
      padding-left: .7rem !important;
      padding-right: .7rem !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] {
      width: calc(100% - .7rem) !important;
      bottom: calc(env(safe-area-inset-bottom) + .35rem) !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] span {
      font-size: .56rem !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .client-dashboard-mobile-theme *,
    .client-dashboard-mobile-theme *::before,
    .client-dashboard-mobile-theme *::after {
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="client-dashboard-mobile-theme">
      <style dangerouslySetInnerHTML={{ __html: clientDashboardStyles }} />
      {children}
    </div>
  );
}
