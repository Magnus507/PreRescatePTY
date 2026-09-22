"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  HeartPulse,
  Loader2,
  MoveHorizontal,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { resolveImageSrc } from "@/lib/resolve-image-src";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  productType?: string | null;
  operationalMapping?: {
    badgeLabel?: string | null;
  } | null;
}

const gallery = [
  {
    src: "/media/sticker-emergency.avif",
    alt: "Sticker PreRescue ID para emergencias",
    label: "Emergencia",
  },
  {
    src: "/media/purchase-kit.avif",
    alt: "Contenido del kit PreRescue ID",
    label: "Tu compra",
  },
  {
    src: "/media/medical-tags.avif",
    alt: "Identificadores médicos PreRescue ID",
    label: "Identificación",
  },
  {
    src: "/media/pet-tags.webp",
    alt: "Identificador de mascotas PreRescue ID",
    label: "Mascotas",
  },
] as const;

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function PlansPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "650px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;

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
  }, [shouldLoad]);

  const displayProducts = products.slice(0, 4);
  const movingGallery = [...gallery, ...gallery];

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#07101d] py-16 text-white sm:py-20 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute -left-40 top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#DA1A21]/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-48 top-[18%] h-[38rem] w-[38rem] rounded-full bg-blue-600/20 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/25 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_.68fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-300/15 bg-rose-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-rose-200">
              <HeartPulse className="h-3.5 w-3.5" />
              Preparado para verse
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.6rem,9vw,5.2rem)] font-black leading-[0.9] tracking-[-0.055em]">
              Productos que se sienten
              <span className="block text-[#ff3b45]">listos para actuar.</span>
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-[15px] font-medium leading-7 text-slate-300 sm:text-lg">
              Aquí la estética cambia a “modo emergencia”: contraste alto, producto
              al frente y movimiento continuo. Los precios siguen viniendo del
              catálogo operativo publicado.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">
              <MoveHorizontal className="h-4 w-4" />
              Galería en movimiento
            </div>
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/20 py-7 shadow-[0_30px_90px_-50px_rgba(0,0,0,.8)] sm:mt-12 sm:py-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-[#07101d] to-transparent sm:w-40"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-[#07101d] to-transparent sm:w-40"
          />

          <motion.div
            className="flex w-max items-center gap-4 px-4 sm:gap-6 sm:px-6"
            animate={reducedMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
          >
            {movingGallery.map((item, index) => (
              <motion.div
                key={`${item.label}-${index}`}
                whileHover={reducedMotion ? undefined : { y: -7, rotateY: index % 2 === 0 ? -3 : 3 }}
                className="relative h-[220px] w-[300px] shrink-0 overflow-hidden rounded-[1.6rem] border border-white/[0.11] bg-[#0c1524] shadow-[0_24px_60px_-35px_rgba(0,0,0,.85)] sm:h-[280px] sm:w-[390px]"
                style={{
                  transform:
                    index % 4 === 0
                      ? "perspective(1000px) rotateY(5deg)"
                      : index % 4 === 2
                        ? "perspective(1000px) rotateY(-5deg)"
                        : undefined,
                }}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 300px, 390px"
                  className="object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/5"
                />
                <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-white backdrop-blur-xl">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="mt-12 flex items-center justify-between gap-4 sm:mt-14">
          <div>
            <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-sky-300">
              <ShoppingBag className="h-3.5 w-3.5" />
              Catálogo publicado
            </div>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
              Elige el formato que encaja contigo.
            </h3>
          </div>
          <Link
            href="/comprar"
            className="hidden items-center gap-2 text-sm font-black text-sky-200 transition-colors hover:text-white sm:inline-flex"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-[1.8rem] border border-white/[0.07] bg-white/[0.025]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm font-bold text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-sky-300" />
              Cargando productos
            </div>
          </div>
        ) : error || displayProducts.length === 0 ? (
          <div className="mt-6 rounded-[1.8rem] border border-white/[0.08] bg-white/[0.03] p-7 text-center">
            <p className="font-medium text-slate-400">
              {error
                ? "No pudimos cargar el catálogo en este momento."
                : "No hay productos publicados en este momento."}
            </p>
            <Link
              href="/contacto"
              className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950"
            >
              Contactar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {displayProducts.map((product, index) => {
              const imageSrc =
                resolveImageSrc(product.imageUrl, "general") || "/sticker-official.png";

              return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.38, delay: index * 0.04 }}
                  className="group overflow-hidden rounded-[1.55rem] border border-white/[0.09] bg-white/[0.045] p-3 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.065]"
                >
                  <div className="relative aspect-[1.08/1] overflow-hidden rounded-[1.2rem] bg-[#0a1320]">
                    <Image
                      src={imageSrc}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 260px"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/35 text-rose-300 backdrop-blur">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="px-1 pb-1 pt-4">
                    <h4 className="min-h-[42px] text-sm font-black leading-5 text-white">
                      {product.name}
                    </h4>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-3xl font-black tracking-[-0.04em] text-white">
                        {priceFormatter.format(Number(product.price) || 0)}
                      </span>
                      <span className="pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        pago único
                      </span>
                    </div>
                    <Link
                      href="/comprar"
                      className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-black text-slate-100 transition-all hover:border-rose-300/25 hover:bg-rose-300/[0.07]"
                    >
                      Ver producto
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        <div className="mt-7 text-center sm:hidden">
          <Link
            href="/comprar"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-sky-200"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
