import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";

export const metadata = { title: "Comprar" };

const packages = [
  {
    name: "Básico",
    price: 20,
    emoji: "🧩",
    features: [
      "1 Stickers Oficiales NFC/QR",
      "Panel Administrativo de Cuenta",
      "Gestión de hasta 1 Perfiles Médicos",
      "Alertas a Contactos de Emergencia"
    ],
    className: "border-border bg-card text-card-foreground",
    buttonClass: "bg-[#0b1b36] hover:bg-[#0b1b36]/90 text-white",
    checkClass: "text-[#E63946]"
  },
  {
    name: "Familiar",
    price: 45,
    savings: 15,
    emoji: "🔥",
    features: [
      "3 Stickers Oficiales NFC/QR",
      "Panel Administrativo de Cuenta",
      "Gestión de hasta 3 Perfiles Médicos",
      "Alertas a Contactos de Emergencia"
    ],
    className: "bg-[#fffaf0] border-amber-100 text-card-foreground",
    buttonClass: "bg-[#0b1b36] hover:bg-[#0b1b36]/90 text-white",
    checkClass: "text-[#E63946]"
  },
  {
    name: "Hogar",
    price: 70,
    savings: 30,
    emoji: "🏠",
    isPopular: true,
    features: [
      "5 Stickers Oficiales NFC/QR",
      "Panel Administrativo de Cuenta",
      "Gestión de hasta 5 Perfiles Médicos",
      "Alertas a Contactos de Emergencia"
    ],
    className: "border-[#E63946] border-2 bg-card text-card-foreground relative",
    buttonClass: "bg-[#E63946] hover:bg-[#cc333f] text-white",
    checkClass: "text-[#E63946]"
  },
  {
    name: "Pro",
    price: 140,
    savings: 60,
    emoji: "🚀",
    features: [
      "10 Stickers Oficiales NFC/QR",
      "Panel Administrativo de Cuenta",
      "Gestión de hasta 10 Perfiles Médicos",
      "Alertas a Contactos de Emergencia"
    ],
    className: "bg-[#f8faff] border-blue-100 text-card-foreground",
    buttonClass: "bg-[#0b1b36] hover:bg-[#0b1b36]/90 text-white",
    checkClass: "text-[#E63946]"
  },
  {
    name: "Empresa",
    price: 320,
    savings: 80,
    emoji: "🏢",
    features: [
      "20 Stickers Oficiales NFC/QR",
      "Panel Administrativo de Cuenta",
      "Gestión de hasta 20 Perfiles Médicos",
      "Alertas a Contactos de Emergencia"
    ],
    className: "bg-[#fcfdff] border-gray-100 text-card-foreground",
    buttonClass: "bg-[#0b1b36] hover:bg-[#0b1b36]/90 text-white",
    checkClass: "text-[#E63946]"
  },
  {
    name: "Corporativo",
    price: 450,
    savings: 150,
    emoji: "👔",
    features: [
      "30 Stickers Oficiales NFC/QR",
      "Panel Administrativo de Cuenta",
      "Gestión de hasta 30 Perfiles Médicos",
      "Alertas a Contactos de Emergencia"
    ],
    className: "bg-[#0b1b36] border-[#0b1b36] text-white",
    buttonClass: "bg-white hover:bg-neutral-100 text-[#0b1b36]",
    checkClass: "text-[#55e89a]"
  }
];

export default function ComprarPage() {
  return (
    <>
      <Navbar />
      <main className="py-16 bg-gray-50/50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight">Elige tu Plan PreRescate</h1>
            <p className="mt-4 text-lg text-muted-foreground">Protege a tu familia o empresa con el sistema de identificación más avanzado</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {packages.map((pkg) => (
              <div 
                key={pkg.name} 
                className={`rounded-3xl border p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow ${pkg.className}`}
              >
                {pkg.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#E63946] text-white text-xs font-bold uppercase tracking-wide">
                    MÁS ELEGIDO
                  </div>
                )}
                
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>{pkg.emoji}</span> {pkg.name}
                </h2>
                
                <div className="mb-2">
                  <span className="text-5xl font-black">${pkg.price}</span>
                  <span className={`text-sm ml-2 ${pkg.name === "Corporativo" ? "text-gray-300" : "text-gray-500"}`}>
                    pago único inicial
                  </span>
                </div>
                
                <div className="h-8 mb-6">
                  {pkg.savings && (
                    <div className="inline-block px-3 py-1 rounded-md bg-[#e6ffed] text-[#00a843] text-sm font-bold">
                      Ahorras ${pkg.savings}
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 mt-0.5 shrink-0 stroke-[3] ${pkg.checkClass}`} /> 
                      <span className="font-medium text-[15px] leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <a 
                  href={`https://wa.me/50767516171?text=Hola%2C%20estoy%20interesado%20en%20adquirir%20el%20Plan%20PreRescate%20${encodeURIComponent(pkg.name)}%20por%20%24${pkg.price}.00.`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`w-full flex justify-center items-center rounded-xl py-3.5 font-bold transition-colors ${pkg.buttonClass}`}
                >
                  Adquirir Plan
                </a>
              </div>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
