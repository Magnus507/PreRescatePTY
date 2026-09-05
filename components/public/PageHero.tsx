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
    <section className="relative isolate overflow-hidden bg-[#02050a] pb-20 pt-32 text-white md:pb-28 md:pt-40">
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
        className="absolute inset-0 -z-20 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage: "linear-gradient(to bottom, black, transparent 84%)",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-44 bg-gradient-to-b from-[#02050a] to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-[#02050a] to-transparent" />

      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { x: [0, 24, 0], y: [0, -18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[12%] top-24 -z-10 h-36 w-36 rounded-full border border-sky-300/10 bg-sky-300/[0.025] blur-[1px]"
      />
      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { x: [0, -20, 0], y: [0, 16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute bottom-12 left-[10%] -z-10 h-24 w-24 rounded-[2rem] border border-white/[0.06] bg-white/[0.018]"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100 shadow-[0_0_30px_-15px_rgba(56,189,248,.9)] backdrop-blur-xl"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-300" />
          </span>
          {eyebrow}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[14ch] text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.88] tracking-[-0.055em] text-slate-50"
        >
          {title}
          {titleAccent && (
            <span className="mt-2 block bg-gradient-to-r from-[#8ce9ff] via-[#4f9cff] to-[#c5d4ff] bg-clip-text text-transparent">
              {titleAccent}
            </span>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, delay: 0.15 }}
          className="mx-auto mt-7 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8"
        >
          {description}
        </motion.p>

        {(primaryCTA || secondaryCTA) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: 0.25 }}
            className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          >
            {primaryCTA && (
              <Link
                href={primaryCTA.href}
                className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-7 py-3.5 text-sm font-extrabold text-white shadow-[0_18px_50px_-20px_rgba(218,26,33,.82)] transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]"
              >
                {primaryCTA.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
            {secondaryCTA && (
              <Link
                href={secondaryCTA.href}
                className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.045] px-7 py-3.5 text-sm font-bold text-slate-100 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-sky-300/25 hover:bg-white/[0.08]"
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
          transition={{ delay: 0.5 }}
          className="mx-auto mt-12 flex max-w-2xl items-center gap-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600"
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
          PreRescue ID / Emergency Tech
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
        </motion.div>
      </div>
    </section>
  );
}
