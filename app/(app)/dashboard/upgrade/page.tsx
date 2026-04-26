"use client";

import { useEffect, useState } from "react";
import { Check, Shield, Zap, Users, Building2, ChevronRight, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PACKAGE_THEMES } from "@/domains/shared/constants";

export default function UpgradePage() {
  const router = useRouter();
  const [state, setState] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stateRes, pkgsRes] = await Promise.all([
          fetch("/api/account/state"),
          fetch("/api/public/packages")
        ]);
        
        const stateData = await stateRes.json();
        const pkgsData = await pkgsRes.json();
        
        setState(stateData);
        setPackages(pkgsData.packages || []);
      } catch (err) {
        console.error("Error loading for upgrade:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getColorClass = (colorKey: string | null) => {
    const theme = PACKAGE_THEMES[colorKey || "standard"];
    return theme?.styles || PACKAGE_THEMES.standard.styles;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando opciones de mejora...</p>
      </div>
    );
  }

  // Now all packages are additive (combos), so we show all of them
  const displayPackages = packages;

  return (
    <div className="pb-12">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
          Inventario Extra <span className="text-primary px-3 py-1 rounded-full bg-primary/10 text-xs font-bold uppercase tracking-widest">Tienda</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Elige cualquiera de estos paquetes acumulativos para añadir físicamente más tarjetas NFC y espacio para nuevos perfiles dentro de tu misma cuenta base.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {displayPackages.map((pkg) => {
          const colors = getColorClass(pkg.color);
          const isCurrent = state?.packageId === pkg.id;

          return (
            <div 
              key={pkg.id} 
              className={`relative p-8 rounded-[2.5rem] border group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-card ${pkg.recommended ? 'border-primary/50 shadow-xl shadow-primary/5' : 'border-border active:scale-[0.98]'} ${isCurrent ? 'opacity-70 grayscale-[0.5]' : ''}`}
            >
              {pkg.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg shadow-primary/20">
                  ⭐ El más recomendado
                </div>
              )}

              <div className={`h-14 w-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-6`}>
                <span className="text-3xl">{pkg.icon || PACKAGE_THEMES[pkg.color || "standard"]?.icon}</span>
              </div>

              <h3 className="text-xl font-black mb-1">{pkg.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black">${pkg.price}</span>
                <span className="text-xs text-muted-foreground">Pago único</span>
              </div>

              <p className="text-sm text-balance text-muted-foreground mb-6 h-10 italic">
                {pkg.description || "Mejora tu cobertura y seguridad hoy."}
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>{pkg.maxChips} Stickers NFC/QR</span>
                </li>
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>{pkg.maxProfiles} Perfiles Médicos</span>
                </li>
                {pkg.allowsFamilyProfiles && (
                  <li className="flex items-start gap-2 text-sm font-medium">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>Cuentas Familiares</span>
                  </li>
                )}
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>Alertas Ilimitadas</span>
                </li>
                {pkg.allowsOrganizationModule && (
                  <li className="flex items-start gap-2 text-sm font-medium">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>Módulo Administrativo</span>
                  </li>
                )}
                <li className="flex items-start gap-2 text-sm font-medium">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>Vigencia {pkg.serviceDurationMonths / 12} años</span>
                </li>
              </ul>

              {pkg.accountType === 'company' ? (
                <Link
                  href={`/contacto?subject=Solicitud%20de%20Compra%20de%20Paquete%20${encodeURIComponent(pkg.name)}`}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground`}
                >
                  Contactar Ventas <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  onClick={() => {
                    router.push(`/dashboard/compras?packageId=${pkg.id}`);
                  }}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all ${
                    pkg.recommended 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90' 
                    : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  Comprar Combo <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Enterprise CTA */}
      <div className="rounded-[3rem] p-10 bg-slate-900 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] -mr-48 -mt-48 transition-all group-hover:scale-110" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Soluciones Corporativas</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-4">¿Necesitas proteger a todo tu equipo?</h2>
            <p className="text-slate-300 mb-6 text-lg leading-relaxed">
              Ofrecemos lotes corporativos de chips para empresas, colegios y flotillas con decenas de integrantes. 
              Recibirás credenciales corporativas (Owner/Admin) para delegar chips independientemente a tus colaboradores.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link href="/contacto?subject=Membresía%20Empresarial" className="px-8 py-4 bg-primary rounded-2xl font-black text-white hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20 active:scale-[0.98]">
                Cotizar Empresas <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 flex-shrink-0">
             <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                <Users className="h-8 w-8 text-primary/80" />
                <span className="text-[10px] font-bold uppercase text-slate-400">RRHH Admin</span>
             </div>
             <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 backdrop-blur-sm translate-y-6">
                <CreditCard className="h-8 w-8 text-blue-400/80" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Facturación</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreditCard(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
