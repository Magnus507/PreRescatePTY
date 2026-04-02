import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Package, CheckCircle, Shield, Truck, CreditCard } from "lucide-react";

export const metadata = { title: "Comprar" };

export default function ComprarPage() {
  return (
    <>
      <Navbar />
      <main className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight">Compra tu PreRescate</h1>
            <p className="mt-4 text-lg text-muted-foreground">Protege tu vida con nuestro sistema de identificación de emergencia</p>
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Basic */}
            <div className="rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all relative">
              <h2 className="text-xl font-bold mb-2">PreRescate Básico</h2>
              <p className="text-muted-foreground text-sm mb-6">Ideal para un motociclista</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$15</span>
                <span className="text-muted-foreground text-sm">.00 USD</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "1 Sticker NFC + QR",
                  "Perfil de emergencia digital",
                  "Hasta 3 contactos de emergencia",
                  "Alertas por email",
                  "Dashboard personal",
                  "Historial de escaneos",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/50767516171?text=Hola%2C%20estoy%20interesado%20en%20adquirir%20el%20Plan%20PreRescate%20B%C3%A1sico%20por%20%2415.00." target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition-colors">
                Comprar Ahora con WhatsApp
              </a>
            </div>

            {/* Premium */}
            <div className="rounded-2xl border-2 border-primary bg-card p-8 hover:shadow-lg transition-all relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Recomendado
              </div>
              <h2 className="text-xl font-bold mb-2">PreRescate Familia</h2>
              <p className="text-muted-foreground text-sm mb-6">Para ti y tu familia</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$35</span>
                <span className="text-muted-foreground text-sm">.00 USD</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "3 Stickers NFC + QR",
                  "Todo lo del plan Básico",
                  "Alertas por SMS (próximamente)",
                  "Soporte prioritario",
                  "Stickers de repuesto",
                  "Envío gratis en Panamá",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/50767516171?text=Hola%2C%20estoy%20interesado%20en%20adquirir%20el%20Plan%20PreRescate%20Familia%20por%20%2435.00." target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition-colors">
                Comprar Ahora con WhatsApp
              </a>
          </div>
          </div>

          {/* B2B Sections */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Soluciones Corporativas e Institucionales</h2>
              <p className="mt-4 text-muted-foreground">Administre el bienestar de su equipo, flotilla o estudiantes con una plataforma centralizada</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              
              {/* Empresas */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 hover:shadow-lg transition-all relative flex flex-col">
                <h2 className="text-xl font-bold mb-2">Módulo Empresas</h2>
                <p className="text-muted-foreground text-sm mb-6">Ideal para flotillas y personal de alto riesgo</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">Cotizar</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Desde 10 chips personalizados",
                    "Panel administrativo unificado",
                    "Añadir, remover y asignar chips",
                    "Análisis de perfiles y reportes",
                    "Asignación masiva (creación de bache)",
                    "Soporte prioritario y capacitación",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="https://wa.me/50767516171?text=Hola%2C%20quisiera%20cotizar%20el%20Plan%20Empresarial%20de%20PreRescate." target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center rounded-lg border border-primary bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition-colors">
                  Contactar a Ventas
                </a>
              </div>

              {/* Colegios */}
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-8 hover:shadow-lg transition-all relative flex flex-col">
                <h2 className="text-xl font-bold mb-2 text-indigo-700">Módulo Colegios</h2>
                <p className="text-muted-foreground text-sm mb-6">Para estudiantes y planteles educativos</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">Cotizar</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Perfiles médicos infantiles",
                    "Permisos de excursiones / salidas",
                    "Alergias y medicamentos estandarizados",
                    "Acceso rápido para enfermería escolar",
                    "Gestión para padres y apoderados",
                    "Integración al carnet estudiantil",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-indigo-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="https://wa.me/50767516171?text=Hola%2C%20quisiera%20cotizar%20el%20M%c3%b3dulo%20para%20Colegios%20de%20PreRescate." target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center rounded-lg bg-indigo-600 text-white py-3 font-semibold hover:bg-indigo-700 transition-colors">
                  Contactar a Ventas
                </a>
              </div>

            </div>
          </div>

          {/* Payment Methods */}
          <div className="mt-16 text-center">
            <h3 className="font-semibold mb-4">Métodos de Pago Disponibles</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { icon: CreditCard, name: "Visa / Mastercard" },
                { icon: Shield, name: "Yappy" },
                { icon: CreditCard, name: "Transferencia Bancaria" },
              ].map((m) => (
                <div key={m.name} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm">
                  <m.icon className="h-4 w-4 text-muted-foreground" /> {m.name}
                </div>
              ))}
            </div>
          </div>

          {/* Shipping */}
          <div className="mt-10 p-6 rounded-2xl bg-muted/50 border border-border max-w-2xl mx-auto text-center">
            <Truck className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Envío en Panamá</h3>
            <p className="text-sm text-muted-foreground">
              Envío a todo Panamá. Entrega en 3-5 días hábiles. Envío gratis en pedidos mayores a $30.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
