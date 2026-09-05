const clientDashboardStyles = `
  :root {
    --client-bg-0: #eef4fb;
    --client-bg-1: #e6eef8;
    --client-bg-2: #dbe7f4;
    --client-ink: #08111f;
    --client-muted: #66758a;
    --client-red: #da1a21;
    --client-red-hot: #f1252e;
    --client-blue: #2f7df5;
    --client-cyan: #59d7ff;
    --client-emerald: #34d399;
    --client-glass: rgba(255,255,255,.72);
    --client-line: rgba(96,125,158,.18);
  }

  body:has(.client-dashboard-mobile-theme) {
    background: var(--client-bg-0);
  }

  body:has(.client-dashboard-mobile-theme) main {
    position: relative;
    isolation: isolate;
    background:
      radial-gradient(70rem 42rem at 108% -8%, rgba(79,149,255,.20), transparent 56%),
      radial-gradient(42rem 30rem at -10% 13%, rgba(218,26,33,.09), transparent 58%),
      radial-gradient(34rem 28rem at 74% 76%, rgba(71,207,255,.12), transparent 62%),
      linear-gradient(155deg, #f7faff 0%, #edf3fa 42%, #e8eff8 100%) !important;
  }

  body:has(.client-dashboard-mobile-theme) main::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    opacity: .38;
    background-image:
      linear-gradient(rgba(60,92,128,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(60,92,128,.04) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: linear-gradient(to bottom, black, transparent 74%);
  }

  body:has(.client-dashboard-mobile-theme) main::after {
    content: "";
    position: fixed;
    width: 19rem;
    height: 19rem;
    right: -8rem;
    top: 18vh;
    z-index: -1;
    border-radius: 999px;
    pointer-events: none;
    background: radial-gradient(circle, rgba(94,213,255,.18), rgba(47,125,245,.07) 38%, transparent 70%);
    filter: blur(8px);
  }

  body:has(.client-dashboard-mobile-theme) aside {
    background:
      radial-gradient(100% 42% at 10% 0%, rgba(69,139,255,.18), transparent 62%),
      radial-gradient(95% 34% at 100% 100%, rgba(218,26,33,.10), transparent 70%),
      linear-gradient(180deg, #08111d 0%, #050b13 100%) !important;
    border-color: rgba(255,255,255,.075) !important;
    box-shadow: 28px 0 90px -58px rgba(2,6,23,.96), inset -1px 0 0 rgba(255,255,255,.025);
  }

  body:has(.client-dashboard-mobile-theme) aside a:not([aria-current="page"]) {
    color: #9eb0c7 !important;
  }

  body:has(.client-dashboard-mobile-theme) aside a:not([aria-current="page"]):hover {
    background: linear-gradient(110deg, rgba(255,255,255,.055), rgba(255,255,255,.018)) !important;
    border-color: rgba(121,180,255,.10) !important;
    color: #fff !important;
  }

  body:has(.client-dashboard-mobile-theme) aside [aria-current="page"] {
    background:
      radial-gradient(circle at 15% 25%, rgba(255,255,255,.20), transparent 28%),
      linear-gradient(135deg, #ef222b 0%, #bd1119 100%) !important;
    border-color: rgba(255,255,255,.12) !important;
    color: #fff !important;
    box-shadow:
      0 18px 40px -24px rgba(218,26,33,.78),
      inset 0 1px 0 rgba(255,255,255,.22),
      inset 0 -1px 0 rgba(70,0,4,.35) !important;
  }

  .client-dashboard-mobile-theme {
    position: relative;
    min-height: 100%;
    color: var(--client-ink);
    perspective: 1200px;
  }

  .client-dashboard-mobile-theme :is(h1,h2,h3) {
    text-wrap: balance;
  }

  .client-dashboard-mobile-theme [class*="rounded-"][class*="border"] {
    transition:
      transform .34s cubic-bezier(.2,.8,.2,1),
      border-color .26s ease,
      box-shadow .34s ease,
      background-color .26s ease;
  }

  .client-dashboard-mobile-theme [class*="bg-white"][class*="border"] {
    border-color: rgba(109,135,164,.17) !important;
    box-shadow:
      0 22px 54px -38px rgba(21,42,68,.32),
      inset 0 1px 0 rgba(255,255,255,.92) !important;
  }

  .client-dashboard-mobile-theme :is(input,select,textarea) {
    border-color: rgba(71,97,126,.15) !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.92),
      0 10px 28px -24px rgba(20,42,70,.26);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .client-dashboard-mobile-theme :is(input,select,textarea):focus {
    border-color: rgba(47,125,245,.42) !important;
    box-shadow:
      0 0 0 4px rgba(47,125,245,.08),
      0 12px 30px -22px rgba(47,125,245,.30) !important;
  }

  .client-dashboard-mobile-theme :is(button,a,input,select,textarea):focus-visible {
    outline: 2px solid rgba(66,154,255,.78);
    outline-offset: 2px;
  }

  .client-dashboard-mobile-theme button,
  .client-dashboard-mobile-theme a {
    -webkit-tap-highlight-color: transparent;
  }

  .client-dashboard-mobile-theme table {
    border-collapse: separate;
    border-spacing: 0;
  }

  .client-dashboard-mobile-theme thead {
    background: linear-gradient(180deg, rgba(242,247,253,.98), rgba(234,242,250,.88));
  }

  .client-dashboard-mobile-theme tbody tr {
    transition: background-color .18s ease, transform .18s ease;
  }

  .client-dashboard-mobile-theme tbody tr:hover {
    background: rgba(47,125,245,.035);
  }

  .client-dashboard-mobile-theme [role="dialog"],
  .client-dashboard-mobile-theme [aria-modal="true"] {
    border-color: rgba(107,139,176,.16) !important;
    background:
      radial-gradient(circle at 88% 0%, rgba(68,157,255,.08), transparent 34%),
      rgba(250,252,255,.94) !important;
    box-shadow:
      0 36px 100px -42px rgba(5,15,30,.48),
      inset 0 1px 0 rgba(255,255,255,.95) !important;
    backdrop-filter: blur(28px) saturate(140%);
    -webkit-backdrop-filter: blur(28px) saturate(140%);
  }

  /* Dashboard home: layered hero surface */
  .client-dashboard-mobile-theme > div > section:first-of-type > div > div {
    position: relative;
    background:
      radial-gradient(44rem 26rem at 96% 0%, rgba(70,153,255,.12), transparent 56%),
      radial-gradient(32rem 20rem at 2% 100%, rgba(218,26,33,.075), transparent 60%),
      linear-gradient(145deg, rgba(255,255,255,.94), rgba(246,250,255,.78)) !important;
    border-color: rgba(107,139,176,.16) !important;
    box-shadow:
      0 30px 80px -52px rgba(19,43,72,.46),
      inset 0 1px 0 rgba(255,255,255,.98),
      inset 0 -1px 0 rgba(98,129,163,.06) !important;
    backdrop-filter: blur(22px) saturate(145%);
    -webkit-backdrop-filter: blur(22px) saturate(145%);
  }

  .client-dashboard-mobile-theme > div > section:first-of-type > div > div::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    background:
      linear-gradient(120deg, rgba(255,255,255,.72), transparent 18% 72%, rgba(80,168,255,.09)),
      repeating-linear-gradient(125deg, rgba(54,91,130,.022) 0 1px, transparent 1px 12px);
    mask-image: linear-gradient(black, transparent 92%);
  }

  .client-dashboard-mobile-theme > div > section:first-of-type > div > div::after {
    content: "";
    position: absolute;
    width: 11rem;
    height: 11rem;
    right: -4.2rem;
    bottom: -5rem;
    pointer-events: none;
    border-radius: 999px;
    border: 1px solid rgba(69,151,255,.16);
    box-shadow:
      0 0 0 18px rgba(69,151,255,.025),
      0 0 0 42px rgba(69,151,255,.018),
      0 0 60px rgba(69,151,255,.12);
  }

  .client-dashboard-mobile-theme > div > section:first-of-type [class*="sm:grid-cols-3"] > div {
    background:
      radial-gradient(circle at 100% 0%, rgba(73,158,255,.09), transparent 46%),
      linear-gradient(145deg, rgba(255,255,255,.90), rgba(239,246,253,.72)) !important;
    border-color: rgba(88,123,162,.15) !important;
    box-shadow:
      0 18px 38px -30px rgba(18,43,72,.38),
      inset 0 1px 0 rgba(255,255,255,.94) !important;
    backdrop-filter: blur(12px);
  }

  .client-dashboard-mobile-theme > div > section:first-of-type [class*="xl:grid-cols"] > div:last-child {
    background:
      radial-gradient(circle at 100% 0%, rgba(80,176,255,.12), transparent 42%),
      linear-gradient(160deg, rgba(255,255,255,.88), rgba(237,246,255,.74)) !important;
    border-color: rgba(83,124,165,.17) !important;
    box-shadow:
      0 24px 56px -40px rgba(17,45,75,.42),
      inset 0 1px 0 rgba(255,255,255,.95) !important;
    backdrop-filter: blur(18px) saturate(135%);
  }

  /* Home lower cards: each one gets a distinct material identity */
  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(1) {
    position: relative;
    background:
      radial-gradient(18rem 13rem at 100% 10%, rgba(29,220,196,.20), transparent 52%),
      radial-gradient(15rem 12rem at 16% 100%, rgba(61,132,255,.12), transparent 58%),
      linear-gradient(145deg, #0b1420 0%, #0c1825 52%, #08111b 100%) !important;
    border-color: rgba(110,223,255,.18) !important;
    box-shadow:
      0 26px 62px -34px rgba(1,8,18,.78),
      0 0 0 1px rgba(255,255,255,.025) inset,
      0 0 46px -32px rgba(75,219,255,.50) !important;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(1)::after {
    content: "+";
    position: absolute;
    right: .95rem;
    bottom: .9rem;
    width: 5.4rem;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    color: rgba(230,249,255,.76);
    font-size: 2.15rem;
    font-weight: 900;
    border-radius: 1.45rem;
    border: 1px solid rgba(126,229,255,.26);
    background:
      radial-gradient(circle at 28% 18%, rgba(255,255,255,.28), transparent 27%),
      linear-gradient(145deg, rgba(96,202,255,.28), rgba(19,66,101,.14));
    box-shadow:
      0 20px 36px -22px rgba(52,210,255,.70),
      inset 0 1px 0 rgba(255,255,255,.28),
      inset 0 -10px 24px rgba(0,0,0,.22),
      -15px 14px 34px -24px rgba(218,26,33,.42);
    transform: perspective(520px) rotateY(-20deg) rotateX(11deg) rotateZ(-7deg);
    opacity: .60;
    pointer-events: none;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(2) {
    position: relative;
    background:
      radial-gradient(18rem 15rem at 100% 40%, rgba(255,255,255,.10), transparent 50%),
      radial-gradient(17rem 13rem at 5% 105%, rgba(240,34,45,.34), transparent 56%),
      linear-gradient(140deg, #080b12 0%, #111722 56%, #271016 100%) !important;
    border-color: rgba(255,100,110,.20) !important;
    box-shadow:
      0 28px 64px -34px rgba(10,3,8,.80),
      inset 0 1px 0 rgba(255,255,255,.05),
      0 0 52px -34px rgba(235,33,44,.62) !important;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(2)::after {
    content: "";
    position: absolute;
    right: 1rem;
    bottom: 1.05rem;
    width: 5rem;
    height: 3.1rem;
    border-radius: 999px;
    border: 1px solid rgba(255,128,136,.24);
    background:
      radial-gradient(circle at 38% 30%, rgba(255,255,255,.25), transparent 25%),
      linear-gradient(155deg, rgba(238,46,57,.36), rgba(23,11,17,.62));
    box-shadow:
      0 17px 28px -14px rgba(230,29,41,.52),
      inset 0 1px 0 rgba(255,255,255,.23),
      inset 0 -10px 18px rgba(0,0,0,.26),
      -1rem .8rem 0 -.32rem rgba(223,35,45,.13);
    transform: perspective(440px) rotateX(58deg) rotateZ(-10deg);
    opacity: .65;
    pointer-events: none;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(3) {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(24rem 14rem at 100% 50%, rgba(78,171,255,.16), transparent 56%),
      linear-gradient(145deg, rgba(255,255,255,.90), rgba(232,243,253,.82)) !important;
    border-color: rgba(75,135,192,.18) !important;
    box-shadow:
      0 24px 58px -40px rgba(15,56,94,.44),
      inset 0 1px 0 rgba(255,255,255,.96) !important;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(3)::after {
    content: "";
    position: absolute;
    width: 8.5rem;
    height: 8.5rem;
    right: -3.4rem;
    bottom: -4.5rem;
    border: 1px solid rgba(57,146,228,.20);
    border-radius: 50%;
    box-shadow:
      0 0 0 18px rgba(57,146,228,.035),
      0 0 0 38px rgba(57,146,228,.022),
      0 0 48px rgba(57,146,228,.18);
    pointer-events: none;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(-n+2) > * {
    position: relative;
    z-index: 1;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) a {
    box-shadow:
      0 16px 34px -24px rgba(4,15,29,.52),
      inset 0 1px 0 rgba(255,255,255,.34),
      inset 0 -1px 0 rgba(5,20,36,.10) !important;
  }

  .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(2) a {
    background:
      radial-gradient(circle at 25% 0%, rgba(255,255,255,.20), transparent 32%),
      linear-gradient(135deg, #f0242d, #c5111a) !important;
    border-color: rgba(255,255,255,.08) !important;
    box-shadow:
      0 18px 38px -20px rgba(232,25,38,.74),
      inset 0 1px 0 rgba(255,255,255,.28),
      inset 0 -2px 0 rgba(84,0,4,.32) !important;
  }

  @media (hover: hover) and (pointer: fine) {
    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:hover {
      transform: translateY(-4px) rotateX(.35deg);
    }
  }

  /* Floating navigation dock: 2080, but still practical */
  @media (max-width: 1023px) {
    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] {
      left: 50% !important;
      right: auto !important;
      bottom: calc(env(safe-area-inset-bottom) + .6rem) !important;
      width: calc(100% - 1rem) !important;
      max-width: 34rem;
      min-height: 4.7rem;
      transform: translateX(-50%);
      padding: .46rem !important;
      border: 1px solid transparent !important;
      border-radius: 1.72rem !important;
      background:
        linear-gradient(155deg, rgba(7,15,26,.96), rgba(11,22,36,.92)) padding-box,
        linear-gradient(110deg, rgba(117,212,255,.52), rgba(255,255,255,.09) 42%, rgba(242,46,57,.50)) border-box !important;
      box-shadow:
        0 30px 70px -28px rgba(2,6,23,.82),
        0 8px 26px -18px rgba(64,173,255,.48),
        inset 0 1px 0 rgba(255,255,255,.10),
        inset 0 -1px 0 rgba(0,0,0,.45) !important;
      backdrop-filter: blur(32px) saturate(165%);
      -webkit-backdrop-filter: blur(32px) saturate(165%);
      overflow: visible;
      isolation: isolate;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"]::before {
      content: "";
      position: absolute;
      left: 10%;
      right: 10%;
      top: -1px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(114,217,255,.8), rgba(255,255,255,.6), rgba(239,43,53,.75), transparent);
      filter: drop-shadow(0 0 7px rgba(98,199,255,.55));
      pointer-events: none;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"]::after {
      content: "";
      position: absolute;
      z-index: -1;
      width: 42%;
      height: 42%;
      left: 29%;
      bottom: -.55rem;
      border-radius: 50%;
      background: rgba(54,150,255,.20);
      filter: blur(22px);
      pointer-events: none;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] > div {
      position: relative;
      z-index: 1;
      gap: .28rem !important;
      overflow: visible !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] :is(a,button) {
      position: relative;
      min-width: 0 !important;
      min-height: 3.72rem !important;
      padding: .48rem .28rem !important;
      border: 1px solid transparent;
      border-radius: 1.2rem !important;
      color: #91a4bd !important;
      transform: translateZ(0);
      transition:
        transform .28s cubic-bezier(.2,.85,.2,1),
        color .22s ease,
        background .28s ease,
        box-shadow .28s ease !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] [aria-current="page"],
    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] button[aria-expanded="true"] {
      color: #fff !important;
      border-color: rgba(255,255,255,.09) !important;
      background:
        radial-gradient(circle at 28% 8%, rgba(255,255,255,.28), transparent 30%),
        linear-gradient(145deg, rgba(243,32,42,.98), rgba(173,13,22,.96)) !important;
      box-shadow:
        0 15px 32px -16px rgba(226,26,37,.92),
        0 0 22px -12px rgba(255,61,70,.90),
        inset 0 1px 0 rgba(255,255,255,.28),
        inset 0 -2px 0 rgba(75,0,6,.35) !important;
      transform: translateY(-.16rem) scale(1.015);
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] [aria-current="page"]::after,
    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] button[aria-expanded="true"]::after {
      content: "";
      position: absolute;
      left: 32%;
      right: 32%;
      bottom: .18rem;
      height: 2px;
      border-radius: 999px;
      background: #fff;
      box-shadow: 0 0 10px rgba(255,255,255,.75), 0 0 18px rgba(239,40,51,.9);
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] svg {
      width: 1.35rem !important;
      height: 1.35rem !important;
      filter: drop-shadow(0 2px 7px rgba(0,0,0,.25));
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] span {
      font-size: .61rem !important;
      letter-spacing: .045em !important;
      text-transform: none !important;
      line-height: 1.05 !important;
    }

    body:has(.client-dashboard-mobile-theme) main > div {
      padding-top: 1rem !important;
      padding-left: .85rem !important;
      padding-right: .85rem !important;
      padding-bottom: calc(env(safe-area-inset-bottom) + 7.35rem) !important;
    }

    .client-dashboard-mobile-theme {
      width: 100%;
      overflow-x: clip;
    }

    .client-dashboard-mobile-theme > * {
      max-width: 100%;
    }

    .client-dashboard-mobile-theme [class*="rounded-[2rem]"] {
      border-radius: 1.6rem !important;
    }

    .client-dashboard-mobile-theme [class*="rounded-[2.5rem]"],
    .client-dashboard-mobile-theme [class*="rounded-[3rem]"] {
      border-radius: 1.68rem !important;
    }

    .client-dashboard-mobile-theme [class*="p-8"] { padding: 1.15rem !important; }
    .client-dashboard-mobile-theme [class*="p-6"] { padding: 1.05rem !important; }
    .client-dashboard-mobile-theme [class*="p-5"] { padding: 1rem !important; }
    .client-dashboard-mobile-theme [class*="gap-6"] { gap: 1.05rem !important; }

    .client-dashboard-mobile-theme [class*="space-y-8"] > :not([hidden]) ~ :not([hidden]) {
      margin-top: 1.35rem !important;
    }

    .client-dashboard-mobile-theme h1 {
      font-size: clamp(2rem, 10vw, 2.78rem) !important;
      line-height: .98 !important;
      letter-spacing: -.04em !important;
    }

    .client-dashboard-mobile-theme h2 { line-height: 1.04; }

    .client-dashboard-mobile-theme :is(input,select,textarea) {
      min-height: 3rem;
      font-size: 16px !important;
      border-radius: 1rem !important;
    }

    .client-dashboard-mobile-theme textarea { min-height: 7rem; }

    .client-dashboard-mobile-theme button {
      min-height: 44px;
      touch-action: manipulation;
    }

    .client-dashboard-mobile-theme a {
      touch-action: manipulation;
    }

    .client-dashboard-mobile-theme table { font-size: .82rem; }

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

    /* Give the dashboard cards a genuine layered physical feel on phones */
    .client-dashboard-mobile-theme > div > section:nth-of-type(2) {
      gap: .9rem !important;
    }

    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div {
      border-radius: 1.62rem !important;
      min-height: 13.2rem;
      transform-origin: 50% 100%;
    }

    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(1),
    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(2) {
      padding-right: 5.4rem !important;
    }

    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(3) {
      min-height: 11.4rem;
    }

    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(1)::after {
      right: .35rem;
      bottom: .6rem;
      width: 4.7rem;
      opacity: .56;
    }

    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(2)::after {
      right: .42rem;
      bottom: .78rem;
      width: 4.5rem;
      opacity: .58;
    }

    body:has(.client-dashboard-mobile-theme) div[class*="max-h-[75vh]"][class*="bottom-0"] {
      left: .5rem !important;
      right: .5rem !important;
      bottom: calc(env(safe-area-inset-bottom) + .6rem) !important;
      max-height: min(78vh, 42rem) !important;
      border: 1px solid transparent !important;
      border-radius: 1.7rem !important;
      background:
        linear-gradient(160deg, rgba(9,19,32,.98), rgba(5,11,19,.98)) padding-box,
        linear-gradient(110deg, rgba(87,194,255,.45), rgba(255,255,255,.06), rgba(230,35,46,.36)) border-box !important;
      color: white !important;
      box-shadow:
        0 32px 90px -32px rgba(2,6,23,.86),
        inset 0 1px 0 rgba(255,255,255,.08) !important;
      padding: 1rem !important;
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
    }

    body:has(.client-dashboard-mobile-theme) div[class*="max-h-[75vh]"][class*="bottom-0"] a {
      min-height: 3.3rem;
      border-color: rgba(255,255,255,.075) !important;
      background: linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.025)) !important;
      color: #eef6ff !important;
      border-radius: 1.08rem !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.07);
    }

    body:has(.client-dashboard-mobile-theme) div[class*="max-h-[75vh]"][class*="bottom-0"] a:active {
      background: rgba(218,26,33,.16) !important;
      transform: scale(.985);
    }
  }

  /* Progressive scroll-linked depth: supported browsers get it, others remain static */
  @supports (animation-timeline: view()) {
    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div {
      animation-name: client-card-rise;
      animation-duration: 1ms;
      animation-fill-mode: both;
      animation-timing-function: linear;
      animation-timeline: view();
      animation-range: entry 4% cover 28%;
    }
  }

  @keyframes client-card-rise {
    from {
      opacity: .38;
      transform: translateY(26px) scale(.972) rotateX(2.4deg);
      filter: saturate(.78);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1) rotateX(0deg);
      filter: saturate(1);
    }
  }

  @media (max-width: 390px) {
    body:has(.client-dashboard-mobile-theme) main > div {
      padding-left: .68rem !important;
      padding-right: .68rem !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] {
      width: calc(100% - .68rem) !important;
      bottom: calc(env(safe-area-inset-bottom) + .38rem) !important;
      border-radius: 1.58rem !important;
    }

    body:has(.client-dashboard-mobile-theme) nav[class*="fixed"][class*="bottom-0"][class*="z-[60]"] span {
      font-size: .56rem !important;
    }

    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(1),
    .client-dashboard-mobile-theme > div > section:nth-of-type(2) > div:nth-child(2) {
      padding-right: 4.9rem !important;
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
