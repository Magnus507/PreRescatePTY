import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Shield, Smartphone, Heart, Clock, Users, Lock,
  ChevronRight, Zap, UserCheck, Bell, CheckCircle,
  AlertTriangle, Phone, QrCode,
} from "lucide-react";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden gradient-hero text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0wIDM2YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-6">
                <Shield className="h-4 w-4" />
                Sistema de Identificación de Emergencia — Panamá
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Tu información vital,
                <br />
                <span className="text-white/90">siempre accesible.</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl leading-relaxed">
                Un sticker con chip NFC y código QR que lleva tu perfil médico de emergencia. 
                En caso de accidente, cualquier persona puede escanear tu chip y ver tu información 
                crítica al instante. <strong className="text-white">Sin app. Sin login.</strong>
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/comprar"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary font-semibold text-lg hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Comprar Ahora <ChevronRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/como-funciona"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  Cómo Funciona
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-white/60">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-300" /> NFC + QR
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-300" /> Sin app necesaria
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-300" /> Datos protegidos
                </span>
              </div>
            </div>
          </div>

          {/* Decorative bottom wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 40L48 35C96 30 192 20 288 18.7C384 17.3 480 24.7 576 30C672 35.3 768 38.7 864 36.7C960 34.7 1056 27.3 1152 25C1248 22.7 1344 25.3 1392 26.7L1440 28V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0V40Z" className="fill-background" />
            </svg>
          </div>
        </section>

        {/* ===== PROBLEM STATEMENT ===== */}
        <section className="py-20 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-emergency/10 border border-emergency/20 px-4 py-1.5 text-sm font-medium text-emergency mb-6">
                <AlertTriangle className="h-4 w-4" /> El Problema
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                En una emergencia, cada segundo cuenta
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Más de <strong>2,000 accidentes de motocicleta</strong> ocurren anualmente en Panamá. 
                Cuando un motociclista queda inconsciente, los paramédicos y testigos no tienen forma 
                de saber su tipo de sangre, alergias, medicamentos o a quién contactar. 
                PreRescate PTY resuelve eso.
              </p>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS (3 steps) ===== */}
        <section className="py-20 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                ¿Cómo funciona?
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                Tres pasos simples para proteger tu vida
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: "01",
                  icon: QrCode,
                  title: "Compra tu chip",
                  desc: "Recibe tu sticker con NFC y código QR. Pégalo en tu casco, moto o equipo de protección.",
                  color: "bg-primary/10 text-primary",
                },
                {
                  step: "02",
                  icon: UserCheck,
                  title: "Activa y llena tu perfil",
                  desc: "Escanea tu chip, crea tu cuenta y completa tu información médica esencial y contactos de emergencia.",
                  color: "bg-success/10 text-success",
                },
                {
                  step: "03",
                  icon: Bell,
                  title: "Protegido en emergencias",
                  desc: "Si alguien escanea tu chip, verá tu información vital y tus contactos serán notificados automáticamente.",
                  color: "bg-emergency/10 text-emergency",
                },
              ].map((item) => (
                <div key={item.step} className="relative group">
                  <div className="glass-card rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                    <div className="text-5xl font-black text-muted-foreground/10 absolute top-4 right-6">
                      {item.step}
                    </div>
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${item.color} mb-5`}>
                      <item.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="py-20 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Todo lo que necesitas
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                Diseñado para emergencias reales
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Smartphone, title: "NFC + QR", desc: "Doble tecnología de respaldo. Si el NFC falla, el QR funciona. Siempre accesible." },
                { icon: Heart, title: "Perfil Médico", desc: "Tipo de sangre, alergias, medicamentos y condiciones crónicas. Lo esencial para salvar tu vida." },
                { icon: Users, title: "Contactos de Emergencia", desc: "Hasta 3 contactos que serán notificados automáticamente cuando se escanee tu chip." },
                { icon: Clock, title: "Acceso Instantáneo", desc: "Sin app, sin login, sin fricción. El perfil carga en menos de 2 segundos en cualquier navegador." },
                { icon: Lock, title: "Datos Protegidos", desc: "Solo se muestra la información médica esencial. Tus datos privados quedan seguros." },
                { icon: Zap, title: "Alertas Automáticas", desc: "Tus contactos reciben email y SMS cuando alguien escanea tu chip en modo emergencia." },
              ].map((feature, i) => (
                <div key={i} className="flex gap-4 p-6 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ PREVIEW ===== */}
        <section className="py-20 bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Preguntas Frecuentes
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "¿Necesito una app para usar PreRescate?",
                  a: "No. El perfil de emergencia se abre directamente en el navegador web de cualquier teléfono. No se necesita descargar ninguna app.",
                },
                {
                  q: "¿Qué información se muestra cuando escanean mi chip?",
                  a: "Solo la información médica esencial que tú configuras: nombre o alias, tipo de sangre, alergias, medicamentos, condiciones y contactos de emergencia. Nunca se muestra tu email, dirección, fecha de nacimiento ni datos de pago.",
                },
                {
                  q: "¿Es seguro? ¿Quién puede ver mis datos?",
                  a: "Solo se muestra la información mínima de emergencia cuando alguien escanea tu chip. Tu perfil completo, historial y datos personales están protegidos detrás de tu cuenta privada.",
                },
                {
                  q: "¿Qué pasa si pierdo mi casco o chip?",
                  a: "Puedes suspender tu chip inmediatamente desde tu dashboard. El perfil público dejará de mostrarse. Puedes solicitar un chip de reemplazo.",
                },
              ].map((faq, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6 hover:shadow-sm transition-shadow">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/faq" className="text-sm font-medium text-primary hover:underline">
                Ver todas las preguntas →
              </Link>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-20 bg-background">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="gradient-hero rounded-3xl p-10 sm:p-16 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative">
                <Phone className="h-12 w-12 mx-auto mb-6 opacity-80" />
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Protege tu vida hoy
                </h2>
                <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
                  No esperes a que sea tarde. Activa tu chip PreRescate y asegúrate de que, 
                  en caso de emergencia, tu información llegue a las personas correctas.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/comprar"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary font-semibold text-lg hover:bg-white/90 transition-all shadow-lg"
                  >
                    Comprar Mi Chip <ChevronRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/activar"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all"
                  >
                    Ya tengo uno — Activar
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
