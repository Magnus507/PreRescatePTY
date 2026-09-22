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
      className="relative overflow-hidden bg-[#f9fbff] py-14 text-slate-950 sm:py-18 lg:py-20"
    >
      <div
        aria-hidden="true"
        className="absolute -left-40 top-[-12rem] h-[36rem] w-[36rem] rounded-full bg-rose-200/35 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-48 top-[8%] h-[40rem] w-[40rem] rounded-full bg-blue-200/48 blur-[135px]"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
      >
        <path d="M0 640c241-92 390-64 568 5 211 81 395 126 615 46 137-50 272-51 417-12v221H0Z" fill="#fff0f1" />
        <path d="M0 760c292-75 506-40 722 20 201 56 449 60 878-45v165H0Z" fill="#eef7ff" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_.7fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[#b3131a] shadow-sm backdrop-blur">
              <HeartPulse className="h-3.5 w-3.5" />
              Nuestros productos
            </div>
            <h2 className="max-w-[11ch] text-[clamp(2.6rem,9vw,5.1rem)] font-black leading-[0.9] tracking-[-0.055em]">
              Protección física,
              <span className="block text-[#1e67b5]">información digital.</span>
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-[15px] font-medium leading-7 text-slate-600 sm:text-lg">
              Un mismo sistema, distintos formatos. Elige cómo quieres llevarlo y
              mantén la información importante más cerca.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#DA1A21]">
              <MoveHorizontal className="h-4 w-4" />
              Galería en movimiento
            </div>
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/82 py-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,.35)] backdrop-blur sm:mt-12 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-white via-white/85 to-transparent sm:w-36"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-white via-white/85 to-transparent sm:w-36"
          />

          <motion.div
            className="flex w-max items-center gap-4 px-4 sm:gap-5 sm:px-6"
            animate={reducedMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          >
            {movingGallery.map((item, index) => (
              <motion.div
                key={`${item.label}-${index}`}
                whileHover={reducedMotion ? undefined : { y: -7, rotateY: index % 2 === 0 ? -2 : 2 }}
                className="relative h-[210px] w-[292px] shrink-0 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,.42)] sm:h-[265px] sm:w-[372px]"
                style={{
                  transform:
                    index % 4 === 0
                      ? "perspective(1000px) rotateY(4deg)"
                      : index % 4 === 2
                        ? "perspective(1000px) rotateY(-4deg)"
                        : undefined,
                }}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 292px, 372px"
                  className="object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-slate-950/46 via-transparent to-transparent"
                />
                <div className="absolute bottom-4 left-4 rounded-full border border-white/55 bg-white/88 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-800 shadow-sm backdrop-blur">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 sm:mt-12">
          <div>
            <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-[#1d66b0]">
              <ShoppingBag className="h-3.5 w-3.5" />
              Catálogo publicado
            </div>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
              Elige el formato que encaja contigo.
            </h3>
          </div>
          <Link
            href="/comprar"
            className="hidden items-center gap-2 text-sm font-black text-[#1d66b0] transition-colors hover:text-[#DA1A21] sm:inline-flex"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-[1.8rem] border border-slate-200 bg-white/80">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-500 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#1d66b0]" />
              Cargando productos
            </div>
          </div>
        ) : error || displayProducts.length === 0 ? (
          <div className="mt-6 rounded-[1.8rem] border border-slate-200 bg-white/85 p-7 text-center shadow-sm">
            <p className="font-medium text-slate-500">
              {error
                ? "No pudimos cargar el catálogo en este momento."
                : "No hay productos publicados en este momento."}
            </p>
            <Link
              href="/contacto"
              className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#0f3159] px-5 py-3 text-sm font-extrabold text-white"
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
                  className="group overflow-hidden rounded-[1.55rem] border border-slate-200/90 bg-white p-3 shadow-[0_18px_55px_-38px_rgba(15,23,42,.33)] transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_25px_65px_-38px_rgba(29,102,176,.34)]"
                >
                  <div className="relative aspect-[1.08/1] overflow-hidden rounded-[1.2rem] bg-[linear-gradient(145deg,#f8fbff,#fff5f5)]">
                    <Image
                      src={imageSrc}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 260px"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 bg-white/88 text-[#DA1A21] shadow-sm backdrop-blur">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="px-1 pb-1 pt-4">
                    <h4 className="min-h-[42px] text-sm font-black leading-5 text-slate-950">
                      {product.name}
                    </h4>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-3xl font-black tracking-[-0.04em] text-slate-950">
                        {priceFormatter.format(Number(product.price) || 0)}
                      </span>
                      <span className="pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        pago único
                      </span>
                    </div>
                    <Link
                      href="/comprar"
                      className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-800 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-[#b3131a]"
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
            className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#1d66b0]"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
