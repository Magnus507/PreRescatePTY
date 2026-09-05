"use client";

import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  primaryCTA?: { href: string; label: string };
  secondaryCTA?: { href: string; label: string };
}

export default function PageHero({
  eyebrow,
  title,
  titleAccent,
  description,
  primaryCTA,
  secondaryCTA,
}: PageHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden bg-[#02050a] pb-14 pt-28 text-white sm:pb-20 sm:pt-32 md:pb-28 md:pt-40">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(58% 60% at 50% 4%, rgba(37,99,235,.18), transparent 62%), radial-gradient(34% 52% at 15% 70%, rgba(6,182,212,.08), transparent 67%), radial-gradient(28% 42% at 86% 78%, rgba(218,26,33,.08), transparent 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 opacity-[0.10] sm:opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage: "linear-gradient(to bottom, black, transparent 84%)",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-[#02050a] to-transparent sm:h-44" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#02050a] to-transparent sm:h-44" />

      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { x: [0, 24, 0], y: [0, -18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[12%] top-24 -z-10 hidden h-36 w-36 rounded-full border border-sky-300/10 bg-sky-300/[0.025] blur-[1px] sm:block"
      />
      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { x: [0, -20, 0], y: [0, 16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute bottom-12 left-[10%] -z-10 hidden h-24 w-24 rounded-[2rem] border border-white/[0.06] bg-white/[0.018] sm:block"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 inline-flex max-w-[calc(100vw-2rem)] items-center justify-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100 shadow-[0_0_30px_-15px_rgba(56,189,248,.9)] backdrop-blur-xl sm:mb-7 sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.2em]"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-300" />
          </span>
          <span className="truncate">{eyebrow}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[14ch] text-[clamp(2.65rem,12vw,3.4rem)] font-black leading-[0.9] tracking-[-0.05em] text-slate-50 sm:text-[clamp(3rem,7vw,6.5rem)] sm:leading-[0.88] sm:tracking-[-0.055em]"
        >
          {title}
          {titleAccent && (
            <span className="mt-1.5 block bg-gradient-to-r from-[#8ce9ff] via-[#4f9cff] to-[#c5d4ff] bg-clip-text text-transparent sm:mt-2">
              {titleAccent}
            </span>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-7 sm:text-lg sm:leading-8"
        >
          {description}
        </motion.p>

        {(primaryCTA || secondaryCTA) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:mt-9 sm:flex-row sm:items-center sm:gap-3"
          >
            {primaryCTA && (
              <Link
                href={primaryCTA.href}
                className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-5 py-3 text-sm font-extrabold text-white shadow-[0_18px_50px_-20px_rgba(218,26,33,.82)] transition-all active:scale-[0.985] sm:min-h-14 sm:px-7 sm:py-3.5 sm:hover:-translate-y-0.5 sm:hover:bg-[#ef2d35]"
              >
                {primaryCTA.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
            {secondaryCTA && (
              <Link
                href={secondaryCTA.href}
                className="group inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.045] px-5 py-3 text-sm font-bold text-slate-100 backdrop-blur-xl transition-all active:bg-white/[0.08] sm:min-h-14 sm:px-7 sm:py-3.5 sm:hover:-translate-y-0.5 sm:hover:border-sky-300/25 sm:hover:bg-white/[0.08]"
              >
                <ScanLine className="h-4 w-4 text-sky-300" />
                {secondaryCTA.label}
              </Link>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mx-auto mt-8 flex max-w-2xl items-center gap-2.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-600 sm:mt-12 sm:gap-3 sm:text-[9px] sm:tracking-[0.18em]"
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
          <span className="whitespace-nowrap">PreRescue ID / Emergency Tech</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
        </motion.div>
      </div>
    </section>
  );
}
