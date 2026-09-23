import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import { getLitePublicCatalog } from "@/lib/public/catalog";
import { resolveImageSrc } from "@/lib/resolve-image-src";

export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    absolute: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
  },
  description:
    "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro. Consulta información autorizada y contactos sin instalar aplicaciones.",
  openGraph: {
    title: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
    description:
      "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro. Consulta información autorizada y contactos sin instalar aplicaciones.",
    url: "https://www.prerescatepty.com",
    type: "website",
    locale: "es_PA",
    images: [
      {
        url: "/og/pre-rescue-social-card.png",
        width: 1200,
        height: 630,
        alt: "PreRescue ID — Identificación de emergencia y retorno seguro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PreRescue ID — Identificación de Emergencia y Retorno Seguro",
    description:
      "Identificadores con QR y NFC para perfiles de emergencia, mascotas y retorno seguro.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

const steps = [
  ["01", "Compra", "Elige el identificador que mejor se adapte a ti, tu familia o tu mascota."],
  ["02", "Activa", "Vincula el identificador con tu cuenta y el perfil correspondiente."],
  ["03", "Configura", "Decide qué información autorizada estará disponible para consulta."],
  ["04", "Escanea", "QR o NFC abren el perfil desde un navegador compatible."],
] as const;

const benefits = [
  ["QR + NFC", "Dos formas simples de acceder al perfil."],
  ["Sin batería", "El identificador NFC pasivo no necesita carga."],
  ["Sin app", "La consulta se realiza desde el navegador."],
  ["Pago único", "Sin mensualidad ni vencimiento por tiempo."],
] as const;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default async function Home() {
  const products = await getLitePublicCatalog().catch(() => []);

  return (
    <div className="min-h-screen bg-[#fbfcff] text-slate-950">
      <PublicNavbar />

      <main id="main-content">
        <section className="border-b border-slate-200 bg-[#fffdfb]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:grid-cols-[1fr_.95fr] lg:items-center lg:gap-14 lg:px-8 lg:pb-20 lg:pt-32">
            <div>
              <p className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#b3131a]">
                Información lista cuando importa
              </p>

              <h1 className="mt-5 max-w-[12ch] text-[clamp(3rem,12vw,6.4rem)] font-black leading-[0.9] tracking-[-0.055em] text-[#09111f]">
                Cuando cada segundo cuenta,
                <span className="block text-[#d91f2a]">tu información debe estar cerca.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
                PreRescue ID conecta una identificación física con QR + NFC a un perfil
                público configurable. Tú decides qué información mostrar para facilitar
                una consulta rápida cuando alguien necesita ayudar.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/comprar"
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#da1a21] px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_28px_-18px_rgba(218,26,33,.7)]"
                >
                  Ver productos
                </Link>
                <Link
                  href="/como-funciona"
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-black text-slate-800"
                >
                  Cómo funciona
                </Link>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["QR + NFC", "Sin batería", "Sin instalar app", "Sin mensualidad"].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-[11px] font-bold text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#eef6ff] shadow-[0_24px_60px_-40px_rgba(15,23,42,.38)] sm:rounded-[2rem]">
              <Image
                src="/media/medical-tags.avif"
                alt="Identificadores PreRescue ID"
                width={1280}
                height={960}
                sizes="(max-width: 1024px) 92vw, 560px"
                className="h-auto w-full object-cover"
                priority
              />
              <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
                <p className="text-xs font-black uppercase tracking-[0.13em] text-[#1d66b0]">
                  Identificación de emergencia y retorno seguro
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Personas, familias y mascotas en una misma plataforma.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Beneficios" className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
            {benefits.map(([title, text]) => (
              <article key={title} className="bg-white px-4 py-5 sm:px-6 sm:py-6">
                <h2 className="text-sm font-black text-slate-950">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#f7faff] py-14 sm:py-18 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#1d66b0]">
                Cómo funciona
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
                Cuatro pasos. Sin complicaciones.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                El flujo es simple y no requiere instalar aplicaciones en el teléfono que consulta el perfil.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([number, title, text]) => (
                <article key={number} className="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                  <span className="text-xs font-black text-[#da1a21]">{number}</span>
                  <h3 className="mt-4 text-xl font-black tracking-[-0.025em]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-14 sm:py-18 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#b3131a]">
                  Productos publicados
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                  Elige tu PreRescue ID.
                </h2>
              </div>
              <Link href="/comprar" className="text-sm font-black text-[#1d66b0]">
                Ver catálogo completo →
              </Link>
            </div>

            {products.length > 0 ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {products.slice(0, 4).map((product) => {
                  const src = resolveImageSrc(product.imageUrl, "general") || "/sticker-official.png";
                  return (
                    <article key={product.id} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
                      <div className="relative aspect-square bg-[#f7faff]">
                        <Image
                          src={src}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 260px"
                          className="object-contain p-5"
                        />
                      </div>
                      <div className="border-t border-slate-200 p-4">
                        <h3 className="min-h-10 text-sm font-black leading-5 text-slate-950">
                          {product.name}
                        </h3>
                        <p className="mt-3 text-3xl font-black tracking-[-0.04em]">
                          {money.format(Number(product.price) || 0)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Pago único
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm text-slate-600">
                  El catálogo está temporalmente indisponible. Puedes consultarlo desde la página de productos.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#fffaf8] py-14 sm:py-18 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white sm:rounded-[2rem]">
              <div className="grid gap-6 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#b3131a]">
                    Personas, familias y mascotas
                  </p>
                  <h2 className="mt-3 max-w-[12ch] text-4xl font-black leading-[0.95] tracking-[-0.045em] sm:text-5xl">
                    La protección también se mueve contigo.
                  </h2>
                </div>
                <div>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">
                    PreRescue ID acerca información y contactos útiles sin intentar reemplazar a los servicios de emergencia.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link href="/para-quien-es" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-800">
                      Para quién es
                    </Link>
                    <Link href="/comprar" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#da1a21] px-5 text-sm font-black text-white">
                      Ver productos
                    </Link>
                  </div>
                </div>
              </div>

              <Image
                src="/media/community-official-8k.png"
                alt="Personas, familias y mascota representadas en la comunidad PreRescue ID"
                width={7680}
                height={2560}
                sizes="(max-width: 768px) 100vw, 1280px"
                quality={72}
                className="h-auto w-full border-t border-slate-200"
              />
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
