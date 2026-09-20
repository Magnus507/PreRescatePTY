"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Cpu, Loader2, PackageCheck, ShieldCheck } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency?: string;
  availableStock?: number;
  operationalMapping?: {
    deviceTypeLabel?: string;
    badgeLabel?: string | null;
    requiresCompanyContext?: boolean;
  } | null;
};

export default function ComprarContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setProducts(Array.isArray(payload.products) ? payload.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const personalProducts = products.filter(
    (product) => product.operationalMapping?.requiresCompanyContext !== true
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)]">
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DA1A21]/15 bg-[#DA1A21]/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#DA1A21]">
            <ShieldCheck className="h-4 w-4" />
            Productos PreRescue
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Elige tu dispositivo.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
            Ya no usamos paquetes. Compras cada dispositivo de forma individual con un único pago.
            El servicio digital no tiene mensualidades ni vencimiento por tiempo mientras el identificador permanezca activo.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#DA1A21]" />
          </div>
        ) : personalProducts.length === 0 ? (
          <div className="mx-auto mt-12 max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <PackageCheck className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-black text-slate-950">Catálogo temporalmente sin productos publicados</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              Puedes crear tu cuenta ahora y entrar a la tienda cuando haya inventario publicado.
            </p>
            <Link
              href="/registro"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#DA1A21] px-5 py-3 text-sm font-black text-white"
            >
              Crear cuenta <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {personalProducts.map((product) => (
              <article
                key={product.id}
                className="flex flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.3)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Cpu className="h-5 w-5" />
                </div>
                <div className="mt-5 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#DA1A21]">
                    {product.operationalMapping?.badgeLabel || product.operationalMapping?.deviceTypeLabel || "Dispositivo"}
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">{product.name}</h2>
                  {product.description && (
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{product.description}</p>
                  )}
                </div>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Precio</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {"$" + Number(product.price).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {(product.availableStock ?? 0) > 0 ? "Disponible" : "Sujeto a inventario"}
                    </p>
                  </div>
                  <Link
                    href="/registro"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-5 py-3.5 text-sm font-black text-white"
                  >
                    Crear cuenta para comprar <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
