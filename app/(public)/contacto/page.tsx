import type { Metadata } from "next";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import ContactFormLite from "@/components/public/ContactFormLite";

export const metadata: Metadata = {
  title: { absolute: "Contacto — PreRescue ID Panamá" },
  description:
    "Contáctanos para consultas sobre productos, pedidos, soporte y privacidad de PreRescue ID.",
};

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-[#fbfcff] text-slate-950">
      <PublicNavbar />
      <main id="main-content">
        <section className="border-b border-slate-200 bg-[#fffdfb]">
          <div className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:pb-20 lg:pt-32">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#1d66b0]">Contacto</p>
            <h1 className="mt-3 text-5xl font-black leading-[0.92] tracking-[-0.05em] sm:text-6xl">
              Cuéntanos qué necesitas.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-lg">
              Utiliza el formulario para consultas sobre productos, pedidos, soporte,
              seguridad o privacidad. Este canal no sustituye al 911 ni a los servicios oficiales de emergencia.
            </p>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.035em]">Antes de escribir</h2>
              <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
                <p><strong className="text-slate-900">Productos:</strong> dudas sobre formatos, activación y uso.</p>
                <p><strong className="text-slate-900">Pedidos:</strong> compra, entrega, devolución o garantía.</p>
                <p><strong className="text-slate-900">Seguridad y privacidad:</strong> pérdida de identificador, acceso no autorizado o solicitudes sobre tus datos.</p>
              </div>
            </div>
            <ContactFormLite />
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
