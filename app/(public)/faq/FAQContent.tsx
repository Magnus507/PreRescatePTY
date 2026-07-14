"use client";

import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PageHero from "@/components/public/PageHero";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import Link from "next/link";

interface FAQ {
  q: string;
  a: string;
  category: string;
}

const faqs: FAQ[] = [
  // Producto
  { q: "¿Qué es PreRescue ID?", a: "Es un sistema de identificación médica de emergencia. Un sticker con NFC y código QR que permite consultar información médica autorizada al escanearlo.", category: "Producto" },
  { q: "¿Qué información se muestra al escanear?", a: "Nombre, tipo de sangre, alergias, condiciones médicas, medicamentos y contactos de emergencia. Tú controlas qué campos son visibles.", category: "Producto" },
  { q: "¿El sticker necesita batería?", a: "No. El sticker no tiene batería. El chip NFC se activa con la energía del celular que lo escanea.", category: "Producto" },

  // QR y NFC
  { q: "¿Cómo funciona el código QR?", a: "Cualquier celular con cámara puede escanear el código QR. La cámara abre automáticamente el perfil de emergencia en el navegador.", category: "QR y NFC" },
  { q: "¿Cómo funciona el chip NFC?", a: "Los celulares con NFC pueden leer el chip al acercarlo. El perfil se abre automáticamente, sin necesidad de abrir la cámara.", category: "QR y NFC" },
  { q: "¿Qué celulares son compatibles?", a: "La mayoría de los smartphones actuales soportan NFC. El código QR funciona con cualquier celular con cámara.", category: "QR y NFC" },

  // Internet y dispositivos
  { q: "¿Se necesita internet?", a: "El dispositivo que escanea necesita conexión a internet para cargar el perfil médico. El sticker no necesita batería ni conexión.", category: "Internet y dispositivos" },
  { q: "¿Funciona fuera de Panamá?", a: "Sí. El perfil se carga desde internet, por lo que funciona en cualquier país con conexión.", category: "Internet y dispositivos" },
  { q: "¿Necesito instalar una aplicación?", a: "No. El perfil se abre en el navegador del celular. No requiere instalar ninguna aplicación.", category: "Internet y dispositivos" },

  // Privacidad
  { q: "¿Qué información es pública?", a: "Solo la información que tú autorizas. Tu correo electrónico y fecha de nacimiento completa no se muestran públicamente.", category: "Privacidad" },
  { q: "¿Cómo protegen mis datos?", a: "La información sensible está cifrada. Cumplimos con la Ley 81 de Protección de Datos Personales de Panamá.", category: "Privacidad" },
  { q: "¿Puedo eliminar mi cuenta?", a: "Puedes solicitar la eliminación de tu cuenta desde la configuración. La cuenta se desactiva y la información personal y médica sensible se elimina o anonimiza. Determinados registros administrativos, contables y de auditoría pueden conservarse cuando exista una obligación legal o una necesidad legítima de seguridad y trazabilidad.", category: "Privacidad" },

  // WhatsApp y contactos
  { q: "¿Qué pasa cuando alguien escanea mi chip?", a: "El perfil muestra botones para contactar manualmente a tus familiares por WhatsApp o llamada. El respondedor debe iniciar la acción.", category: "WhatsApp y contactos" },
  { q: "¿Se envían notificaciones automáticas?", a: "No. No se envían notificaciones automáticas al escanear. El respondedor debe presionar el botón de WhatsApp o llamada para contactar.", category: "WhatsApp y contactos" },
  { q: "¿Se envía mi ubicación automáticamente?", a: "No. La ubicación aproximada puede incluirse solo si el respondedor otorga permiso de ubicación en su navegador. No se envía información automáticamente.", category: "WhatsApp y contactos" },

  // Perfiles familiares
  { q: "¿Puedo tener más de un perfil?", a: "Sí. Dependiendo del plan, puedes gestionar múltiples perfiles médicos desde tu cuenta.", category: "Perfiles familiares" },
  { q: "¿Puedo comprar un chip para mi hijo?", a: "Sí. Puedes crear y gestionar perfiles médicos para niños y adultos mayores desde tu cuenta.", category: "Perfiles familiares" },

  // Compra y pagos
  { q: "¿Qué métodos de pago aceptan?", a: "Todos los pedidos se pagan de forma manual mediante instrucciones bancarias, comprobante y revisión administrativa.", category: "Compra y pagos" },
  { q: "¿Hay mensualidades?", a: "No. Todos los planes son de pago único con 2 años de vigencia desde la activación.", category: "Compra y pagos" },
  { q: "¿Cuánto tiempo dura el servicio?", a: "Cada plan incluye 2 años de cobertura desde la fecha de activación del chip.", category: "Compra y pagos" },

  // Vigencia
  { q: "¿Qué pasa cuando se vence el servicio?", a: "El perfil deja de estar disponible para consulta pública. Puedes renovar el servicio para continuar la cobertura.", category: "Vigencia" },
  { q: "¿Puedo actualizar mi información?", a: "Sí. Puedes editar tu perfil médico en cualquier momento desde tu panel de control.", category: "Vigencia" },

  // Uso internacional
  { q: "¿Funciona en otros países?", a: "Sí. El perfil se carga desde internet, por lo que funciona en cualquier país con conexión a internet.", category: "Uso internacional" },

  // Empresas
  { q: "¿Ofrecen planes empresariales?", a: "Sí. Disponemos de planes corporativos con panel administrativo para gestionar miembros y chips. Escríbenos para más información.", category: "Empresas" },

  // Limitaciones del servicio
  { q: "¿PreRescue ID reemplaza la atención médica?", a: "No. PreRescue ID es una herramienta de identificación de emergencia. No reemplaza la atención médica profesional ni garantiza ningún resultado.", category: "Limitaciones del servicio" },
  { q: "¿Qué pasa si el respondedor no tiene internet?", a: "Sin conexión a internet, el perfil no se puede cargar. El sticker no almacena información localmente.", category: "Limitaciones del servicio" },

  // Envíos
  { q: "¿Realizan entregas en Panamá?", a: "Sí, realizamos entregas dentro de Panamá, sujetas a la cobertura del transportista. El costo y plazo estimado se informan antes de confirmar el pedido.", category: "Envíos" },
  { q: "¿Cuánto tarda el envío?", a: "El despacho toma 1 a 3 días hábiles después de la confirmación del pago. La entrega toma 1 a 5 días hábiles después del despacho, según destino y transportista.", category: "Envíos" },
  { q: "¿El envío está incluido en el precio?", a: "El costo de entrega se informa antes de confirmar el pedido. No ofrecemos envío gratuito garantizado.", category: "Envíos" },

  // Devoluciones
  { q: "¿Puedo cancelar mi pedido?", a: "Sí, puedes cancelar el pedido antes de que sea entregado al transportista. Una vez entregado, no se puede cancelar.", category: "Devoluciones" },
  { q: "¿Puedo devolver un producto?", a: "Los productos sin abrir, sin usar y sin activar podrán devolverse dentro de los 7 días calendario posteriores a su recepción, en su empaque original.", category: "Devoluciones" },

  // Garantía y reemplazos
  { q: "¿Qué ocurre si el chip presenta un defecto?", a: "Si el chip presenta un defecto de fabricación, está cubierto por la garantía de 1 año. Contáctanos para evaluar el caso y gestionar el reemplazo o la solución correspondiente.", category: "Garantía y reemplazos" },
  { q: "¿Qué cubre la garantía?", a: "Cubre defectos de fabricación como NFC ilegible, código QR ilegible por defecto de impresión, o fallo del adhesivo en el primer uso cuando se siguieron las instrucciones. No cubre pérdida, robo, daños por uso inadecuado o instalación incorrecta.", category: "Garantía y reemplazos" },
  { q: "¿Qué pasa si pierdo el chip?", a: "Los chips perdidos deben adquirirse al precio vigente. El perfil médico puede transferirse a un chip nuevo después de verificar la identidad y desactivar el chip anterior.", category: "Garantía y reemplazos" },
  { q: "¿Puedo transferir mi perfil a otro chip?", a: "Sí, el perfil puede transferirse a un chip nuevo después de verificar la identidad del titular y desactivar el chip anterior.", category: "Garantía y reemplazos" },

  // Vigencia y renovación
  { q: "¿Qué ocurre después de los 2 años?", a: "El servicio tiene una vigencia de 2 años desde la activación. Antes de finalizar este período se informarán las opciones disponibles para continuar el servicio. Actualmente no existe renovación automática.", category: "Vigencia y renovación" },
  { q: "¿La renovación es automática?", a: "No. Actualmente no existe renovación automática. Se informarán las opciones disponibles antes del vencimiento.", category: "Vigencia y renovación" },

  // Impuestos
  { q: "¿Los precios incluyen impuestos?", a: "Los impuestos aplicables, si corresponden, se mostrarán antes de completar el pago.", category: "Impuestos" },
];

const categories = [
  "Todas",
  "Producto",
  "QR y NFC",
  "Internet y dispositivos",
  "Privacidad",
  "WhatsApp y contactos",
  "Perfiles familiares",
  "Compra y pagos",
  "Vigencia",
  "Vigencia y renovación",
  "Uso internacional",
  "Empresas",
  "Limitaciones del servicio",
  "Envíos",
  "Devoluciones",
  "Garantía y reemplazos",
  "Impuestos",
];

export default function FAQContent() {
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = activeCategory === "Todas" ? faqs : faqs.filter((f) => f.category === activeCategory);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen font-sans antialiased">
      <PublicNavbar />
      <main id="main-content">
        <PageHero
          eyebrow="Preguntas frecuentes"
          title="Resolviendo dudas"
          description="Transparencia total sobre la tecnología y el servicio."
        />

        <section className="py-24 md:py-32 bg-[#05070D]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Category navigation */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeCategory === cat
                      ? "bg-[#DA1A21] text-white"
                      : "bg-white/5 text-[#A0AEC0] hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* FAQ list */}
            <div className="max-w-3xl mx-auto space-y-4">
              <AnimatePresence mode="wait">
                {filtered.map((faq) => {
                  const globalIndex = faqs.indexOf(faq);
                  const isOpen = openIndex === globalIndex;
                  const buttonId = `faq-button-${globalIndex}`;
                  const panelId = `faq-panel-${globalIndex}`;
                  return (
                    <motion.div
                      key={faq.q}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="glass-card-w2a rounded-2xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(globalIndex)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        id={buttonId}
                        className="w-full flex items-center justify-between p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070D]"
                      >
                        <span className="text-base font-bold text-[#EFF4FF] pr-4">{faq.q}</span>
                        <ChevronDown className={`h-5 w-5 text-[#10B981] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div
                              id={panelId}
                              role="region"
                              aria-labelledby={buttonId}
                              className="px-6 pb-6"
                            >
                              <p className="text-sm text-[#A0AEC0] leading-relaxed">{faq.a}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Contact CTA */}
            <div className="mt-16 max-w-2xl mx-auto glass-card-w2a rounded-3xl p-8 md:p-10 text-center">
              <MessageCircle className="h-10 w-10 mx-auto text-[#DA1A21] mb-4" />
              <h3 className="text-xl font-black text-[#EFF4FF] mb-2">¿Aún con dudas?</h3>
              <p className="text-sm text-[#A0AEC0] mb-6">
                Escríbenos y te ayudaremos a resolver tus preguntas sobre el producto o el servicio.
              </p>
              <Link
                href="/contacto"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DA1A21] text-white font-bold hover:bg-[#B9141B] transition-all"
              >
                Contactar
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
