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
  { q: "¿Qué es PreRescue ID?", a: "Es un sistema de identificación médica de emergencia. Un sticker con NFC y código QR que permite consultar información configurada para el perfil público al escanearlo.", category: "Producto" },
  { q: "¿Qué información se muestra al escanear?", a: "El perfil puede mostrar datos como nombre, tipo de sangre, alergias, condiciones médicas, medicamentos y contactos de emergencia, según la información disponible y la configuración de visibilidad aplicable.", category: "Producto" },
  { q: "¿El sticker necesita batería?", a: "No. El sticker no tiene batería. El chip NFC se activa con la energía del dispositivo compatible que lo escanea.", category: "Producto" },

  // QR y NFC
  { q: "¿Cómo funciona el código QR?", a: "Un dispositivo con cámara y navegador compatible puede escanear el código QR y abrir el enlace del perfil de emergencia.", category: "QR y NFC" },
  { q: "¿Cómo funciona el chip NFC?", a: "Los dispositivos compatibles con NFC pueden leer el chip al acercarlo y abrir el enlace del perfil, según la configuración del dispositivo.", category: "QR y NFC" },
  { q: "¿Qué celulares son compatibles?", a: "Muchos smartphones actuales soportan NFC. Para el código QR se necesita una cámara o lector compatible y acceso a un navegador.", category: "QR y NFC" },

  // Internet y dispositivos
  { q: "¿Se necesita internet?", a: "El dispositivo que escanea necesita conexión a internet para cargar el perfil médico. El sticker no necesita batería ni conexión.", category: "Internet y dispositivos" },
  { q: "¿Funciona fuera de Panamá?", a: "El perfil se consulta por internet y puede utilizarse fuera de Panamá cuando el dispositivo tenga acceso a la web y los servicios necesarios estén disponibles.", category: "Internet y dispositivos" },
  { q: "¿Necesito instalar una aplicación?", a: "No. El perfil se abre en el navegador del dispositivo. No requiere instalar una aplicación de PreRescue ID.", category: "Internet y dispositivos" },

  // Privacidad
  { q: "¿Qué información es pública?", a: "El perfil público muestra los datos configurados para ser visibles según las opciones disponibles. El correo de la cuenta y la fecha de nacimiento completa no forman parte del perfil público.", category: "Privacidad" },
  { q: "¿Cómo protegen mis datos?", a: "Aplicamos medidas técnicas como HTTPS, hash de contraseñas, controles de acceso y cifrado para campos sensibles que utilizan estas protecciones. Consulta la Política de Privacidad para conocer el tratamiento descrito por el servicio.", category: "Privacidad" },
  { q: "¿Puedo eliminar mi cuenta?", a: "Puedes solicitar la eliminación de tu cuenta desde la configuración mediante el flujo de confirmación disponible. La información se elimina o anonimiza según el proceso del servicio, mientras determinados registros administrativos, contables o de auditoría pueden conservarse cuando corresponda.", category: "Privacidad" },

  // WhatsApp y contactos
  { q: "¿Qué pasa cuando alguien escanea mi chip?", a: "El perfil puede ofrecer opciones de contacto por WhatsApp o llamada. Además, el sistema puede procesar alertas de emergencia asociadas al escaneo cuando esa función está habilitada y el canal correspondiente está disponible.", category: "WhatsApp y contactos" },
  { q: "¿Se envían notificaciones automáticas?", a: "El sistema puede procesar notificaciones de emergencia asociadas al escaneo cuando la función está habilitada, existe un contacto configurado y el canal de entrega está disponible. Las opciones manuales de WhatsApp o llamada pueden seguir mostrándose en el perfil.", category: "WhatsApp y contactos" },
  { q: "¿Se envía mi ubicación automáticamente?", a: "La ubicación aproximada solo puede obtenerse cuando el navegador o dispositivo concede el permiso correspondiente. Si se obtiene, puede formar parte del registro o de una alerta de emergencia según el flujo habilitado.", category: "WhatsApp y contactos" },

  // Perfiles familiares
  { q: "¿Puedo tener más de un perfil?", a: "Sí. Dependiendo del plan, puedes gestionar múltiples perfiles médicos desde tu cuenta.", category: "Perfiles familiares" },
  { q: "¿Puedo comprar un chip para mi hijo?", a: "Sí. Puedes crear y gestionar perfiles médicos para niños y adultos mayores desde tu cuenta, según las opciones del plan y los permisos aplicables.", category: "Perfiles familiares" },

  // Compra y pagos
  { q: "¿Qué métodos de pago aceptan?", a: "Los métodos disponibles se muestran durante el proceso de compra. Los pagos manuales utilizan instrucciones, comprobante y revisión administrativa cuando corresponde.", category: "Compra y pagos" },
  { q: "¿Hay mensualidades?", a: "No. Los planes publicados son de pago único con 2 años de vigencia desde la activación, salvo que se indique expresamente otra condición antes de la compra.", category: "Compra y pagos" },
  { q: "¿Cuánto tiempo dura el servicio?", a: "El plan publicado incluye 2 años de vigencia desde la fecha de activación del chip, salvo que se indique expresamente otra condición antes de la compra.", category: "Compra y pagos" },

  // Vigencia
  { q: "¿Qué pasa cuando se vence el servicio?", a: "Al vencer la vigencia, el perfil puede dejar de estar disponible para consulta pública. Las opciones para continuar el servicio se informarán cuando corresponda.", category: "Vigencia" },
  { q: "¿Puedo actualizar mi información?", a: "Puedes editar los datos del perfil que el panel permita modificar mientras la cuenta y el perfil se encuentren habilitados.", category: "Vigencia" },

  // Uso internacional
  { q: "¿Funciona en otros países?", a: "El perfil se consulta por internet y puede utilizarse en otros países cuando el dispositivo tenga acceso a la web y los servicios necesarios estén disponibles.", category: "Uso internacional" },

  // Empresas
  { q: "¿Ofrecen planes empresariales?", a: "Disponemos de opciones corporativas con panel administrativo para gestionar miembros y chips. Consulta la página de empresas o escríbenos para conocer las opciones vigentes.", category: "Empresas" },

  // Limitaciones del servicio
  { q: "¿PreRescue ID reemplaza la atención médica?", a: "No. PreRescue ID es una herramienta de identificación de emergencia. No reemplaza la atención médica profesional ni garantiza ningún resultado.", category: "Limitaciones del servicio" },
  { q: "¿Qué pasa si el respondedor no tiene internet?", a: "Sin conexión a internet, el perfil no se puede cargar desde el servicio. El sticker no almacena por sí mismo el contenido completo del perfil médico.", category: "Limitaciones del servicio" },

  // Envíos
  { q: "¿Realizan entregas en Panamá?", a: "Las entregas disponibles se informan durante el proceso de compra y están sujetas a cobertura, destino y condiciones del transportista.", category: "Envíos" },
  { q: "¿Cuánto tarda el envío?", a: "El plazo informado es estimado y depende de la confirmación del pago, disponibilidad, destino y transportista. Consulta la Política de Envíos para las condiciones publicadas.", category: "Envíos" },
  { q: "¿El envío está incluido en el precio?", a: "El costo de entrega se informa antes de confirmar el pedido cuando corresponde. No se debe asumir envío gratuito salvo que se indique expresamente durante la compra.", category: "Envíos" },

  // Devoluciones
  { q: "¿Puedo cancelar mi pedido?", a: "Las condiciones de cancelación dependen del estado del pedido. Consulta la política vigente de Cancelaciones y Reembolsos antes de solicitarla.", category: "Devoluciones" },
  { q: "¿Puedo devolver un producto?", a: "Las devoluciones están sujetas a las condiciones publicadas en la política vigente de Cancelaciones y Reembolsos, incluyendo estado, uso, activación y plazo aplicable.", category: "Devoluciones" },

  // Garantía y reemplazos
  { q: "¿Qué ocurre si el chip presenta un defecto?", a: "Si el chip presenta un posible defecto de fabricación, contáctanos para evaluar el caso según la política de Garantía y Reemplazos vigente." , category: "Garantía y reemplazos" },
  { q: "¿Qué cubre la garantía?", a: "La cobertura y exclusiones se describen en la política de Garantía y Reemplazos vigente. Se evalúan, entre otros aspectos, defectos de fabricación y uso adecuado del producto.", category: "Garantía y reemplazos" },
  { q: "¿Qué pasa si pierdo el chip?", a: "Contáctanos para desactivar la identificación anterior y conocer las opciones vigentes de reemplazo y vinculación del perfil.", category: "Garantía y reemplazos" },
  { q: "¿Puedo transferir mi perfil a otro chip?", a: "La transferencia depende del flujo disponible de verificación, desactivación de la identificación anterior y vinculación de la nueva unidad.", category: "Garantía y reemplazos" },

  // Vigencia y renovación
  { q: "¿Qué ocurre después de los 2 años?", a: "La vigencia publicada es de 2 años desde la activación. Antes o al finalizar ese período se informarán las opciones disponibles para continuar el servicio. Actualmente no se promete renovación automática.", category: "Vigencia y renovación" },
  { q: "¿La renovación es automática?", a: "Actualmente no se promete renovación automática. Las opciones disponibles se informarán según las condiciones vigentes al acercarse el vencimiento.", category: "Vigencia y renovación" },

  // Impuestos
  { q: "¿Los precios incluyen impuestos?", a: "Los impuestos aplicables, si corresponden, se mostrarán antes de completar el pago o en el documento comercial correspondiente." , category: "Impuestos" },
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
          description="Información clara sobre la tecnología, el producto y el servicio."
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
