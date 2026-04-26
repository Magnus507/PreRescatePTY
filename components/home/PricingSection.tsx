'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, ArrowUpRight, Zap, Plus, Loader2 } from 'lucide-react';
import { BUSINESS_RULES, PACKAGE_THEMES } from "@/domains/shared/constants";

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

export default function PricingSection() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/packages')
      .then((res) => res.json())
      .then((data) => {
        setPackages(data.packages || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading packages:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-10 w-10 animate-spin text-[#DA1A21]" />
      </div>
    );
  }

  // Theme resolution from centralized constants
  const getStylesByColor = (colorKey: string | null) => {
    const defaultStyles = PACKAGE_THEMES.standard.styles;
    if (!colorKey) return defaultStyles;
    return PACKAGE_THEMES[colorKey]?.styles || defaultStyles;
  };

  const getThemeIcon = (colorKey: string | null) => {
    return PACKAGE_THEMES[colorKey || "standard"]?.icon || "🛡️";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="text-center mb-20">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#DA1A21]/10 text-[#DA1A21] font-black text-xs uppercase tracking-widest mb-4">
          Un pago, Protección Continua
        </div>
        <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tighter">
          Inversión en <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-[#DA1A21]">Seguridad</span>
        </h3>
        <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground font-medium">
          Protege desde ti mismo hasta tu familia completa o empresa con nuestros kits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages
          .filter(p => !p.slug?.includes('personalizado'))
          .filter(p => !['Kit Inicial', 'Básico', 'Combo Básico', 'Combo Familiar', 'Combo Residencial', 'Combo Empresarial'].includes(p.name))
          .map((pkg) => {
            const styles = getStylesByColor(pkg.color);
            const isDark = pkg.color === 'corporativo';
          return (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-[2.5rem] p-10 border ${
                pkg.recommended ? 'shadow-2xl shadow-indigo-500/20 md:-translate-y-4' : 'shadow-lg'
              } ${styles.color} ${styles.border} transition-all duration-300 hover:-translate-y-2 hover:shadow-xl`}
            >
              {pkg.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                  Más Recomendado
                </div>
              )}

              <div className="mb-8 flex justify-between items-start">
                <div>
                  <div className="text-4xl mb-4 p-3 bg-white dark:bg-slate-800 rounded-2xl w-fit shadow-sm border border-slate-100 dark:border-slate-700">
                    {pkg.icon || getThemeIcon(pkg.color)}
                  </div>
                  <h4 className="text-2xl font-black tracking-tight">
                    {pkg.name}
                  </h4>
                </div>
              </div>

              <div className="mb-6 flex items-baseline">
                <span className="text-6xl font-black tracking-tighter">${pkg.price}</span>
                <span className="font-bold opacity-60 ml-2">/ pago único</span>
              </div>

              {pkg.savings && (
                <div className="mb-8 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest dark:bg-emerald-900/40 dark:text-emerald-400">
                  <Zap className="h-3.5 w-3.5" /> Ahorras {pkg.savings}
                </div>
              )}

              <ul className="flex-1 space-y-4 mb-10">
                <li className="flex items-start gap-4">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#DA1A21]/10 text-[#DA1A21]'} shrink-0 mt-0.5`}>
                     <Check className="h-3.5 w-3.5 font-bold" />
                  </div>
                  <span className="text-sm font-semibold opacity-90"><strong>{pkg.maxChips}</strong> Chips Inteligentes NFC</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#DA1A21]/10 text-[#DA1A21]'} shrink-0 mt-0.5`}>
                     <Check className="h-3.5 w-3.5 font-bold" />
                  </div>
                  <span className="text-sm font-semibold opacity-90">Gestión de <strong>{pkg.maxProfiles} Perfiles Médicos</strong></span>
                </li>
                {pkg.allowsFamilyProfiles && (
                   <li className="flex items-start gap-4">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#DA1A21]/10 text-[#DA1A21]'} shrink-0 mt-0.5`}>
                        <Check className="h-3.5 w-3.5 font-bold" />
                    </div>
                    <span className="text-sm font-semibold opacity-90">Cuentas Familiares Vinculadas</span>
                  </li>
                )}
                <li className="flex items-start gap-4">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#DA1A21]/10 text-[#DA1A21]'} shrink-0 mt-0.5`}>
                     <Check className="h-3.5 w-3.5 font-bold" />
                  </div>
                  <span className="text-sm font-semibold opacity-90">Alertas a Contactos de Emergencia</span>
                </li>
                {pkg.allowsOrganizationModule && (
                  <li className="flex items-start gap-4">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#DA1A21]/10 text-[#DA1A21]'} shrink-0 mt-0.5`}>
                        <Check className="h-3.5 w-3.5 font-bold" />
                    </div>
                    <span className="text-sm font-semibold opacity-90">Módulo Administrativo Corporativo</span>
                  </li>
                )}
                <li className="flex items-start gap-4">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#DA1A21]/10 text-[#DA1A21]'} shrink-0 mt-0.5`}>
                     <Check className="h-3.5 w-3.5 font-bold" />
                  </div>
                  <span className="text-sm font-semibold opacity-90">Vigencia del servicio: <strong>{pkg.serviceDurationMonths / 12} años</strong></span>
                </li>
              </ul>


              <Link
                href={pkg.accountType === 'company' ? `/contacto?subject=Me%20interesa%20el%20${pkg.name}` : `/registro?package=${pkg.id}`}
                className={`w-full py-4 rounded-2xl text-center font-black transition-all flex items-center justify-center gap-2 ${styles.buttonColor}`}
              >
                Adquirir {pkg.name} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-16 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div>
          <h4 className="font-black text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-500" /> Compra Individual
          </h4>
          <p className="text-muted-foreground font-medium text-sm">
            ¿Solo necesitas añadir más chips? Agrégalos por <strong className="text-foreground">${packages.filter(p => p.accountType === 'personal').sort((a, b) => a.price - b.price)[0]?.price.toFixed(2) || BUSINESS_RULES.EXTRA_CHIP_PRICE.toFixed(2)}</strong> c/u en tu panel.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-6 py-3 font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
        >
          Agrega extra en tu Panel
        </Link>
      </div>
    </div>
  );
}
