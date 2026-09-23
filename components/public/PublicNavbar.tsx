import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

const NAV_LINKS = [
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/para-quien-es", label: "Para quién es" },
  { href: "/comprar", label: "Productos" },
  { href: "/faq", label: "FAQ" },
  { href: "/proyecto", label: "Proyecto" },
  { href: "/contacto", label: "Contacto" },
] as const;

export default function PublicNavbar() {
  return (
    <>
      <a href="#main-content" className="skip-to-content">Ir al contenido principal</a>

      <header className="fixed inset-x-0 top-0 z-50 px-2 pt-[max(.5rem,env(safe-area-inset-top))] sm:px-4 sm:pt-3">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-[1.1rem] border border-white/[0.08] bg-[#070b13] px-2.5 shadow-[0_14px_42px_-28px_rgba(0,0,0,.95)] sm:h-16 sm:rounded-[1.25rem] sm:px-4 md:bg-[#050914]/92 md:backdrop-blur-xl lg:px-5"
        >
          <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2" aria-label="PreRescue ID — Inicio">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.045] sm:h-10 sm:w-10">
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                sizes="40px"
                className="h-7 w-7 object-contain sm:h-8 sm:w-8"
                aria-hidden
              />
            </span>
            <span className="truncate text-[13px] font-black tracking-[-0.025em] text-slate-50 sm:text-[15px]">
              PreRescue <span className="text-[#ff4d55]">ID</span>
            </span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-2.5 py-2 text-[12px] font-bold text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100 lg:px-3"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2.5 md:flex">
            <Link href="/login" className="hidden px-2 py-2 text-xs font-bold text-slate-400 transition-colors hover:text-white lg:block">
              Ingresar
            </Link>
            <Link
              href="/comprar"
              className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#DA1A21] px-4 text-xs font-extrabold text-white shadow-[0_12px_30px_-15px_rgba(218,26,33,.85)] transition-colors hover:bg-[#ef2d35]"
            >
              Obtener ID
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <details className="group relative md:hidden">
            <summary
              aria-label="Abrir menú"
              className="flex h-11 w-11 cursor-pointer list-none touch-manipulation items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-100 marker:hidden active:bg-white/[0.09] [&::-webkit-details-marker]:hidden"
            >
              <Menu className="h-5 w-5" />
            </summary>

            <div className="absolute right-0 top-[calc(100%+.65rem)] w-[min(88vw,21rem)] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#060a12] p-2 shadow-[0_24px_70px_-25px_rgba(0,0,0,.95)]">
              <div className="grid gap-0.5">
                <Link href="/" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-slate-200 active:bg-white/[0.07]">Inicio</Link>
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-slate-300 active:bg-white/[0.07]">
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="mt-2 grid gap-2 border-t border-white/[0.07] pt-2">
                <Link href="/login" className="flex min-h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm font-bold text-slate-200">
                  Iniciar sesión
                </Link>
                <Link href="/comprar" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#DA1A21] text-sm font-extrabold text-white">
                  Obtener PreRescue ID <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </details>
        </nav>
      </header>
    </>
  );
}
