"use client";

import { Scan, Battery, Wifi, Shield, Heart, Users, Globe, CreditCard } from "lucide-react";

const items = [
  { icon: Scan, label: "QR + NFC" },
  { icon: Battery, label: "Sin batería" },
  { icon: Wifi, label: "Sin aplicación" },
  { icon: Shield, label: "Privacidad configurable" },
  { icon: Heart, label: "Contactos de emergencia" },
  { icon: Users, label: "Perfiles familiares" },
  { icon: Globe, label: "Uso internacional" },
  { icon: CreditCard, label: "Pago único" },
];

export default function BenefitMarquee() {
  return (
    <section className="relative overflow-hidden bg-[#05070D] py-8 border-t border-white/5">
      <div className="flex marquee-track">
        {[...items, ...items].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 shrink-0 px-5 py-2 rounded-full border border-white/10 bg-white/5"
          >
            <item.icon className="h-4 w-4 text-[#10B981]" />
            <span className="text-sm font-medium text-[#A0AEC0] whitespace-nowrap">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}