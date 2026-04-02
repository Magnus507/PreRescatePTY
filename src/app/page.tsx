import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { StickerDesign } from "@/components/home/StickerDesign";
import {
  Shield, Smartphone, Heart, Clock, Users, Lock,
  ChevronRight, Zap, UserCheck, Bell, CheckCircle,
  AlertTriangle, Phone, QrCode, Check
} from "lucide-react";

export default function Home() {
  const plans = [
    { name: "Básico", limit: 1, price: 20, ahorra: null, icon: "🧩", color: "bg-slate-100 dark:bg-slate-800" },
    { name: "Familiar", limit: 3, price: 45, ahorra: 15, icon: "🔥", color: "bg-orange-50 dark:bg-orange-900/30" },
    { name: "Hogar", limit: 5, price: 70, ahorra: 30, icon: "🏠", color: "bg-blue-50 dark:bg-blue-900/30", popular: true },
    { name: "Pro", limit: 10, price: 140, ahorra: 60, icon: "🚀", color: "bg-indigo-50 dark:bg-indigo-900/30" },
    { name: "Empresa", limit: 20, price: 320, ahorra: 80, icon: "🏢", color: "bg-slate-100 dark:bg-slate-800" },
    { name: "Corporativo", limit: 30, price: 450, ahorra: 150, icon: "👔", color: "bg-slate-900 text-white dark:bg-black" },
  ];

  return (
    <>
      <Navbar />
      <main>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0C2444] to-[#1a3a63] text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0wIDM2YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-6">
                <Shield className="h-4 w-4 text-[#DA1A21]" />
                Tecnología que salva vidas — Panamá
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Protege lo que más
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-[#DA1A21]">importa en la vía.</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-white/80 leading-relaxed">
                No es solo un sticker, es un <strong>sistema integral de protección</strong>.
                Un sticker inteligente con chip NFC y código QR que contiene perfiles médicos completos con
                acceso instantáneo para paramédicos y contactos de emergencia.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#DA1A21] text-white font-semibold text-lg hover:bg-[#b5141a] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Elige Tu Plan <ChevronRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/como-funciona"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  Cómo Funciona
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-[#DA1A21]" /> NFC + QR Integrado</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-[#DA1A21]" /> Sin app necesaria</span>
              </div>
            </div>
            <div className="flex-1 w-full max-w-lg lg:max-w-xl relative perspective-1000">
              <div className="transform-gpu rotate-[-5deg] hover:rotate-0 transition-transform duration-500 hover:scale-105 shadow-2xl rounded-[2.5rem] bg-transparent rotate-y-12">
                <StickerDesign />
              </div>
              {/* Floating decorative elements */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-bounce-slow">
                <div className="bg-red-100 text-red-600 p-2 rounded-full"><Heart className="h-6 w-6" /></div>
                <div><p className="text-xs text-gray-500 font-medium">Sangre</p><p className="font-bold text-gray-900">O Positivo</p></div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                <div className="bg-blue-100 text-[#0C2444] p-2 rounded-full"><Smartphone className="h-6 w-6" /></div>
                <div><p className="text-xs text-gray-500 font-medium">Escaneo</p><p className="font-bold text-gray-900">0.5s</p></div>
              </div>
            </div>
          </div>
          <div className="h-16 bg-gradient-to-b from-transparent to-background"></div>
        </section>

        {/* ===== PROBLEM STATEMENT ===== */}
        <section className="py-20 bg-background relative z-10 px-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 border border-red-200 px-4 py-1.5 text-sm font-medium text-red-700 mb-6">
                <AlertTriangle className="h-4 w-4" /> El Problema en las Calles
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0C2444] dark:text-white">
                En una emergencia, el tiempo en obtener tus datos decide todo
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Cuando un accidente ocurre, los paramédicos no tienen información si estás inconsciente.
                PreRescatePTY funciona como una voz cuando tú no puedes hablar, indicando tus alergias, tipos de sangre, e infomando a tus familiares al instante mediante nuestro ecosistema web.
              </p>
            </div>
          </div>
        </section>

        {/* ===== PRICING / PLANS ===== */}
        <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-sm font-bold tracking-widest text-[#DA1A21] uppercase mb-2">Paquetes Disponibles</h2>
              <h3 className="text-3xl md:text-5xl font-black text-[#0C2444] dark:text-white tracking-tight">Elige tu plan y ahorra más</h3>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">Escala la protección desde tu uso personal, núcleo familiar hasta la flotilla completa de empleados en tu empresa.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div key={plan.name} className={`relative flex flex-col rounded-3xl p-8 border ${plan.popular ? 'border-[#DA1A21] shadow-xl md:-translate-y-4' : 'border-slate-200 dark:border-slate-800 shadow-md'} ${plan.color} transition-all hover:shadow-2xl`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-[#DA1A21] text-white text-xs font-bold uppercase rounded-full tracking-wider">Más Elegido</div>
                  )}
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <div className="text-3xl mb-2">{plan.icon}</div>
                      <h4 className="text-2xl font-bold">{plan.name}</h4>
                    </div>
                  </div>
                  <div className="mb-6">
                    <span className="text-5xl font-black">${plan.price}</span>
                    <span className="text-sm opacity-70 ml-2">pago único inicial</span>
                  </div>
                  
                  {plan.ahorra && (
                    <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-100 text-green-700 text-sm font-bold dark:bg-green-900/40 dark:text-green-300">
                      Ahorras ${plan.ahorra}
                    </div>
                  )}

                  <ul className="flex-1 space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <Check className={`h-5 w-5 ${plan.name === 'Corporativo' ? 'text-green-400' : 'text-[#DA1A21]'} shrink-0`} />
                      <span className="text-sm leading-tight"><strong>{plan.limit}</strong> Stickers Oficiales NFC/QR</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className={`h-5 w-5 ${plan.name === 'Corporativo' ? 'text-green-400' : 'text-[#DA1A21]'} shrink-0`} />
                      <span className="text-sm leading-tight">Panel Administrativo de Cuenta</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className={`h-5 w-5 ${plan.name === 'Corporativo' ? 'text-green-400' : 'text-[#DA1A21]'} shrink-0`} />
                      <span className="text-sm leading-tight">Gestión de hasta <strong>{plan.limit} Perfiles Médicos</strong></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className={`h-5 w-5 ${plan.name === 'Corporativo' ? 'text-green-400' : 'text-[#DA1A21]'} shrink-0`} />
                      <span className="text-sm leading-tight">Alertas a Contactos de Emergencia</span>
                    </li>
                  </ul>

                  <Link href="/comprar" className={`w-full py-4 rounded-xl text-center font-bold transition-all ${plan.name === 'Corporativo' ? 'bg-white text-black hover:bg-gray-200' : plan.popular ? 'bg-[#DA1A21] text-white hover:bg-[#b5141a]' : 'bg-[#0C2444] text-white hover:bg-[#08182d]'}`}>
                    Adquirir Plan
                  </Link>
                </div>
              ))}
            </div>
            
            <div className="mt-12 text-center text-sm text-slate-500">
              <p>Los ingresos aplican a licencias de uso de software para años base. Consulta políticas y años de vigencia gratis incluida.</p>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-20 bg-white dark:bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0C2444] dark:text-white mb-6">
                  Simple para ti,<br/>Vital en la calle.
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#DA1A21]/10 text-[#DA1A21] flex items-center justify-center font-bold text-xl">1</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Pega tu Sticker</h3>
                      <p className="text-muted-foreground">Fabricado con vinilo resistente a la intemperie. Pégalo en tu casco de seguridad y vincúlalo a tu perfil individual dentro de tu Cuenta.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#DA1A21]/10 text-[#DA1A21] flex items-center justify-center font-bold text-xl">2</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Escaneo Simple</h3>
                      <p className="text-muted-foreground">Con solo acercar un smartphone con NFC, o abrir su cámara para el QR, tu perfil abrirá sin frustraciones en segundos.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#DA1A21]/10 text-[#DA1A21] flex items-center justify-center font-bold text-xl">3</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Notificaciones Masivas</h3>
                      <p className="text-muted-foreground">Tu red de apoyo (familiares / RRHH si es plan empresa) recibe ubicaciones GPS si las aceptas, dándoles oportunidad de acompañarte.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0C2444] to-[#DA1A21] rounded-3xl transform rotate-3 scale-105 opacity-10 blur-xl"></div>
                <img src="/pricing.jpeg" alt="Estructura PreRescate" className="relative rounded-3xl shadow-2xl border border-gray-100 object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-20 bg-background">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-[#0C2444] to-[#12366b] rounded-3xl p-10 sm:p-16 text-white text-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
              <div className="relative">
                <Shield className="h-16 w-16 mx-auto mb-6 text-[#DA1A21]" />
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
                  No es un Sticker,<br/>es un <span className="text-[#DA1A21]">Sistema de Protección</span>.
                </h2>
                <p className="mt-4 text-xl text-white/80 max-w-2xl mx-auto">
                  Gestiona tu bienestar y el de tus allegados y empleados hoy mismo. Elige la protección acorde a tus necesidades.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link
                    href="#pricing"
                    className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-[#DA1A21] text-white font-bold text-lg hover:bg-red-700 transition-all shadow-xl"
                  >
                    Adquirir Plan <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
