"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import { GlowCard } from "@/components/ui/spotlight-card";
import { resolveImageSrc } from "@/lib/resolve-image-src";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  productType?: string | null;
  operationsProductCode?: string | null;
  operationalMapping?: {
    badgeLabel?: string | null;
  } | null;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const purchaseFaq = [
  {
    q: "¿Los precios de esta página son los vigentes?",
    a: "Sí. El catálogo público carga los productos y precios desde la misma fuente operativa que mantiene PreRescue ID.",
  },
  {
    q: "¿Hay mensualidades o vencimiento por tiempo?",
    a: "No. La compra es de pago único y el servicio digital no tiene vencimiento por tiempo mientras el identificador permanezca activo y no haya sido revocado o reemplazado.",
  },
  {
    q: "¿Cómo completo la compra?",
    a: "Crea tu cuenta o inicia sesión. Desde la tienda del panel podrás elegir el producto publicado, confirmar los datos de entrega y seguir el flujo de pago vigente.",
  },
  {
    q: "¿Necesito instalar una aplicación?",
    a: "No. La consulta del perfil se realiza desde un navegador compatible.",
  },
];

const commercialInfo = [
  {
    icon: PackageCheck,
    title: "Envíos",
    text: "Realizamos entregas dentro de Panamá, sujetas a cobertura del transportista. Cualquier cargo de entrega se informa antes del despacho.",
    href: "/legal/envios",
    label: "Política de envíos",
  },
  {
    icon: CreditCard,
    title: "Pago",
    text: "Los métodos disponibles dependen de la configuración vigente y el pedido se confirma conforme al flujo de pago mostrado en tu cuenta.",
    href: "/legal/terminos",
    label: "Términos y condiciones",
  },
  {
    icon: ShieldCheck,
    title: "Garantía",
    text: "La garantía física cubre los defectos de fabricación descritos en las condiciones vigentes y es independiente de la continuidad del servicio digital.",
    href: "/legal/garantia",
    label: "Garantía y reemplazos",
  },
];

function ProductCard({ product, index }: { product: Product; index: number }) {
  const imageSrc = resolveImageSrc(product.imageUrl, "general") || "/sticker-official.png";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-45px" }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="h-full"
    >
      <GlowCard customSize glowColor={index === 0 ? "red" : "blue"} className="h-full p-5 sm:min-h-[510px] sm:p-6">
        <div className="flex h-full flex-col">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-gradient-to-br from-[#0c1730] to-[#040711]">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 92vw, (max-width: 1200px) 46vw, 360px"
              className="object-contain p-6"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
              Catálogo activo
            </span>
            {product.operationalMapping?.badgeLabel && (
              <span className="rounded-full border border-sky-300/15 bg-sky-300/[0.05] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-sky-200">
                {product.operationalMapping.badgeLabel}
              </span>
            )}
          </div>

          <h3 className="mt-2.5 text-[21px] font-black tracking-[-0.035em] text-slate-50 sm:text-2xl">
            {product.name}
          </h3>

          {product.description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">{product.description}</p>
          )}

          <div className="mt-5 border-y border-white/[0.06] py-5">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tracking-[-0.055em] text-white">
                {priceFormatter.format(Number(product.price) || 0)}
              </span>
              <span className="pb-1 text-[11px] font-semibold text-slate-600">pago único</span>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {[
              "Producto publicado en el catálogo operativo",
              "Vinculación y activación mediante el flujo de PreRescue ID",
              "Servicio digital sin vencimiento por tiempo",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3 text-[13px] font-semibold leading-5 text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/[0.08] text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-6 sm:mt-auto sm:pt-7">
            <Link
              href="/registro"
              className="group flex min-h-[52px] w-full items-center justify-between rounded-2xl bg-[#DA1A21] px-5 text-sm font-extrabold text-white shadow-[0_16px_45px_-20px_rgba(218,26,33,.9)] transition-all active:scale-[0.99] hover:bg-[#ef2d35]"
            >
              Crear cuenta para comprar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

export default function ComprarContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data.products) ? data.products : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-white antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Catálogo · Pago único"
          title="Elige la identificación que"
          titleAccent="mejor encaja contigo."
          description="Los productos y precios se cargan directamente desde el catálogo operativo publicado. El servicio digital no vence por tiempo."
          primaryCTA={{ href: "#catalogo", label: "Ver productos" }}
          secondaryCTA={{ href: "/como-funciona", label: "Cómo funciona" }}
        />

        <section className="border-y border-white/[0.055] bg-[#03060c] py-3.5 sm:py-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-4 sm:px-6">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <CreditCard className="h-3.5 w-3.5 text-emerald-300" /> Pago único
            </span>
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <ShoppingBag className="h-3.5 w-3.5 text-sky-300" /> Catálogo operativo
            </span>
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" /> Sin vencimiento por tiempo
            </span>
          </div>
        </section>

        <section id="catalogo" className="relative scroll-mt-20 overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(52% 56% at 50% 20%, rgba(37,99,235,.12), transparent 64%), radial-gradient(30% 42% at 86% 78%, rgba(218,26,33,.06), transparent 68%)",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80 sm:text-[10px]">
                Productos publicados
              </p>
              <h2 className="text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.92]">
                El precio visible es el precio operativo vigente.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-7">
                Cuando un producto o precio cambia en el catálogo publicado, esta página toma ese valor directamente de la misma fuente.
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-sm font-bold text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-300" /> Cargando productos
                </div>
              </div>
            ) : error ? (
              <div className="mx-auto max-w-xl rounded-[1.5rem] border border-rose-300/10 bg-rose-300/[0.035] p-6 text-center">
                <p className="text-base font-extrabold text-slate-100">No pudimos cargar el catálogo.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Puedes contactarnos para confirmar las opciones disponibles.</p>
                <Link href="/contacto" className="mt-5 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[#DA1A21] px-5 text-sm font-bold text-white">
                  Contactar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : products.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-6 text-center text-sm font-medium text-slate-500">
                No hay productos publicados en este momento.
              </div>
            ) : (
              <div className="mx-auto grid max-w-6xl gap-3 sm:gap-4 md:grid-cols-2">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#050914] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-9 lg:grid-cols-[.7fr_1.3fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80">Antes de comprar</p>
                <h2 className="max-w-[9ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,4.8rem)]">
                  Respuestas claras antes de elegir.
                </h2>
              </div>
              <div className="space-y-2.5">
                {purchaseFaq.map((faq, index) => (
                  <motion.details
                    key={faq.q}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.38, delay: index * 0.035 }}
                    className="group overflow-hidden rounded-[1.15rem] border border-white/[0.065] bg-white/[0.025] open:border-sky-300/15 open:bg-sky-300/[0.03]"
                  >
                    <summary className="flex min-h-[60px] cursor-pointer list-none items-center px-4 py-4 text-[13px] font-extrabold leading-5 text-slate-100 sm:px-6 sm:text-sm">
                      {faq.q}
                    </summary>
                    <div className="border-t border-white/[0.05] px-4 pb-5 pt-3.5 sm:px-6">
                      <p className="text-sm leading-6 text-slate-400">{faq.a}</p>
                    </div>
                  </motion.details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#03060c] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-9 text-center sm:mb-12">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/80">Información comercial</p>
              <h2 className="text-[clamp(2.3rem,10vw,3rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.6rem,5vw,4.7rem)]">
                Compra con las condiciones a la vista.
              </h2>
            </div>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
              {commercialInfo.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-[1.35rem] border border-white/[0.065] bg-white/[0.026] p-5 sm:p-6"
                >
                  <item.icon className="h-5 w-5 text-emerald-300" />
                  <h3 className="mt-5 text-base font-extrabold text-slate-100 sm:text-lg">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-slate-500">{item.text}</p>
                  <Link href={item.href} className="group mt-4 inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white">
                    {item.label}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050914] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#080c14] px-5 py-11 text-center sm:rounded-[2.4rem] sm:px-10 sm:py-14 md:py-20">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(55% 100% at 50% 110%, rgba(218,26,33,.28), transparent 64%), radial-gradient(42% 70% at 82% 6%, rgba(37,99,235,.12), transparent 68%)" }} />
            <div className="relative mx-auto max-w-4xl">
              <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-rose-300/80">PreRescue ID</p>
              <h2 className="text-[clamp(2.4rem,11vw,3.2rem)] font-black leading-[0.92] tracking-[-0.05em] text-slate-50 sm:text-[clamp(2.8rem,6vw,5.6rem)]">
                Prepárate antes de necesitarlo.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-7 sm:text-lg sm:leading-8">
                Crea tu cuenta y completa la compra desde la tienda con el catálogo operativo vigente.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:mt-9 sm:flex-row">
                <Link href="/registro" className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-6 text-sm font-extrabold text-white hover:bg-[#ef2d35]">
                  Crear cuenta <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/contacto" className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] px-6 text-sm font-bold text-slate-100">
                  Necesito ayuda
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
