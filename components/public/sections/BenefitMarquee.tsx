"use client";

import { Battery, CreditCard, Globe, Heart, QrCode, ShieldCheck, Smartphone, Users } from "lucide-react";

const items = [
  { icon: QrCode, label: "QR + NFC" },
  { icon: Battery, label: "Sticker sin batería" },
  { icon: Smartphone, label: "Sin instalar app" },
  { icon: ShieldCheck, label: "Privacidad configurable" },
  { icon: Heart, label: "Contactos de emergencia" },
  { icon: Users, label: "Perfiles para familias" },
  { icon: Globe, label: "Consulta desde el navegador" },
  { icon: CreditCard, label: "Planes sin mensualidad recurrente" },
];

export default function BenefitMarquee() {
  return (
    <section aria-label="Beneficios principales" className="relative overflow-hidden border-y border-white/[0.055] bg-[#03060c] py-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#03060c] to-transparent sm:w-40" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#03060c] to-transparent sm:w-40" />
      <div className="marquee-track flex w-max items-center gap-3">
        {[...items, ...items].map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex shrink-0 items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-2.5">
            <item.icon className="h-3.5 w-3.5 text-sky-300" />
            <span className="whitespace-nowrap text-xs font-bold text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
