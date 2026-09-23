import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import { getLitePublicCatalog } from "@/lib/public/catalog";
import { resolveImageSrc } from "@/lib/resolve-image-src";

export const metadata: Metadata = {
  title: {
    absolute: "Productos y Precios — PreRescue ID",
  },
  description:
    "Consulta los productos publicados de PreRescue ID y sus precios vigentes. Pago único y servicio digital sin vencimiento por tiempo.",
  openGraph: {
    title: "Productos y Precios — PreRescue ID",
    description: "Consulta los productos publicados de PreRescue ID y sus precios vigentes.",
    url: "https://www.prerescatepty.com/comprar",
    type: "website",
    locale: "es_PA",
    images: [
      {
        url: "/og/pre-rescue-social-card.png",
        width: 1200,
        height: 630,
        alt: "PreRescue ID — Identificación de emergencia con QR y NFC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Productos y Precios — PreRescue ID",
    description: "Consulta los productos publicados de PreRescue ID y sus precios vigentes.",
    images: ["/og/pre-rescue-social-card.png"],
  },
};

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default async function ComprarPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard/tienda");
  }

  const products = await getLitePublicCatalog().catch(() => []);

  return (
    <div className="min-h-screen bg-[#fbfcff] text-slate-950">
      <PublicNavbar />
      <main id="main-content">
        <section className="border-b border-slate-200 bg-[#fffdfb]">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:pb-20 lg:pt-32">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#b3131a]">
              Catálogo publicado
            </p>
            <h1 className="mt-3 max-w-[14ch] text-5xl font-black leading-[0.92] tracking-[-0.05em] sm:text-6xl">
              Productos y precios vigentes.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-lg">
              Los productos mostrados aquí provienen del catálogo operativo publicado de PreRescue ID.
              La compra es de pago único y el servicio digital no vence por tiempo mientras el identificador
              permanezca activo y no haya sido revocado o reemplazado.
            </p>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {products.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => {
                  const src = resolveImageSrc(product.imageUrl, "general") || "/sticker-official.png";
                  return (
                    <article key={product.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                      <div className="relative aspect-square bg-[#f7faff]">
                        <Image
                          src={src}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 280px"
                          className="object-contain p-5"
                        />
                      </div>
                      <div className="border-t border-slate-200 p-5">
                        {product.badgeLabel ? (
                          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.13em] text-[#1d66b0]">
                            {product.badgeLabel}
                          </p>
                        ) : null}
                        <h2 className="min-h-10 text-sm font-black leading-5">{product.name}</h2>
                        {product.description ? (
                          <p className="mt-2 min-h-12 text-xs leading-5 text-slate-500">
                            {product.description}
                          </p>
                        ) : null}
                        <p className="mt-4 text-3xl font-black tracking-[-0.04em]">
                          {money.format(Number(product.price) || 0)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Pago único
                        </p>
                        <Link
                          href="/registro"
                          className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#da1a21] px-4 text-sm font-black text-white"
                        >
                          Crear cuenta para comprar
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
                <h2 className="font-black">Catálogo temporalmente indisponible</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  No pudimos leer los productos publicados en este momento. Puedes contactarnos para recibir ayuda.
                </p>
                <Link href="/contacto" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#0f3159] px-5 text-sm font-black text-white">
                  Contactar
                </Link>
              </div>
            )}

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ["Envíos", "Entregas dentro de Panamá sujetas a cobertura del transportista."],
                ["Pago", "El flujo y los métodos disponibles se muestran al completar tu pedido."],
                ["Garantía", "La garantía física aplica según las condiciones publicadas vigentes."],
              ].map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                  <h2 className="font-black">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-[#fffaf8] p-6">
              <h2 className="text-xl font-black">Antes de comprar</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ["¿Necesito instalar una app?", "No. El perfil se consulta desde un navegador compatible."],
                  ["¿Hay mensualidad?", "No. El servicio digital no tiene mensualidad ni vencimiento por tiempo."],
                  ["¿Cómo activo el producto?", "Después de recibirlo, utilizas el código de activación y lo vinculas con tu perfil."],
                  ["¿Puedo actualizar la información?", "Sí. El titular puede administrar la información disponible desde su cuenta."],
                ].map(([q, a]) => (
                  <div key={q}>
                    <h3 className="text-sm font-black">{q}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
