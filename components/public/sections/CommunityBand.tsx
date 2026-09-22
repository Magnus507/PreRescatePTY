"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

type FigureKind = "adult" | "elder" | "child" | "helper" | "pet";

const figures: Array<{ kind: FigureKind; shirt: string; pants: string; skin: string; delay: number }> = [
  { kind: "adult", shirt: "#df2530", pants: "#173a69", skin: "#e7b38e", delay: 0 },
  { kind: "elder", shirt: "#214f82", pants: "#162c49", skin: "#c88f68", delay: 0.2 },
  { kind: "child", shirt: "#62b8e9", pants: "#2b4468", skin: "#efc39e", delay: 0.45 },
  { kind: "helper", shirt: "#f16f67", pants: "#213d63", skin: "#b97b55", delay: 0.1 },
  { kind: "adult", shirt: "#183c69", pants: "#10253f", skin: "#d39a73", delay: 0.35 },
  { kind: "pet", shirt: "#c88752", pants: "#9f683e", skin: "#c88752", delay: 0.55 },
  { kind: "child", shirt: "#ed3d46", pants: "#26446b", skin: "#9c6546", delay: 0.25 },
  { kind: "adult", shirt: "#74b6df", pants: "#1b3558", skin: "#efc39e", delay: 0.65 },
];

function PersonFigure({
  kind,
  shirt,
  pants,
  skin,
}: {
  kind: Exclude<FigureKind, "pet">;
  shirt: string;
  pants: string;
  skin: string;
}) {
  const isChild = kind === "child";
  const isElder = kind === "elder";
  const isHelper = kind === "helper";

  return (
    <svg viewBox="0 0 110 190" className="h-full w-full overflow-visible">
      <ellipse cx="55" cy="178" rx="34" ry="7" fill="#7f93a8" opacity=".18" />
      <circle cx="55" cy={isChild ? 43 : 34} r={isChild ? 18 : 19} fill={skin} />
      <path
        d={isChild ? "M37 39c4-18 31-23 38-2-10-7-25-8-38 2Z" : "M36 29c3-20 34-26 40-3-9-6-26-7-40 3Z"}
        fill={isElder ? "#f2f2f2" : "#182438"}
      />
      {isElder ? (
        <>
          <circle cx="49" cy="33" r="7" fill="none" stroke="#334155" strokeWidth="2" />
          <circle cx="67" cy="33" r="7" fill="none" stroke="#334155" strokeWidth="2" />
          <path d="M56 33h4" stroke="#334155" strokeWidth="2" />
        </>
      ) : null}
      <rect
        x={isChild ? 36 : 32}
        y={isChild ? 63 : 56}
        width={isChild ? 38 : 46}
        height={isChild ? 54 : 70}
        rx={isChild ? 16 : 20}
        fill={shirt}
      />
      {isHelper ? (
        <path d="M44 66h22v8H44zM51 59h8v22h-8z" fill="#fff" opacity=".92" />
      ) : null}
      <path
        d={isChild ? "M39 78c-10 11-12 27-10 41" : "M34 73c-12 14-13 38-8 57"}
        stroke={skin}
        strokeWidth={isChild ? 8 : 10}
        strokeLinecap="round"
      />
      <path
        d={isChild ? "M72 79c9 12 11 27 8 40" : "M77 72c12 15 13 38 9 56"}
        stroke={skin}
        strokeWidth={isChild ? 8 : 10}
        strokeLinecap="round"
      />
      <path
        d={isChild ? "M45 116l-8 47" : "M44 122l-10 50"}
        stroke={pants}
        strokeWidth={isChild ? 13 : 15}
        strokeLinecap="round"
      />
      <path
        d={isChild ? "M64 116l10 47" : "M66 122l11 50"}
        stroke={pants}
        strokeWidth={isChild ? 13 : 15}
        strokeLinecap="round"
      />
      <path d="M25 174h23M63 174h24" stroke="#10253f" strokeWidth="9" strokeLinecap="round" />
      {isElder ? (
        <path d="M89 97v72M85 169h10" stroke="#805c3e" strokeWidth="4" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

function PetFigure() {
  return (
    <svg viewBox="0 0 140 115" className="h-full w-full overflow-visible">
      <ellipse cx="68" cy="105" rx="42" ry="6" fill="#7f93a8" opacity=".18" />
      <ellipse cx="66" cy="65" rx="38" ry="26" fill="#d99b63" />
      <circle cx="105" cy="49" r="21" fill="#c88752" />
      <path d="m91 33-8-19 20 12ZM114 32l17-17-2 24Z" fill="#9f683e" />
      <circle cx="112" cy="48" r="3" fill="#101828" />
      <path d="M119 56q8 4 12-1" fill="none" stroke="#101828" strokeWidth="3" strokeLinecap="round" />
      <path d="M41 82v24M65 84v21M91 81v24" stroke="#9f683e" strokeWidth="9" strokeLinecap="round" />
      <path d="M29 61Q10 49 14 31" fill="none" stroke="#9f683e" strokeWidth="8" strokeLinecap="round" />
      <rect x="91" y="62" width="27" height="7" rx="3.5" fill="#df2530" />
      <circle cx="104" cy="69" r="5" fill="#f6c84d" />
    </svg>
  );
}

function MovingFigure({
  figure,
  index,
  reducedMotion,
}: {
  figure: (typeof figures)[number];
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
              y: [0, index % 2 === 0 ? -5 : -3, 0],
              rotate: [0, index % 2 === 0 ? 0.6 : -0.6, 0],
            }
      }
      transition={{
        duration: 2.6 + (index % 3) * 0.3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: figure.delay,
      }}
      className={
        figure.kind === "pet"
          ? "h-[94px] w-[116px] shrink-0 sm:h-[118px] sm:w-[142px]"
          : "h-[148px] w-[88px] shrink-0 sm:h-[184px] sm:w-[108px]"
      }
    >
      {figure.kind === "pet" ? (
        <PetFigure />
      ) : (
        <PersonFigure
          kind={figure.kind}
          shirt={figure.shirt}
          pants={figure.pants}
          skin={figure.skin}
        />
      )}
    </motion.div>
  );
}

export default function CommunityBand() {
  const reducedMotion = useReducedMotion();
  const repeated = [...figures, ...figures];

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

        <div className="relative mt-2 min-h-[330px] overflow-hidden border-t border-slate-100 bg-[linear-gradient(180deg,#f7fbff_0%,#eaf5ff_35%,#fdf4ee_73%,#fffaf7_100%)] sm:min-h-[390px]">
          <svg
            aria-hidden="true"
            viewBox="0 0 1400 390"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <path d="M0 217 157 113l123 82 157-128 149 145 166-110 176 114 144-90 178 112 150-77v229H0Z" fill="#dceaf4" opacity=".86" />
            <path d="M0 254 144 179l107 67 155-99 139 99 126-74 154 90 116-54 168 76 191-70v176H0Z" fill="#c8dce8" opacity=".88" />
            <path d="M0 306c171-72 328-65 496-5 173 61 343 70 512 6 151-57 263-56 392-10v93H0Z" fill="#f5d8cf" opacity=".88" />
            <path d="M0 333c214-53 397-43 582 3 209 52 432 55 818-16v70H0Z" fill="#ffffff" />
            <g fill="#ffffff" opacity=".86">
              <path d="m116 141 41-28 33 22-19 6-12 14-16-13-13 8Z" />
              <path d="m391 97 46-30 37 35-21-8-17 14-20-16-13 11Z" />
              <path d="m709 133 43-31 38 25-18 3-20 15-20-17-14 10Z" />
              <path d="m1046 151 26-25 32 20-15 1-15 12-13-12-10 8Z" />
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

          <div className="absolute inset-x-0 bottom-[38px] h-px bg-gradient-to-r from-transparent via-slate-400/55 to-transparent" />

          <motion.div
            className="absolute bottom-[31px] left-0 flex w-max items-end gap-5 px-4 sm:gap-8 sm:px-8"
            animate={reducedMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
          >
            {repeated.map((figure, index) => (
              <MovingFigure
                key={`${figure.kind}-${index}`}
                figure={figure}
                index={index}
                reducedMotion={reducedMotion}
              />
            ))}
          </motion.div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-white/75 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm backdrop-blur">
            Pequeños detalles. Gran impacto.
          </div>
        </div>
      </div>
    </section>
  );
}
