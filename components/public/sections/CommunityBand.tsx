"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Accessibility,
  ArrowRight,
  HeartPulse,
  PawPrint,
  PersonStanding,
  ShieldCheck,
  Users,
} from "lucide-react";

const crowd = [
  { icon: PersonStanding, label: "Adultos" },
  { icon: Accessibility, label: "Apoyo" },
  { icon: PersonStanding, label: "Familias" },
  { icon: PawPrint, label: "Mascotas" },
  { icon: PersonStanding, label: "Viajes" },
  { icon: Users, label: "Hogar" },
  { icon: PersonStanding, label: "Trabajo" },
  { icon: HeartPulse, label: "Emergencias" },
] as const;

export default function CommunityBand() {
  const reducedMotion = useReducedMotion();
  const repeated = [...crowd, ...crowd];

  return (
    <section className="relative overflow-hidden bg-[#fffdfd] px-4 py-16 text-slate-950 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div aria-hidden="true" className="absolute left-[-10%] top-[-22%] h-[34rem] w-[34rem] rounded-full bg-rose-100 blur-[110px]" />
      <div aria-hidden="true" className="absolute right-[-8%] bottom-[-30%] h-[36rem] w-[36rem] rounded-full bg-blue-100 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/85 shadow-[0_34px_100px_-62px_rgba(15,23,42,.38)] backdrop-blur-xl sm:rounded-[2.6rem]">
        <div className="grid items-center gap-8 px-5 pb-6 pt-8 sm:px-8 sm:pt-10 lg:grid-cols-[.95fr_1.05fr] lg:px-12 lg:pt-12">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[#b3131a]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Personas, familias y mascotas
            </div>
            <h2 className="max-w-[12ch] text-[clamp(2.5rem,8vw,4.7rem)] font-black leading-[0.91] tracking-[-0.05em]">
              Una red de protección
              <span className="block text-[#1c65b5]">que se mueve contigo.</span>
            </h2>
          </div>
          <div className="lg:pl-8">
            <p className="max-w-xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg">
              PreRescue ID no intenta reemplazar a los servicios de emergencia. Su
              función es hacer más fácil encontrar información y contactos útiles
              cuando alguien necesita ayudar, identificar o devolver.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/comprar"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white shadow-[0_18px_44px_-20px_rgba(218,26,33,.65)] transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]"
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

        <div className="relative mt-3 overflow-hidden border-t border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_48%,#fff1f2_100%)] py-8 sm:py-10">
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/95 to-transparent" />
          <div aria-hidden="true" className="absolute bottom-[32px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

          <motion.div
            className="flex w-max items-end gap-3 px-3 sm:gap-5"
            animate={reducedMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {repeated.map((item, index) => {
              const Icon = item.icon;
              const isPerson = item.icon === PersonStanding || item.icon === Accessibility;
              return (
                <motion.div
                  key={`${item.label}-${index}`}
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          y: [0, index % 2 === 0 ? -5 : -3, 0],
                        }
                  }
                  transition={{
                    duration: 1.8 + (index % 3) * 0.25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (index % 5) * 0.12,
                  }}
                  className="group flex h-36 w-28 shrink-0 flex-col items-center justify-end sm:h-44 sm:w-36"
                >
                  <div
                    className={`flex items-center justify-center rounded-full border shadow-[0_18px_45px_-28px_rgba(15,23,42,.45)] ${
                      isPerson
                        ? "h-20 w-20 border-slate-200 bg-white text-slate-900 sm:h-24 sm:w-24"
                        : "h-16 w-16 border-rose-100 bg-white text-[#DA1A21] sm:h-20 sm:w-20"
                    }`}
                  >
                    <Icon className={isPerson ? "h-10 w-10 sm:h-12 sm:w-12" : "h-8 w-8 sm:h-9 sm:w-9"} strokeWidth={1.6} />
                  </div>
                  <span className="mt-3 rounded-full bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-500 shadow-sm">
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
