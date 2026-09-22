"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ShoppingBag } from "lucide-react";
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

export default function PlansPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

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
      { rootMargin: "600px 0px" },
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

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#03060c] py-20 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 52% at 50% 24%, rgba(37,99,235,.12), transparent 62%), radial-gradient(30% 42% at 78% 78%, rgba(218,26,33,.07), transparent 66%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-70px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-14"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.055] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-sky-200 sm:mb-5 sm:text-[10px] sm:tracking-[0.18em]">
            <ShoppingBag className="h-3.5 w-3.5" />
            Catálogo PreRescue ID
          </div>
          <h2 className="text-[clamp(2.4rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.92]">
            Elige el formato que encaja contigo.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-7">
            Productos y precios cargados directamente desde el catálogo operativo publicado.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center sm:min-h-[340px]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-sm font-bold text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-sky-300" />
              Cargando productos
            </div>
          </div>
        ) : error || displayProducts.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6 text-center sm:rounded-[1.7rem] sm:p-8">
            <p className="font-medium text-slate-400">
              {error ? "No pudimos cargar el catálogo en este momento." : "No hay productos publicados en este momento."}
            </p>
            <Link href="/contacto" className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950">
              Contactar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {displayProducts.map((product, index) => {
              const imageSrc = resolveImageSrc(product.imageUrl, "general") || "/sticker-official.png";
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                >
                  <GlowCard customSize glowColor={index === 0 ? "red" : "blue"} className="h-full p-4 sm:min-h-[390px] sm:p-5">
                    <div className="flex h-full flex-col">
                      <div className="relative aspect-square overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-gradient-to-br from-[#0c1730] to-[#040711]">
                        <Image
                          src={imageSrc}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 260px"
                          className="object-contain p-5"
                        />
                      </div>

                      <div className="pt-5">
                        {product.operationalMapping?.badgeLabel && (
                          <span className="mb-2 inline-flex rounded-full border border-sky-300/15 bg-sky-300/[0.05] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-sky-200">
                            {product.operationalMapping.badgeLabel}
                          </span>
                        )}
                        <h3 className="text-base font-black tracking-[-0.02em] text-white sm:text-lg">{product.name}</h3>
                        <div className="mt-3 flex items-end gap-2">
                          <span className="text-3xl font-black tracking-[-0.04em] text-slate-50">
                            {priceFormatter.format(Number(product.price) || 0)}
                          </span>
                          <span className="pb-1 text-[10px] font-semibold text-slate-500">pago único</span>
                        </div>
                      </div>

                      <Link
                        href="/comprar"
                        className="group mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.05] px-4 text-sm font-extrabold text-slate-100 transition-all active:bg-white/[0.09] sm:mt-auto sm:hover:border-sky-300/20 sm:hover:bg-white/[0.08]"
                      >
                        Ver producto <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </GlowCard>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mt-9 text-center sm:mt-11">
            <Link href="/comprar" className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sky-200 transition-colors hover:text-white">
              Ver catálogo completo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
