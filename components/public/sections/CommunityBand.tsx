import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function CommunityBand() {
  return (
    <section className="relative overflow-hidden bg-[#fffaf8] px-4 py-14 text-slate-950 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
      <div
        aria-hidden="true"
        className="absolute left-[-12%] top-[-25%] h-[34rem] w-[34rem] rounded-full bg-rose-100 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-8%] bottom-[-30%] h-[38rem] w-[38rem] rounded-full bg-blue-100 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white/88 shadow-[0_34px_100px_-62px_rgba(15,23,42,.34)] backdrop-blur-xl sm:rounded-[2.8rem]">
        <div className="grid items-center gap-8 px-5 pb-5 pt-8 sm:px-8 sm:pt-10 lg:grid-cols-[.92fr_1.08fr] lg:px-12 lg:pt-12">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[#b3131a]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Personas, familias y mascotas
            </div>

            <h2 className="max-w-[11ch] text-[clamp(2.5rem,8vw,4.8rem)] font-black leading-[0.9] tracking-[-0.05em]">
              La protección también
              <span className="block text-[#1c65b5]">se mueve contigo.</span>
            </h2>
          </div>

          <div className="lg:pl-8">
            <p className="max-w-xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg">
              Una identificación que acompaña a personas, familias y mascotas sin
              intentar reemplazar a los servicios de emergencia. El objetivo es
              acercar información y contactos útiles cuando alguien necesita ayudar.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/comprar"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white shadow-[0_18px_44px_-20px_rgba(218,26,33,.62)] transition-all hover:-translate-y-0.5 hover:bg-[#ef2d35]"
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

        <div className="relative mt-2 overflow-hidden border-t border-slate-100 bg-[#eef6fd]">
          <Image
            src="/media/community-official-8k.png"
            alt="Personas, personal de apoyo, familia y mascota caminando entre montañas"
            width={7680}
            height={2560}
            sizes="(max-width: 768px) 100vw, (max-width: 1536px) 92vw, 1280px"\n            quality={92}
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
