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

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1.85fr] lg:gap-16">
          <div>
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="PreRescue ID — Inicio">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-[0_16px_45px_-26px_rgba(56,189,248,.8)] transition-all group-hover:border-sky-300/20 group-hover:bg-white/[0.065]">
                <Image src="/logo.png" alt="" aria-hidden="true" width={34} height={34} className="h-8 w-8 object-contain" />
              </span>
              <span className="text-xl font-black tracking-[-0.03em] text-white">
                PreRescue <span className="text-[#ff4d55]">ID</span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm font-medium leading-6 text-slate-400">
              Identificación médica de emergencia con QR + NFC, conectada a un perfil público configurable y accesible desde el navegador.
            </p>

            <div className="mt-7 grid max-w-md gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.065] bg-white/[0.025] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <QrCode className="h-4 w-4 text-sky-300" />
                QR + NFC
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.065] bg-white/[0.025] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Privacidad configurable
              </div>
            </div>

            <Link
              href="/demo"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-sky-200 transition-colors hover:text-white"
            >
              Ver perfil de demostración
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-7 gap-y-10 sm:grid-cols-4">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {col.title}
                </h3>
                <ul className="space-y-3.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
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

        <div className="mt-14 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.022] p-4 sm:p-5">
          <p className="text-center text-[11px] font-medium leading-5 text-slate-500">
            PreRescue ID es un sistema de identificación médica de emergencia. No reemplaza al 911 ni a los servicios médicos profesionales. En una emergencia, contacte a los servicios correspondientes.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/[0.055] pt-7 text-[11px] font-medium text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} PreRescue ID · Panamá</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              onClick={() => {
                const event = new CustomEvent("prerescue:open-cookie-preferences");
                window.dispatchEvent(event);
              }}
              className="inline-flex items-center gap-2 transition-colors hover:text-slate-300"
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
