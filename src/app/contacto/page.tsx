import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MapPin, Phone, Clock } from "lucide-react";

export const metadata = { title: "Contacto" };

export default function ContactoPage() {
  return (
    <>
      <Navbar />
      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Contacto</h1>
            <p className="mt-4 text-lg text-muted-foreground">¿Tienes preguntas? Estamos aquí para ayudarte.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Info */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Información de Contacto</h2>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: "Email", value: "soporte@prerescatepty.com" },
                  { icon: Phone, label: "Teléfono", value: "+507 6000-0000" },
                  { icon: MapPin, label: "Ubicación", value: "Ciudad de Panamá, Panamá" },
                  { icon: Clock, label: "Horario", value: "Lunes a Viernes, 9:00 AM - 6:00 PM" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <form className="space-y-4 p-6 rounded-2xl border border-border bg-card">
              <h2 className="text-xl font-bold">Envíanos un mensaje</h2>
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium mb-1.5">Nombre</label>
                <input id="contact-name" type="text" className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Tu nombre" />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium mb-1.5">Email</label>
                <input id="contact-email" type="email" className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="tu@email.com" />
              </div>
              <div>
                <label htmlFor="contact-msg" className="block text-sm font-medium mb-1.5">Mensaje</label>
                <textarea id="contact-msg" rows={4} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="¿En qué podemos ayudarte?" />
              </div>
              <button type="button" className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-semibold hover:bg-primary/90 transition-colors">
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
