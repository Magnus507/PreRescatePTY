import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Política de Privacidad" };

export default function PrivacidadPage() {
  return (
    <>
      <Navbar />
      <main className="bg-slate-950 text-white">
        <section className="overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%)] py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[3rem] border border-white/10 bg-white/5 p-10 shadow-[0_40px_120px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <span className="text-sm uppercase tracking-[0.35em] text-brand font-black">Política de Privacidad</span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-white">Cómo tratamos y protegemos tus datos personales</h1>
              <p className="mt-4 max-w-2xl text-slate-300 leading-relaxed">Entiende qué información recolectamos, cómo la usamos y qué opciones tienes sobre tu perfil en PreRescue ID.</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-10 shadow-xl shadow-slate-950/30">
              <div className="space-y-6 prose prose-invert prose-sm text-slate-100 max-w-none">
                <p className="text-sm text-brand uppercase tracking-[0.35em] font-black">Versión 1.0 — Última actualización: Agosto 2026</p>

                <h2>1. Responsable del Tratamiento</h2>
                <p>PreRescate PTY, domiciliada en la República de Panamá, es responsable del tratamiento de los datos personales recopilados a través de este servicio. Esta política describe las prácticas del servicio y toma como referencia la normativa panameña aplicable en materia de protección de datos personales, incluida la Ley 81 de 26 de marzo de 2019.</p>

                <h2>2. Datos que Recopilamos</h2>
                <h3>2.1 Datos proporcionados por el usuario</h3>
                <ul>
                  <li>Nombre y apellido</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Número de teléfono</li>
                  <li>Tipo de sangre</li>
                  <li>Alergias y condiciones médicas</li>
                  <li>Medicamentos</li>
                  <li>Contactos de emergencia</li>
                </ul>
                <p><strong>Importante:</strong> Por su naturaleza, tratamos los datos médicos y de salud como información sensible y aplicamos controles adicionales de acceso, visibilidad y seguridad.</p>

                <h3>2.2 Datos recopilados automáticamente al escanear</h3>
                <ul>
                  <li>Dirección IP</li>
                  <li>User Agent (tipo de dispositivo/navegador)</li>
                  <li>Fecha y hora del escaneo</li>
                  <li>Ubicación geográfica aproximada (si el navegador lo permite)</li>
                  <li>Tipo de acceso (NFC o QR)</li>
                </ul>

                <h2>3. Finalidad del Tratamiento</h2>
                <ul>
                  <li>Mostrar información de emergencia configurada para el perfil a terceros que escaneen la identificación.</li>
                  <li>Procesar notificaciones de emergencia cuando la función correspondiente esté habilitada.</li>
                  <li>Mantener un historial de escaneos asociado al servicio.</li>
                  <li>Gestionar la cuenta del usuario y las funciones asociadas.</li>
                </ul>

                <h2>4. Consentimiento y Evidencia de Aceptación</h2>
                <p>Para completar el registro, el usuario debe aceptar los términos y la política de privacidad vigentes. El sistema conserva evidencia técnica de esa aceptación, incluyendo la versión del texto y metadatos asociados al registro.</p>
                <p>La configuración y publicación de información médica se gestiona desde las funciones del perfil. Para consultas, solicitudes de eliminación u otros asuntos relacionados con privacidad, el usuario puede utilizar los canales de contacto indicados en esta política.</p>

                <h2>5. Datos Públicos vs. Privados</h2>
                <p><strong>Datos que pueden mostrarse públicamente al escanear, según la configuración y los datos disponibles en el perfil:</strong></p>
                <ul>
                  <li>Nombre o alias visible</li>
                  <li>Tipo de sangre</li>
                  <li>Alergias críticas</li>
                  <li>Condiciones médicas relevantes</li>
                  <li>Medicamentos</li>
                  <li>Contactos de emergencia (nombre, parentesco, teléfono)</li>
                </ul>
                <p><strong>Datos de cuenta que no forman parte del perfil público en el flujo actual:</strong></p>
                <ul>
                  <li>Email del usuario</li>
                  <li>Fecha de nacimiento completa</li>
                  <li>Dirección de domicilio</li>
                  <li>Datos de pago</li>
                  <li>Historial de escaneos completo</li>
                  <li>Notas internas</li>
                </ul>

                <h2>6. Seguridad</h2>
                <p>Aplicamos medidas técnicas y organizativas orientadas a reducir el acceso no autorizado y limitar la exposición de datos, incluyendo:</p>
                <ul>
                  <li>Cifrado en tránsito (HTTPS)</li>
                  <li>Hash seguro de contraseñas</li>
                  <li>Control de acceso basado en roles</li>
                  <li>Registros de auditoría para operaciones del sistema que los generan</li>
                  <li>Cifrado y controles de acceso para campos sensibles que utilizan estas protecciones</li>
                </ul>

                <h2>7. Derechos y Solicitudes del Titular</h2>
                <p>El usuario puede contactar a PreRescate PTY para realizar solicitudes relacionadas con sus datos personales, incluyendo acceso, rectificación, eliminación, oposición o revocación cuando corresponda. Cada solicitud se gestiona según el flujo disponible y las obligaciones aplicables.</p>

                <h2>8. Retención de Datos</h2>
                <p>Los datos se conservan mientras sean necesarios para prestar el servicio y gestionar la cuenta, sujetos a los procesos de eliminación, anonimización y a las obligaciones de conservación que resulten aplicables. No prometemos un plazo uniforme de eliminación cuando existan dependencias técnicas o requisitos de retención que deban atenderse.</p>

                <h2>9. Contacto</h2>
                <p>Para consultas o solicitudes relacionadas con privacidad: <strong>privacidad@prerescatepty.com</strong></p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-8 text-slate-100 shadow-xl shadow-emerald-500/10">
              <p className="text-base font-semibold text-white">Aplicamos controles técnicos para reducir la exposición de información sensible.</p>
              <p className="mt-3 text-slate-300 leading-relaxed">Si tienes consultas sobre cómo manejamos tus datos, escribe a nuestro equipo de privacidad.</p>
              <a href="mailto:privacidad@prerescatepty.com" className="inline-flex mt-6 rounded-full bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-white/15 transition-all">Contactar privacidad</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
