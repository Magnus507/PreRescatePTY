import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Términos y Condiciones" };

export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main className="bg-slate-950 text-white">
        <section className="overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%)] py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[3rem] border border-white/10 bg-white/5 p-10 shadow-[0_40px_120px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <span className="text-sm uppercase tracking-[0.35em] text-brand font-black">Términos y Condiciones</span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-white">Condiciones de uso de PreRescue ID</h1>
              <p className="mt-4 max-w-2xl text-slate-300 leading-relaxed">Lee con atención las reglas y responsabilidades del servicio para garantizar la seguridad de tus datos y del perfil médico.</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-10 shadow-xl shadow-slate-950/30">
              <div className="space-y-6 prose prose-invert prose-sm text-slate-100 max-w-none">
                <p className="text-sm text-brand uppercase tracking-[0.35em] font-black">Versión 1.0 — Última actualización: Marzo 2026</p>

                <h2>1. Aceptación de los Términos</h2>
                <p>Al registrarte y utilizar los servicios de PreRescate PTY ("el Servicio"), aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo, no debes usar el Servicio.</p>

                <h2>2. Descripción del Servicio</h2>
                <p>PreRescate PTY es un sistema de identificación de emergencia que permite a los usuarios crear un perfil médico digital vinculado a un chip NFC y código QR. El Servicio permite que terceros accedan a la información médica esencial del usuario al escanear el chip en situaciones de emergencia.</p>

                <h2>3. Limitación de Responsabilidad</h2>
                <p><strong>PreRescate PTY NO es un servicio médico ni de emergencias.</strong> No reemplaza al 911 ni a los servicios de atención médica profesional. En caso de emergencia, siempre llame al 911 primero.</p>
                <p>PreRescate PTY no garantiza que la información del perfil será vista o utilizada por terceros en caso de emergencia. La disponibilidad del servicio depende de factores como la conectividad a internet, el estado del dispositivo de escaneo y la funcionalidad del chip.</p>

                <h2>4. Responsabilidad del Usuario</h2>
                <p>El usuario es responsable de:</p>
                <ul>
                  <li>Mantener su información médica actualizada y precisa.</li>
                  <li>Proteger sus credenciales de acceso.</li>
                  <li>Notificar de inmediato si pierde acceso a su cuenta o chip.</li>
                  <li>Comprender que la información del perfil público será visible para cualquier persona que escanee el chip.</li>
                </ul>

                <h2>5. Propiedad del Chip</h2>
                <p>El chip físico es propiedad del usuario una vez adquirido. Sin embargo, el sistema digital, la URL asociada, y la plataforma son propiedad de PreRescate PTY. Un chip no puede ser transferido a otro usuario sin autorización.</p>

                <h2>6. Suspensión y Cancelación</h2>
                <p>El usuario puede suspender, desactivar o solicitar la eliminación de su chip y datos en cualquier momento desde su dashboard o contactando a soporte.</p>
                <p>PreRescate PTY se reserva el derecho de suspender cuentas que violen estos términos o que se utilicen de forma fraudulenta.</p>

                <h2>7. Pagos y Reembolsos</h2>
                <p>Los precios están indicados en USD. Los pagos se procesan de forma segura a través de los proveedores indicados. Las políticas de reembolso se aplican según el caso.</p>

                <h2>8. Modificaciones</h2>
                <p>PreRescate PTY puede modificar estos términos. Los usuarios serán notificados de cambios materiales. El uso continuado del servicio después de la notificación constituye aceptación de los nuevos términos.</p>

                <h2>9. Ley Aplicable</h2>
                <p>Estos términos se rigen por las leyes de la República de Panamá, incluyendo la Ley 81 de Protección de Datos Personales y las regulaciones emitidas por ANTAI.</p>

                <h2>10. Contacto</h2>
                <p>Para consultas sobre estos términos: <strong>soporte@prerescatepty.com</strong></p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-brand/20 bg-brand/5 p-8 text-slate-100 shadow-xl shadow-brand/10">
              <p className="text-base font-semibold text-white">¿Tienes preguntas sobre los términos?</p>
              <p className="mt-3 text-slate-300 leading-relaxed">Nuestro equipo de soporte está listo para ayudarte con cualquier inquietud relacionada al uso del servicio y la protección de datos.</p>
              <a href="mailto:soporte@prerescatepty.com" className="inline-flex mt-6 rounded-full bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-white/15 transition-all">Contactar soporte</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
