import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";

const footerColumns = [
  {
    title: "Producto",
    links: [
      { href: "/como-funciona", label: "Cómo Funciona" },
      { href: "/para-quien-es", label: "Para Quién Es" },
      { href: "/comprar", label: "Comprar" },
      { href: "/empresas", label: "Empresas" },
      { href: "/demo", label: "Demo" },
      { href: "/faq", label: "Preguntas Frecuentes" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/login", label: "Iniciar Sesión" },
      { href: "/registro", label: "Registro" },
      { href: "/activar", label: "Activar Chip" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { href: "/contacto", label: "Contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terminos", label: "Términos y Condiciones" },
      { href: "/legal/privacidad", label: "Política de Privacidad" },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="bg-[#05070D] text-[#EFF4FF] relative overflow-hidden">
      {/* Top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#DA1A21]/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-white/10 p-2">
                <Image
                  src="/logo.png"
                  alt="PreRescue ID Logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                PreRescue <span className="text-[#DA1A21]">ID</span>
              </span>
            </div>
            <p className="text-sm text-[#A0AEC0] leading-relaxed max-w-xs">
              Identificación médica de emergencia con QR y NFC.
            </p>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#A0AEC0] mb-4">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#A0AEC0] hover:text-[#EFF4FF] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#A0AEC0]">
            <p>© {new Date().getFullYear()} PreRescue ID. Panamá.</p>
            <div className="flex items-center gap-1">
              Hecho con <Heart className="h-3 w-3 text-[#DA1A21]" /> para cuidar lo que importa
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-xs text-[#A0AEC0] leading-relaxed">
            PreRescue ID es un sistema de identificación médica de emergencia. No reemplaza al 911 ni a los servicios médicos profesionales. En caso de emergencia, contacte a los servicios correspondientes.
          </p>
        </div>
      </div>
    </footer>
  );
}