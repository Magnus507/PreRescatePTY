"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

type WalkerKind = "man" | "woman" | "elder" | "medic" | "child" | "traveler" | "pet";

type Walker = {
  kind: WalkerKind;
  shirt: string;
  pants: string;
  skin: string;
  accent: string;
  delay: number;
};

const walkers: Walker[] = [
  { kind: "man", shirt: "#2f73c8", pants: "#17365f", skin: "#e9b48f", accent: "#d92d37", delay: 0 },
  { kind: "woman", shirt: "#f8fafc", pants: "#244a78", skin: "#d69a72", accent: "#d92d37", delay: 0.18 },
  { kind: "elder", shirt: "#173b68", pants: "#b99b77", skin: "#efc29c", accent: "#5f89b5", delay: 0.34 },
  { kind: "medic", shirt: "#df2e38", pants: "#17345a", skin: "#d9986d", accent: "#ffffff", delay: 0.09 },
  { kind: "child", shirt: "#d92d37", pants: "#2c4e77", skin: "#efbd94", accent: "#2f73c8", delay: 0.48 },
  { kind: "pet", shirt: "#d89b5f", pants: "#9f693f", skin: "#d89b5f", accent: "#d92d37", delay: 0.58 },
  { kind: "traveler", shirt: "#f3f6fa", pants: "#1d3e68", skin: "#b87550", accent: "#153b67", delay: 0.28 },
  { kind: "man", shirt: "#d9333d", pants: "#143256", skin: "#c7845c", accent: "#2f73c8", delay: 0.62 },
];

function Backpack({ accent = "#173b68" }: { accent?: string }) {
  return (
    <g>
      <path d="M21 77c-9 3-13 13-13 28v42c0 10 7 17 16 17h14V83c-5-5-10-7-17-6Z" fill={accent} opacity=".98" />
      <path d="M18 91c8 2 15 8 19 16" fill="none" stroke="#0f2a49" strokeWidth="5" strokeLinecap="round" />
      <path d="M12 120h20" stroke="#cf3340" strokeWidth="4" strokeLinecap="round" opacity=".95" />
    </g>
  );
}

function WalkerFigure({
  kind,
  shirt,
  pants,
  skin,
  accent,
}: Omit<Walker, "delay">) {
  const child = kind === "child";
  const elder = kind === "elder";
  const woman = kind === "woman";
  const medic = kind === "medic";
  const traveler = kind === "traveler";

  if (kind === "pet") return <PetFigure />;

  return (
    <svg viewBox="0 0 130 220" className="h-full w-full overflow-visible">
      <ellipse cx="64" cy="207" rx="42" ry="6" fill="#5a7591" opacity=".16" />

      <Backpack accent={traveler ? "#19385f" : kind === "man" ? "#173b68" : "#21496f"} />

      {woman ? (
        <path d="M48 29c-15 5-22 23-17 42 11 8 25 7 34 0-8-9-9-27 4-35-6-8-13-10-21-7Z" fill="#14263e" />
      ) : (
        <path
          d={elder ? "M43 29c6-15 31-17 39-2-7-3-13-1-19 3-7-3-13-4-20-1Z" : "M42 27c5-16 32-18 42-2-10-5-18-2-25 2-5-2-11-2-17 0Z"}
          fill={elder ? "#eef2f5" : "#14263e"}
        />
      )}

      {woman ? <path d="M79 33c14 7 21 18 18 34-6-8-12-11-20-12Z" fill="#14263e" /> : null}
      {child ? <path d="M38 24h46c0-10-7-18-22-18-14 0-22 7-24 18Z" fill="#2f73c8" /> : null}

      <circle cx="64" cy={child ? 39 : 37} r={child ? 17 : 19} fill={skin} />
      <circle cx="72" cy={child ? 37 : 35} r="1.9" fill="#172233" />
      <path d="M77 44q6 3 11-1" fill="none" stroke="#8d5d42" strokeWidth="2" strokeLinecap="round" />

      {elder ? (
        <>
          <path d="M48 50c8 8 24 9 32 0-4 14-27 16-32 0Z" fill="#eef2f5" />
          <circle cx="56" cy="37" r="7" fill="none" stroke="#38506b" strokeWidth="2" />
          <circle cx="73" cy="37" r="7" fill="none" stroke="#38506b" strokeWidth="2" />
          <path d="M63 37h3" stroke="#38506b" strokeWidth="2" />
        </>
      ) : null}

      {woman ? <path d="M48 50q16 11 31 0" fill="none" stroke="#bb6f52" strokeWidth="1.5" strokeLinecap="round" /> : null}

      <path
        d={
          child
            ? "M43 59c13-8 31-7 42 2 8 17 9 39 3 61H39c-7-21-6-46 4-63Z"
            : "M38 60c17-11 38-10 51 2 10 22 10 49 3 74H34c-8-25-6-54 4-76Z"
        }
        fill={shirt}
      />

      {medic ? (
        <>
          <rect x="58" y="73" width="14" height="31" rx="3" fill="#fff" />
          <rect x="50" y="81" width="30" height="14" rx="3" fill="#fff" />
        </>
      ) : null}

      {woman ? (
        <>
          <path d="M44 63c8 5 15 7 24 7 9 0 16-2 21-7" fill="none" stroke="#d9e4ee" strokeWidth="6" strokeLinecap="round" />
          <path d="M50 57v17M79 57v17" stroke="#d9e4ee" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : null}

      {traveler ? (
        <path d="M43 72h42" stroke="#c9d7e6" strokeWidth="5" strokeLinecap="round" />
      ) : null}

      <path
        d={child ? "M43 76c-12 10-17 30-15 48" : "M39 78c-14 14-18 38-14 58"}
        fill="none"
        stroke={skin}
        strokeWidth={child ? 8 : 10}
        strokeLinecap="round"
      />
      <path
        d={child ? "M84 78c9 12 14 27 14 43" : "M88 79c13 12 19 31 18 48"}
        fill="none"
        stroke={skin}
        strokeWidth={child ? 8 : 10}
        strokeLinecap="round"
      />

      <path
        d={child ? "M47 119 34 177" : "M48 133 31 190"}
        fill="none"
        stroke={pants}
        strokeWidth={child ? 13 : 16}
        strokeLinecap="round"
      />
      <path
        d={child ? "M79 119 96 170" : "M78 133 103 182"}
        fill="none"
        stroke={pants}
        strokeWidth={child ? 13 : 16}
        strokeLinecap="round"
      />

      <path d={child ? "M23 183h29" : "M18 197h35"} stroke="#10253f" strokeWidth="10" strokeLinecap="round" />
      <path d={child ? "M88 177h28" : "M96 188h27"} stroke="#10253f" strokeWidth="10" strokeLinecap="round" />

      {elder ? (
        <>
          <path d="M106 116v83" stroke="#8a684d" strokeWidth="4" strokeLinecap="round" />
          <path d="M101 199h10" stroke="#8a684d" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : null}

      {child ? (
        <path d="M52 12c12 2 23 1 33 7" fill="none" stroke="#2f73c8" strokeWidth="4" strokeLinecap="round" />
      ) : null}

      <path d="M36 84c6 4 12 6 18 7" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

function PetFigure() {
  return (
    <svg viewBox="0 0 170 130" className="h-full w-full overflow-visible">
      <ellipse cx="80" cy="118" rx="51" ry="7" fill="#5a7591" opacity=".16" />
      <ellipse cx="77" cy="73" rx="43" ry="30" fill="#d89b5f" />
      <circle cx="127" cy="58" r="26" fill="#c98952" />
      <path d="m109 39-12-24 27 16ZM137 38l22-19-5 30Z" fill="#9c633c" />
      <circle cx="136" cy="56" r="3.1" fill="#11243a" />
      <path d="M145 67q10 5 15-1" fill="none" stroke="#11243a" strokeWidth="3" strokeLinecap="round" />
      <path d="M54 95v25M81 98v21M111 93v26" stroke="#9c633c" strokeWidth="10" strokeLinecap="round" />
      <path d="M35 73Q10 61 16 39" fill="none" stroke="#9c633c" strokeWidth="9" strokeLinecap="round" />
      <path d="M99 70h43" stroke="#d92d37" strokeWidth="9" strokeLinecap="round" />
      <rect x="113" y="64" width="25" height="22" rx="5" fill="#d92d37" />
      <path d="M125 67v16M117 75h16" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M127 73q12 9 23 3" fill="none" stroke="#d92d37" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function MovingWalker({
  walker,
  index,
  reducedMotion,
}: {
  walker: Walker;
  index: number;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      aria-hidden="true"
      animate={
        reducedMotion
          ? undefined
          : {
              y: [0, index % 2 === 0 ? -4 : -7, 0],
              rotate: [0, index % 2 === 0 ? 0.45 : -0.45, 0],
            }
      }
      transition={{
        duration: 2.8 + (index % 4) * 0.22,
        repeat: Infinity,
        ease: "easeInOut",
        delay: walker.delay,
      }}
      className={
        walker.kind === "pet"
          ? "h-[112px] w-[146px] shrink-0 sm:h-[142px] sm:w-[184px]"
          : "h-[172px] w-[102px] shrink-0 sm:h-[208px] sm:w-[122px]"
      }
    >
      <WalkerFigure
        kind={walker.kind}
        shirt={walker.shirt}
        pants={walker.pants}
        skin={walker.skin}
        accent={walker.accent}
      />
    </motion.div>
  );
}

export default function CommunityBand() {
  const reducedMotion = useReducedMotion();
  const repeated = [...walkers, ...walkers];

  return (
    <section className="relative overflow-hidden bg-[#fffaf8] px-4 py-14 text-slate-950 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
      <div aria-hidden="true" className="absolute left-[-12%] top-[-25%] h-[34rem] w-[34rem] rounded-full bg-rose-100 blur-[110px]" />
      <div aria-hidden="true" className="absolute right-[-8%] bottom-[-30%] h-[38rem] w-[38rem] rounded-full bg-blue-100 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white/88 shadow-[0_34px_100px_-62px_rgba(15,23,42,.34)] backdrop-blur-xl sm:rounded-[2.8rem]">
        <div className="grid items-center gap-8 px-5 pb-5 pt-8 sm:px-8 sm:pt-10 lg:grid-cols-[.92fr_1.08fr] lg:px-12 lg:pt-12">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[#b3131a]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Personas, familias y mascotas
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.5rem,8vw,4.8rem)] font-black leading-[0.9] tracking-[-0.05em]">
              La protección también
              <span className="block text-[#1c65b5]">se mueve contigo.</span>
            </h2>
          </div>

          <div className="lg:pl-8">
            <p className="max-w-xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg">
              Una identificación que acompaña a personas, familias y mascotas sin
              intentar reemplazar a los servicios de emergencia. El objetivo es
              acercar información y contactos útiles cuando alguien necesita ayudar.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/comprar"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white shadow-[0_18px_44px_-20px_rgba(218,26,33,.62)] transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]"
              >
                Ver productos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/faq"
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-800 transition-all hover:-translate-y-0.5 hover:border-blue-200"
              >
                Resolver dudas
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mt-2 min-h-[350px] overflow-hidden border-t border-slate-100 bg-[linear-gradient(180deg,#f8fcff_0%,#eaf5ff_35%,#fef4ee_73%,#fffaf7_100%)] sm:min-h-[410px]">
          <svg
            aria-hidden="true"
            viewBox="0 0 1400 410"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <path d="M0 220 145 126l116 74 175-137 146 150 165-115 175 116 149-95 175 118 150-80v253H0Z" fill="#dceaf4" opacity=".9" />
            <path d="M0 260 138 185l111 68 159-102 139 102 131-78 152 91 121-57 162 81 187-72v192H0Z" fill="#c8dce8" opacity=".92" />
            <path d="M0 316c176-74 337-67 500-5 176 67 343 72 507 7 154-60 263-58 393-12v104H0Z" fill="#f5d8cf" opacity=".9" />
            <path d="M0 347c220-54 398-45 584 3 214 55 436 57 816-17v77H0Z" fill="#ffffff" />
            <g fill="#ffffff" opacity=".9">
              <path d="m113 154 32-25 34 23-16 5-14 13-14-11-12 7Z" />
              <path d="m387 95 49-32 39 37-22-8-18 16-21-17-14 11Z" />
              <path d="m706 134 45-32 39 26-18 3-21 16-20-17-15 10Z" />
              <path d="m1049 152 28-26 33 21-15 2-16 12-13-13-11 8Z" />
            </g>
          </svg>

          <motion.div
            aria-hidden="true"
            animate={reducedMotion ? undefined : { x: ["-4%", "4%", "-4%"] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-[-4%] top-[9%] h-14 w-28 rounded-full bg-white/75 blur-[1px] before:absolute before:-left-6 before:bottom-1 before:h-10 before:w-16 before:rounded-full before:bg-white/75 after:absolute after:right-[-28px] after:bottom-0 after:h-12 after:w-20 after:rounded-full after:bg-white/75"
          />
          <motion.div
            aria-hidden="true"
            animate={reducedMotion ? undefined : { x: ["4%", "-5%", "4%"] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-[8%] top-[13%] h-11 w-24 rounded-full bg-white/70 before:absolute before:-left-5 before:bottom-0 before:h-8 before:w-14 before:rounded-full before:bg-white/70 after:absolute after:right-[-24px] after:bottom-1 after:h-9 after:w-16 after:rounded-full after:bg-white/70"
          />

          <div className="absolute inset-x-0 bottom-[38px] h-px bg-gradient-to-r from-transparent via-slate-400/45 to-transparent" />

          <motion.div
            className="absolute bottom-[28px] left-0 flex w-max items-end gap-6 px-5 sm:gap-9 sm:px-8"
            animate={reducedMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
          >
            {repeated.map((walker, index) => (
              <MovingWalker
                key={`${walker.kind}-${index}`}
                walker={walker}
                index={index}
                reducedMotion={reducedMotion}
              />
            ))}
          </motion.div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-white/78 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm backdrop-blur">
            Pequeños detalles. Gran impacto.
          </div>
        </div>
      </div>
    </section>
  );
}
