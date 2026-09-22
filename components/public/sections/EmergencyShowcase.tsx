"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, PackageCheck, PawPrint, ShieldCheck } from "lucide-react";

const experiences = [
  {
    title: "Emergencia médica",
    description: "Una identificación visible para conectar QR + NFC con la información pública del perfil de emergencia.",
    image: "/media/medical-tags.webp",
    icon: HeartPulse,
    href: "/como-funciona",
    accent: "rose",
  },
  {
    title: "Mascotas y retorno seguro",
    description: "Una identificación pensada para facilitar el contacto y ayudar a reunir a una mascota con su familia.",
    image: "/media/pet-tags.webp",
    icon: PawPrint,
    href: "/para-quien-es#mascotas",
    accent: "sky",
  },
] as const;

export default function EmergencyShowcase() {
  return (
    <section className="relative overflow-hidden bg-[#04060a] py-20 text-white md:py-32">
      <div aria-hidden="true" className="emergency-grid absolute inset-0 opacity-40" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(46%_55%_at_12%_22%,rgba(218,26,33,.12),transparent_68%),radial-gradient(42%_52%_at_88%_72%,rgba(37,99,235,.13),transparent_68%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 grid items-end gap-5 sm:mb-14 lg:grid-cols-[1fr_.7fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-300/15 bg-rose-300/[0.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-rose-200">
              <PackageCheck className="h-3.5 w-3.5" />
              Producto físico + acceso digital
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.4rem,10vw,3.25rem)] font-black leading-[0.93] tracking-[-0.05em] text-slate-50 sm:text-[clamp(2.8rem,5vw,5.2rem)] sm:leading-[0.9]">
              Que se vea preparado desde antes de la emergencia.
            </h2>
          </motion.div>
          <p className="text-[15px] font-medium leading-6 text-slate-400 sm:text-lg sm:leading-7">
            La experiencia empieza en el objeto físico: identificable, fácil de reconocer y diseñado para llevar a la información correcta sin instalar una aplicación.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
          className="emergency-product-frame relative overflow-hidden rounded-[1.6rem] border border-white/[0.1] bg-[#080b11] p-2 sm:rounded-[2.2rem] sm:p-3"
        >
          <div className="relative aspect-[16/9] min-h-[270px] overflow-hidden rounded-[1.2rem] border border-white/[0.06] sm:rounded-[1.8rem]">
            <Image
              src="/media/purchase-kit.webp"
              alt="Contenido de compra PreRescue ID con NFC, sticker, código de activación y empaque"
              fill
              sizes="(max-width: 1280px) 96vw, 1200px"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/22 via-transparent to-black/10" />
          </div>
          <div className="absolute bottom-5 left-5 hidden items-center gap-2 rounded-2xl border border-white/[0.12] bg-black/62 px-4 py-3 text-xs font-extrabold text-white backdrop-blur-xl sm:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Todo listo para activar y vincular
          </div>
        </motion.div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {experiences.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.48, delay: index * 0.06 }}
              className="group relative overflow-hidden rounded-[1.55rem] border border-white/[0.085] bg-[#080b11] p-2 shadow-[0_30px_90px_-48px_rgba(0,0,0,.95)] sm:rounded-[2rem] sm:p-3"
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-[1.15rem] border border-white/[0.06] sm:rounded-[1.55rem]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 1024px) 94vw, 580px"
                  className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.025]"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-transparent to-transparent" />
                <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.11] bg-black/60 backdrop-blur-xl sm:h-14 sm:w-14">
                  <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.accent === "rose" ? "text-rose-300" : "text-sky-300"}`} />
                </div>
              </div>

              <div className="px-3 pb-3 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <item.icon className={`h-3.5 w-3.5 ${item.accent === "rose" ? "text-rose-300" : "text-sky-300"}`} />
                  PreRescue ID
                </div>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{item.title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">{item.description}</p>
                <Link href={item.href} className="group/link mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-slate-100">
                  Conocer más
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
