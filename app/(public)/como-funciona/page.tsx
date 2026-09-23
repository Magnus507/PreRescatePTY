import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: { absolute: "Cómo Funciona PreRescue ID — QR, NFC y Perfil de Emergencia" },
  description:
    "Conoce cómo comprar, activar, configurar y utilizar una identificación de emergencia con QR y NFC.",
};

const steps = [
  ["01", "Obtén tu PreRescue ID", "Elige el formato físico publicado que se adapte a tu uso."],
  ["02", "Activa el identificador", "Usa el código de activación y vincúlalo con tu cuenta."],
  ["03", "Configura el perfil", "Completa la información y decide qué datos estarán disponibles públicamente."],
  ["04", "Escanea y consulta", "Un teléfono compatible abre el perfil mediante QR o NFC desde el navegador."],
] as const;

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-[#fbfcff] text-slate-950">
      <PublicNavbar />
      <main id="main-content">
        <section className="border-b border-slate-200 bg-[#fffdfb]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:grid-cols-[1fr_.85fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-32">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#1d66b0]">Cómo funciona</p>
              <h1 className="mt-3 max-w-[13ch] text-5xl font-black leading-[0.92] tracking-[-0.05em] sm:text-6xl">
                Del identificador físico al perfil digital.
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-lg">
                Configuras la información que deseas mostrar y una persona puede consultarla desde un navegador compatible al escanear el QR o acercar un teléfono con NFC.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/comprar" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#da1a21] px-5 text-sm font-black text-white">
                  Ver productos
                </Link>
                <Link href="/faq" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-800">
                  Preguntas frecuentes
                </Link>
              </div>
            </div>
            <Image
              src="/media/purchase-kit.avif"
              alt="Kit PreRescue ID"
              width={1200}
              height={900}
              sizes="(max-width: 1024px) 92vw, 520px"
              className="h-auto w-full rounded-[1.75rem] border border-slate-200 object-cover"
              priority
            />
          </div>
        </section>

        <section className="bg-white py-14 sm:py-18 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">Cuatro pasos.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([n, title, text]) => (
                <article key={n} className="rounded-[1.4rem] border border-slate-200 bg-[#f8fafc] p-5">
                  <p className="text-xs font-black text-[#da1a21]">{n}</p>
                  <h3 className="mt-4 text-xl font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f7faff] py-14 sm:py-18">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#b3131a]">Qué puede mostrar el perfil</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Información útil, bajo tu control.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Según el tipo de perfil y las opciones disponibles, puedes configurar datos de identificación, información médica relevante, contactos de emergencia e instrucciones útiles.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["Nombre visible","Tipo de sangre","Alergias","Condiciones médicas","Medicamentos","Contactos de emergencia","Instrucciones de comunicación","Retorno seguro"].map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-18">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-[#fffaf8] p-6 sm:p-8">
              <h2 className="text-2xl font-black">Importante</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                El teléfono que consulta el perfil necesita internet. El identificador NFC pasivo no necesita batería ni conexión propia. PreRescue ID es una herramienta de identificación y no reemplaza la atención médica profesional ni a los servicios oficiales de emergencia.
              </p>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
