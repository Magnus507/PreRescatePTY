import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Shield, Smartphone, QrCode, UserCheck, Bell, Scan, CheckCircle } from "lucide-react";

export const metadata = { title: "Cómo Funciona" };

export default function ComoFunciona() {
  return (
    <>
      <Navbar />
      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight">Cómo Funciona PreRescate PTY</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Un sistema simple pero poderoso que puede salvar tu vida
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12">
            {[
              {
                step: 1, icon: QrCode, title: "Compra tu chip",
                desc: "Adquiere tu sticker PreRescate. Cada chip viene con tecnología NFC integrada y un código QR impreso. Puedes pegarlo en tu casco, en la moto, o en tu equipo de protección.",
                details: ["Chip NFC NTAG213 de alta durabilidad", "Código QR resistente a la intemperie", "Diseño discreto y profesional", "URL única asignada a tu chip"],
              },
              {
                step: 2, icon: UserCheck, title: "Activa y configura tu perfil",
                desc: "Escanea tu chip con tu teléfono o ingresa el código de activación. Crea tu cuenta y completa la información médica que quieres compartir en caso de emergencia.",
                details: ["Registro con email y contraseña segura", "Información médica: sangre, alergias, medicamentos", "Hasta 3 contactos de emergencia", "Consentimiento expreso y trazable"],
              },
              {
                step: 3, icon: Scan, title: "Listo para emergencias",
                desc: "Tu chip está activo. Si alguien escanea el NFC o el QR, verá inmediatamente tu perfil de emergencia público con la información vital que configuraste.",
                details: ["Perfil público carga en menos de 2 segundos", "Sin necesidad de app ni login para el que escanea", "Compatible con cualquier teléfono moderno", "Funciona con NFC o cámara (QR)"],
              },
              {
                step: 4, icon: Bell, title: "Alertas automáticas",
                desc: "Cuando alguien escanea tu chip, tus contactos de emergencia son notificados automáticamente por email y/o SMS con la hora y ubicación aproximada del escaneo.",
                details: ["Notificaciones por email y SMS", "Ubicación aproximada del escaneo", "Historial completo en tu dashboard", "Puedes suspender el chip en cualquier momento"],
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    <item.icon className="h-6 w-6 text-primary" /> {item.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">{item.desc}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.details.map((d, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Tech badges */}
          <div className="mt-16 p-8 rounded-2xl bg-muted/50 border border-border text-center">
            <h3 className="font-semibold mb-4">Tecnología Utilizada</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {["NFC NTAG213", "QR Code", "HTTPS Cifrado", "Base de Datos Segura", "Alertas Automáticas"].map((t) => (
                <span key={t} className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/comprar" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg">
              Comprar Mi Chip
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
