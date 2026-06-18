"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Package {
  id: string;
  name: string;
  slug: string | null;
  maxChips: number;
  maxProfiles: number;
  price: number;
  description: string | null;
  isActive: boolean;
  accountType: string;
  icon: string | null;
  color: string | null;
  recommended: boolean;
  displayOrder: number;
  savings: string | null;
  allowsFamilyProfiles: boolean;
  allowsOrganizationModule: boolean;
  serviceDurationMonths: number;
}

export default function PlansPreview() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/public/packages")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        setPackages(data.packages || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const displayPackages = packages.slice(0, 3);

  return (
    <section className="relative py-24 md:py-32 bg-[#F4F6F8] text-[#1A1D23] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tighter leading-[0.95] mb-4">
            Un plan para cada persona, familia o equipo
          </h2>
          <p className="text-lg text-[#6B7280] font-medium max-w-2xl mx-auto">
            Pago único. Sin mensualidades. 2 años de vigencia desde la activación.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#DA1A21]" />
          </div>
        ) : error || displayPackages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6B7280] font-medium mb-4">
              {error ? "Error al cargar los planes." : "No hay planes disponibles en este momento."}
            </p>
            <Link
              href="/comprar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
            >
              Ver todos los planes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayPackages.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-3xl p-8 border ${
                  pkg.recommended
                    ? "bg-slate-900 text-white border-slate-700 shadow-xl"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                {pkg.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#DA1A21] text-white text-xs font-bold">
                    Más popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                <p className={`text-sm mb-6 ${pkg.recommended ? "text-slate-300" : "text-slate-600"}`}>
                  {pkg.maxChips} chip{pkg.maxChips !== 1 ? "s" : ""} · {pkg.maxProfiles} perfil{pkg.maxProfiles !== 1 ? "es" : ""}
                </p>
                <ul className="space-y-3 mb-8">
                  {["QR + NFC", "Perfil médico completo", "Contactos de emergencia", "2 años de cobertura"].map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <Check className={`h-4 w-4 ${pkg.recommended ? "text-[#10B981]" : "text-[#DA1A21]"}`} />
                      <span className={pkg.recommended ? "text-slate-200" : "text-slate-700"}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={pkg.accountType === "company" ? `/contacto?subject=Me%20interesa%20el%20${encodeURIComponent(pkg.name)}` : `/registro?package=${pkg.id}`}
                  className={`block w-full text-center py-3 rounded-xl font-bold transition-all ${
                    pkg.recommended
                      ? "bg-[#DA1A21] text-white hover:bg-[#B9141B]"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Adquirir
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && !error && packages.length > 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link
              href="/comprar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold hover:bg-slate-50 transition-all"
            >
              Ver todos los planes
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}