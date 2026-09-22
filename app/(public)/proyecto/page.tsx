import type { Metadata } from "next";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: {
    absolute: "Proyecto — Próximamente | PreRescue ID",
  },
  description: "Nuevo proyecto de PreRescue ID. Próximamente.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProyectoPage() {
  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main
        id="main-content"
        className="flex min-h-[78vh] items-center justify-center px-4 pb-16 pt-28 sm:px-6 sm:pt-32"
      >
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300/70">
            Proyecto
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] text-slate-50 sm:text-6xl">
            Próximamente
          </h1>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
