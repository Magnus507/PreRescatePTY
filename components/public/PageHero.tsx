"use client";

import { motion } from "framer-motion";
import Link from "next/link";

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
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 bg-[#05070D] text-[#EFF4FF] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(218,26,33,0.08),_transparent_60%)]" />
      <div className="absolute inset-0 noise-bg opacity-20" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#A0AEC0] mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DA1A21] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DA1A21]" />
          </span>
          {eyebrow}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tighter leading-[0.95] mb-6"
        >
          {title}
          {titleAccent && <span className="text-[#DA1A21]"> {titleAccent}</span>}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-[#A0AEC0] font-medium leading-relaxed max-w-2xl mx-auto mb-8"
        >
          {description}
        </motion.p>

        {(primaryCTA || secondaryCTA) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4"
          >
            {primaryCTA && (
              <Link
                href={primaryCTA.href}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#DA1A21] text-white font-bold hover:bg-[#B9141B] transition-all"
              >
                {primaryCTA.label}
              </Link>
            )}
            {secondaryCTA && (
              <Link
                href={secondaryCTA.href}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl border border-white/10 bg-white/5 text-[#EFF4FF] font-bold hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                {secondaryCTA.label}
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}