import type { Metadata } from "next";
import Link from "next/link";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: { absolute: "¿Para Quién es PreRescue ID? — Personas, Familias y Mascotas" },
  description:
    "Identificación para personas, familias y mascotas, con perfiles de emergencia y opciones de retorno seguro según el uso configurado.",
};

const audiences = [
  ["Familias", "Administra perfiles individuales y contactos desde una misma cuenta cuando la configuración lo permita."],
  ["Niños", "Una identificación puede facilitar el acceso a información autorizada y a los contactos de los responsables."],
  ["Adultos mayores", "Permite mostrar información relevante, medicamentos, contactos e instrucciones útiles."],
  ["Desorientación", "El perfil puede incluir instrucciones de contacto y retorno seguro configuradas por la familia."],
  ["Comunicación asistida", "Las instrucciones de comunicación pueden ayudar a quien brinda apoyo."],
  ["Alergias y condiciones", "Puede mostrar alergias, condiciones relevantes, medicamentos y otra información autorizada."],
  ["Actividad diaria", "Un formato físico puede acompañar a la persona en actividades fuera de casa."],
  ["Mascotas", "El perfil para mascotas se orienta a identificación, contacto y devolución segura si se pierde."],
] as const;

export default function ParaQuienEsPage() {
  return (
    <div className="min-h-screen bg-[#fbfcff] text-slate-950">
      <PublicNavbar />
      <main id="main-content">
        <section className="border-b border-slate-200 bg-[#fffdfb]">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:pb-20 lg:pt-32">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#1d66b0]">Para quién es</p>
            <h1 className="mt-3 max-w-[14ch] text-5xl font-black leading-[0.92] tracking-[-0.05em] sm:text-6xl">
              Personas, familias y mascotas.
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-7 text-slate-600 sm:text-lg">
              PreRescue ID puede adaptarse a distintos contextos. La información que se muestra depende del perfil y de lo que el titular o responsable decida configurar.
            </p>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-18 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map(([title, text]) => (
                <article key={title} className="rounded-[1.4rem] border border-slate-200 bg-[#f8fafc] p-5">
                  <h2 className="text-xl font-black tracking-[-0.025em]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f7faff] py-14 sm:py-18">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#b3131a]">Privacidad configurable</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">La información pública no tiene que ser toda tu información.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                El objetivo es mostrar únicamente datos útiles para el contexto configurado. El titular o responsable administra el perfil y sus opciones disponibles.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-black">Mascotas</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cuando un perfil se configura para mascota, la vista pública se orienta a información de identificación, contacto y devolución. No se presenta como una ficha médica humana.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-18">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
            <h2 className="text-3xl font-black tracking-[-0.04em]">Elige el formato que encaje contigo.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Consulta los productos publicados y sus precios vigentes.
            </p>
            <Link href="/comprar" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#da1a21] px-6 text-sm font-black text-white">
              Ver productos
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
