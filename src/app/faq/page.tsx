import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { HelpCircle } from "lucide-react";

export const metadata = { title: "Preguntas Frecuentes" };

const faqs = [
  { q: "¿Qué es PreRescate PTY?", a: "Es un sistema panameño de identificación de emergencia que utiliza un sticker con chip NFC y código QR. Al colocarlo en tu equipo, mochila, identificación o vehículo, cualquier persona puede escanear el chip en caso de emergencia y ver tu información médica vital." },
  { q: "¿Necesito descargar una app?", a: "No. El perfil de emergencia se abre directamente en el navegador web de cualquier teléfono. No se necesita descargar ninguna app ni para el usuario ni para quien escanea." },
  { q: "¿Qué información se muestra al escanear?", a: "Solo la información que tú configures: nombre o alias visible, tipo de sangre, alergias críticas, medicamentos, condiciones médicas y contactos de emergencia con botón de llamada. Nunca se muestra tu email, dirección, fecha de nacimiento completa ni datos de pago." },
  { q: "¿Es seguro? ¿Quién puede ver mis datos?", a: "Solo la información médica mínima de emergencia es visible al escanear. Tu perfil completo, historial, datos de la cuenta y otra información personal están protegidos detrás de tu cuenta privada con contraseña." },
  { q: "¿Cómo activo mi chip?", a: "Al recibir tu chip, escanéalo con tu teléfono o visita la página de activación. Ingresa el código que viene impreso en el empaque, crea tu cuenta, y completa tu perfil médico. ¡Listo!" },
  { q: "¿Qué pasa si pierdo mi equipo o chip?", a: "Puedes suspender tu chip inmediatamente desde tu dashboard. El perfil público dejará de mostrarse al escanear. Puedes pedir un chip de reemplazo que se vinculará a tu misma cuenta." },
  { q: "¿Mis contactos de emergencia reciben notificación?", a: "Sí. Cuando alguien escanea tu chip, el sistema envía automáticamente una notificación por email (y opcionalmente SMS) a los contactos que hayas configurado, con la hora y ubicación aproximada del escaneo." },
  { q: "¿Quiénes pueden usar PreRescate?", a: "¡Cualquier persona! Aunque es excelente para motociclistas y ciclistas, está diseñado para ser universal. Es vital para deportistas, personas con condiciones médicas, adultos mayores, niños, o cualquier persona que transite frecuentemente por la ciudad." },
  { q: "¿Funciona sin internet?", a: "El chip NFC y QR no requieren internet para ser escaneados, pero sí se necesita conexión a internet para cargar el perfil de emergencia desde nuestro servidor." },
  { q: "¿Cuánto cuesta?", a: "El Plan Estándar con 1 sticker NFC+QR tiene un costo de $25 USD. El Plan Dúo con 2 stickers tiene un costo de $45 USD. Ofrecemos paquetes familiares y corporativos con descuentos por volumen." },
  { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos Yappy, Visa, Mastercard y transferencia bancaria. Todos los pagos son procesados de forma segura." },
  { q: "¿Cumplen con las leyes de protección de datos de Panamá?", a: "Sí. PreRescate PTY cumple con la Ley 81 de Panamá sobre protección de datos personales y sigue las guías de ANTAI para el tratamiento de datos sensibles de salud, incluyendo consentimiento expreso y trazable." },
  { q: "¿Tienen planes para empresas o colegios?", a: "Sí, contamos con Módulos Corporativos e Institucionales. Estos permiten a empresas, colegios, clubes o flotillas administrar múltiples chips desde un panel central de administración, con funciones integradas de creación de baches y control granular." },
];

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <HelpCircle className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Preguntas Frecuentes</h1>
            <p className="mt-4 text-lg text-muted-foreground">Todo lo que necesitas saber sobre PreRescate PTY</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 hover:shadow-sm transition-shadow">
                <h3 className="font-semibold mb-2 flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed pl-8">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
