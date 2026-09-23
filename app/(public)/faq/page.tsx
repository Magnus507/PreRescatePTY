import type { Metadata } from "next";
import Link from "next/link";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: { absolute: "Preguntas Frecuentes — PreRescue ID" },
  description:
    "Resuelve dudas sobre QR, NFC, privacidad, activación, perfiles, pagos y uso de PreRescue ID.",
};

const faqs = [
  ["¿Qué es PreRescue ID?", "Es un sistema de identificación de emergencia y retorno seguro. Sus identificadores físicos pueden vincularse a un perfil público configurable."],
  ["¿Qué información se muestra al escanear?", "El perfil puede mostrar datos autorizados como nombre, tipo de sangre, alergias, condiciones, medicamentos y contactos de emergencia, según la configuración aplicable."],
  ["¿El identificador NFC necesita batería?", "No. Los identificadores con NFC pasivo no necesitan batería propia. La lectura depende de un dispositivo compatible."],
  ["¿Cómo funciona el código QR?", "Un dispositivo con cámara y navegador compatible puede escanear el QR y abrir el enlace del perfil."],
  ["¿Se necesita internet?", "Sí. El teléfono que consulta necesita conexión a internet. El identificador físico no necesita conexión propia."],
  ["¿Necesito instalar una aplicación?", "No. El perfil se abre desde el navegador."],
  ["¿Funciona fuera de Panamá?", "Sí, siempre que el dispositivo que consulta tenga conexión a internet y pueda abrir el perfil."],
  ["¿Qué información es pública?", "Se muestran los datos configurados para ser visibles según las opciones disponibles del perfil."],
  ["¿Qué pasa cuando alguien escanea mi identificador?", "Se abre el perfil público. La persona que ayuda puede usar los datos y contactos que estén visibles."],
  ["¿Se envían mensajes automáticamente?", "No. Escanear el identificador no envía SMS, correos ni WhatsApp automáticamente."],
  ["¿Se envía mi ubicación automáticamente?", "No. La ubicación no se envía automáticamente a tus contactos al escanear."],
  ["¿Puedo tener más de un perfil?", "Sí, dependiendo de la configuración de tu cuenta puedes gestionar múltiples perfiles."],
  ["¿Hay mensualidades?", "No. El servicio digital se adquiere con pago único y no tiene mensualidad ni vencimiento por tiempo."],
  ["¿Tengo que renovar el servicio?", "No existe renovación periódica por tiempo. Un reemplazo físico puede ser necesario si el identificador se pierde o se daña."],
  ["¿Puedo actualizar mi información?", "Sí. Puedes administrar la información de tu perfil desde tu cuenta mientras esté disponible."],
  ["¿PreRescue ID reemplaza la atención médica?", "No. Es una herramienta de identificación y no reemplaza la atención médica profesional ni los servicios oficiales de emergencia."],
  ["¿Realizan entregas en Panamá?", "Sí, sujetas a la cobertura del transportista. Los costos y condiciones aplicables se informan antes de completar el pedido."],
  ["¿Qué cubre la garantía?", "La cobertura física aplica a defectos de fabricación conforme a la política de garantía vigente."],
] as const;

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#fbfcff] text-slate-950">
      <PublicNavbar />
      <main id="main-content">
        <section className="border-b border-slate-200 bg-[#fffdfb]">
          <div className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:pb-20 lg:pt-32">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#1d66b0]">Preguntas frecuentes</p>
            <h1 className="mt-3 text-5xl font-black leading-[0.92] tracking-[-0.05em] sm:text-6xl">Respuestas claras.</h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-lg">
              Lo esencial sobre QR, NFC, privacidad, perfiles, compra y uso del servicio.
            </p>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-4xl space-y-2 px-4 sm:px-6">
            {faqs.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-slate-200 bg-[#f8fafc]">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {q}
                    <span aria-hidden="true" className="text-lg text-slate-400 group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="border-t border-slate-200 px-5 py-4 text-sm leading-6 text-slate-600">{a}</p>
              </details>
            ))}

            <div className="mt-8 rounded-2xl border border-slate-200 bg-[#fffaf8] p-6">
              <h2 className="text-xl font-black">¿No encuentras tu respuesta?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Puedes escribirnos desde el formulario de contacto.</p>
              <Link href="/contacto" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#0f3159] px-5 text-sm font-black text-white">
                Contactar
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
