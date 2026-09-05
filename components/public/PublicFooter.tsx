"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Cookie, Heart, QrCode, ShieldCheck } from "lucide-react";

const footerColumns = [
  {
    title: "Producto",
    links: [
      { href: "/como-funciona", label: "Cómo funciona" },
      { href: "/para-quien-es", label: "Para quién es" },
      { href: "/comprar", label: "Planes" },
      { href: "/empresas", label: "Empresas" },
      { href: "/demo", label: "Demo" },
      { href: "/faq", label: "Preguntas frecuentes" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/login", label: "Iniciar sesión" },
      { href: "/registro", label: "Registro" },
      { href: "/activar", label: "Activar chip" },
    ],
  },
  {
    title: "Soporte",
    links: [{ href: "/contacto", label: "Contacto" }],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terminos", label: "Términos y condiciones" },
      { href: "/legal/privacidad", label: "Política de privacidad" },
      { href: "/legal/envios", label: "Política de envíos" },
      { href: "/legal/reembolsos", label: "Cancelaciones y reembolsos" },
      { href: "/legal/garantia", label: "Garantía y reemplazos" },
      { href: "/legal/cookies", label: "Política de cookies" },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.055] bg-[#02050a] text-slate-100">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(38% 56% at 8% 20%, rgba(37,99,235,.085), transparent 66%), radial-gradient(34% 46% at 92% 92%, rgba(218,26,33,.055), transparent 68%)",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="grid gap-9 sm:gap-12 lg:grid-cols-[1.15fr_1.85fr] lg:gap-16">
          <div>
            <Link href="/" className="group inline-flex min-h-12 touch-manipulation items-center gap-2.5 sm:gap-3" aria-label="PreRescue ID — Inicio">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] shadow-[0_16px_45px_-26px_rgba(56,189,248,.8)] transition-all sm:h-12 sm:w-12 sm:rounded-2xl sm:group-hover:border-sky-300/20 sm:group-hover:bg-white/[0.065]">
                <Image src="/logo.png" alt="" aria-hidden="true" width={34} height={34} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
              </span>
              <span className="text-lg font-black tracking-[-0.03em] text-white sm:text-xl">
                PreRescue <span className="text-[#ff4d55]">ID</span>
              </span>
            </Link>

            <p className="mt-4 max-w-md text-[13px] font-medium leading-6 text-slate-400 sm:mt-5 sm:text-sm">
              Identificación médica de emergencia con QR + NFC, conectada a un perfil público configurable y accesible desde el navegador.
            </p>

            <div className="mt-5 grid max-w-md grid-cols-2 gap-2 sm:mt-7">
              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.065] bg-white/[0.025] px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-[10px] sm:tracking-[0.14em]">
                <QrCode className="h-4 w-4 shrink-0 text-sky-300" />
                QR + NFC
              </div>
              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.065] bg-white/[0.025] px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-[10px] sm:tracking-[0.14em]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="leading-4">Privacidad configurable</span>
              </div>
            </div>

            <Link
              href="/demo"
              className="group mt-5 inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-sky-200 transition-colors active:text-white sm:mt-7 sm:hover:text-white"
            >
              Ver perfil de demostración
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4 sm:gap-x-7 sm:gap-y-10">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 sm:mb-5 sm:text-[10px] sm:tracking-[0.18em]">
                  {col.title}
                </h3>
                <ul className="space-y-1 sm:space-y-1.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-10 touch-manipulation items-center py-1 text-[13px] font-medium leading-5 text-slate-400 transition-colors active:text-white sm:min-h-0 sm:py-1.5 sm:text-sm sm:hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.022] p-4 sm:mt-14 sm:rounded-[1.5rem] sm:p-5">
          <p className="text-center text-[10px] font-medium leading-5 text-slate-500 sm:text-[11px]">
            PreRescue ID es un sistema de identificación médica de emergencia. No reemplaza al 911 ni a los servicios médicos profesionales. En una emergencia, contacte a los servicios correspondientes.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.055] pt-6 text-[10px] font-medium leading-5 text-slate-600 sm:mt-8 sm:gap-4 sm:pt-7 sm:text-[11px] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} PreRescue ID · Panamá</p>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3">
            <button
              onClick={() => {
                const event = new CustomEvent("prerescue:open-cookie-preferences");
                window.dispatchEvent(event);
              }}
              className="inline-flex min-h-10 touch-manipulation items-center gap-2 transition-colors active:text-slate-300 sm:min-h-0 sm:hover:text-slate-300"
            >
              <Cookie className="h-3.5 w-3.5" />
              Preferencias de cookies
            </button>
            <span className="inline-flex items-center gap-1.5">
              Hecho con <Heart className="h-3.5 w-3.5 text-[#DA1A21]" /> para cuidar lo que importa
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
