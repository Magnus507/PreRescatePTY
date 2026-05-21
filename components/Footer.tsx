import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#050814] text-white relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand/20 to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-3xl bg-white/10 p-3 shadow-glow">
                <Image 
                  src="/logo.png" 
                  alt="PreRescue ID Logo" 
                  width={32} 
                  height={32} 
                  className="h-8 w-8 object-contain" 
                />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                PreRescue <span className="text-brand">ID</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Sistema panameño de identificación de emergencia con NFC y QR. Tu información vital, siempre accesible en un sticker oficial.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-[0.3em] text-slate-400">Producto</h3>
            <ul className="space-y-3">
              <li><Link href="/como-funciona" className="text-sm text-slate-300 hover:text-white transition-colors">Cómo Funciona</Link></li>
              <li><Link href="/comprar" className="text-sm text-slate-300 hover:text-white transition-colors">Comprar</Link></li>
              <li><Link href="/activar" className="text-sm text-slate-300 hover:text-white transition-colors">Activar Mi Chip</Link></li>
              <li><Link href="/faq" className="text-sm text-slate-300 hover:text-white transition-colors">Preguntas Frecuentes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-[0.3em] text-slate-400">Soporte</h3>
            <ul className="space-y-3">
              <li><Link href="/contacto" className="text-sm text-slate-300 hover:text-white transition-colors">Contacto</Link></li>
              <li><Link href="/faq" className="text-sm text-slate-300 hover:text-white transition-colors">Ayuda</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-[0.3em] text-slate-400">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/legal/terminos" className="text-sm text-slate-300 hover:text-white transition-colors">Términos y Condiciones</Link></li>
              <li><Link href="/legal/privacidad" className="text-sm text-slate-300 hover:text-white transition-colors">Política de Privacidad</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-premium backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand font-black mb-3">¿Listo para proteger tu familia?</p>
              <h4 className="text-2xl font-black text-white">Obtén tu sticker oficial y viaja tranquilo.</h4>
            </div>
            <Link href="/comprar" className="btn-premium inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-red-700 px-6 py-4 text-sm font-black text-white shadow-button hover:shadow-button-hover transition-all">
              Comprar Ahora
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} PreRescue ID. Todos los derechos reservados. Panamá.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="https://www.tiktok.com/@pre_rescate_pty" target="_blank" className="uppercase tracking-[0.3em] font-black text-slate-300 hover:text-white transition-colors">TikTok</Link>
            <Link href="https://www.instagram.com/prerescueid" target="_blank" className="uppercase tracking-[0.3em] font-black text-[#E1306C] hover:text-white transition-colors">Instagram</Link>
          </div>
          <p className="flex items-center gap-1 text-slate-400">
            Hecho con <Heart className="h-3 w-3 text-emergency fill-emergency" /> para salvar vidas
          </p>
        </div>

        <div className="mt-4 p-3 rounded-2xl bg-warning/10 border border-warning/20 text-center text-xs text-slate-300">
          ⚠️ PreRescue ID es una herramienta de identificación de emergencia. <strong>No reemplaza al 911 ni a los servicios médicos profesionales.</strong> En caso de emergencia, llame al 911 inmediatamente.
        </div>
      </div>
    </footer>
  );
}
