import { Battery, CreditCard, Globe, Heart, QrCode, ShieldCheck, Smartphone, Users } from "lucide-react";

const items = [
  { icon: QrCode, label: "QR + NFC" },
  { icon: Battery, label: "Sticker sin batería" },
  { icon: Smartphone, label: "Sin instalar app" },
  { icon: ShieldCheck, label: "Privacidad configurable" },
  { icon: Heart, label: "Contactos de emergencia" },
  { icon: Users, label: "Perfiles para familias" },
  { icon: Globe, label: "Consulta desde el navegador" },
  { icon: CreditCard, label: "Pago único · sin mensualidad" },
];

export default function BenefitMarquee() {
  return (
    <section aria-label="Beneficios principales" className="emergency-alert-strip relative overflow-hidden border-y border-rose-300/[0.10] bg-[#05070b] py-4 shadow-[inset_0_1px_0_rgba(239,45,53,.08),inset_0_-1px_0_rgba(37,99,235,.08)] sm:py-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-40 bg-gradient-to-r from-[#05070b] to-transparent sm:block" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-40 bg-gradient-to-l from-[#05070b] to-transparent sm:block" />
      <div className="flex snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-max sm:snap-none sm:gap-4 sm:overflow-visible sm:px-0 sm:motion-safe:animate-[marquee_30s_linear_infinite]">
        {[...items, ...items].map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className={`${index >= items.length ? "hidden sm:flex" : "flex"} min-h-11 shrink-0 snap-start items-center gap-2.5 rounded-full border border-white/[0.08] bg-black/25 px-4 py-2.5 sm:snap-none`}
          >
            <item.icon className={`h-3.5 w-3.5 ${index % 3 === 0 ? "text-rose-300" : "text-sky-300"}`} />
            <span className="whitespace-nowrap text-xs font-bold text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
