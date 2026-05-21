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
              <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-white">Cómo protegemos tus datos personales</h1>
              <p className="mt-4 max-w-2xl text-slate-300 leading-relaxed">Entiende qué información recolectamos, cómo la usamos y qué derechos tienes sobre tu perfil en PreRescue ID.</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-10 shadow-xl shadow-slate-950/30">
              <div className="space-y-6 prose prose-invert prose-sm text-slate-100 max-w-none">
                <p className="text-sm text-brand uppercase tracking-[0.35em] font-black">Versión 1.0 — Última actualización: Marzo 2026</p>

                <h2>1. Responsable del Tratamiento</h2>
                <p>PreRescate PTY, domiciliada en la República de Panamá, es responsable del tratamiento de los datos personales recopilados a través de este servicio, conforme a la Ley 81 de 26 de marzo de 2019, sobre Protección de Datos Personales.</p>

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
                <p><strong>Importante:</strong> Los datos de tipo de sangre, alergias, condiciones médicas y medicamentos son considerados <strong>datos sensibles de salud</strong> conforme a la Ley 81 y las guías de ANTAI. Su tratamiento requiere consentimiento previo, expreso e irrefutable del usuario.</p>

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
                  <li>Mostrar información médica de emergencia a terceros que escaneen el chip.</li>
                  <li>Notificar a los contactos de emergencia del usuario cuando se escanee el chip.</li>
                  <li>Mantener un historial de escaneos para el usuario.</li>
                  <li>Gestión de la cuenta del usuario.</li>
                </ul>

                <h2>4. Consentimiento</h2>
                <p>Al registrarse, el usuario otorga su consentimiento expreso para el tratamiento de sus datos personales, incluyendo datos sensibles de salud. Este consentimiento queda registrado con fecha, hora, dirección IP y versión del texto aceptado, conforme exige la guía de ANTAI.</p>
                <p>El usuario puede revocar su consentimiento en cualquier momento, lo cual implicará la desactivación de su perfil público y la suspensión de los servicios asociados.</p>

                <h2>5. Datos Públicos vs. Privados</h2>
                <p><strong>Datos que SÍ se muestran públicamente al escanear:</strong></p>
                <ul>
                  <li>Nombre o alias visible</li>
                  <li>Tipo de sangre</li>
                  <li>Alergias críticas</li>
                  <li>Condiciones médicas relevantes</li>
                  <li>Medicamentos</li>
                  <li>Contactos de emergencia (nombre, parentesco, teléfono)</li>
                </ul>
                <p><strong>Datos que NUNCA se muestran públicamente:</strong></p>
                <ul>
                  <li>Email del usuario</li>
                  <li>Fecha de nacimiento completa</li>
                  <li>Dirección de domicilio</li>
                  <li>Datos de pago</li>
                  <li>Historial de escaneos completo</li>
                  <li>Notas internas</li>
                </ul>

                <h2>6. Seguridad</h2>
                <p>Implementamos medidas técnicas y organizativas para proteger los datos personales, incluyendo:</p>
                <ul>
                  <li>Cifrado en tránsito (HTTPS)</li>
                  <li>Hash seguro de contraseñas</li>
                  <li>Control de acceso basado en roles</li>
                  <li>Registros de auditoría</li>
                  <li>Copias de seguridad</li>
                </ul>

                <h2>7. Derechos del Titular</h2>
                <p>Conforme a la Ley 81, el usuario tiene derecho a:</p>
                <ul>
                  <li>Acceder a sus datos personales</li>
                  <li>Rectificar datos inexactos</li>
                  <li>Cancelar/eliminar sus datos</li>
                  <li>Oponerse al tratamiento</li>
                  <li>Portabilidad de sus datos</li>
                  <li>Revocar el consentimiento</li>
                </ul>

                <h2>8. Retención de Datos</h2>
                <p>Los datos personales se conservarán mientras la cuenta esté activa. Al solicitar la eliminación, los datos serán eliminados o anonimizados en un plazo de 30 días, salvo que exista obligación legal de retención.</p>

                <h2>9. Contacto</h2>
                <p>Para ejercer sus derechos o consultas sobre privacidad: <strong>privacidad@prerescatepty.com</strong></p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-8 text-slate-100 shadow-xl shadow-emerald-500/10">
              <p className="text-base font-semibold text-white">Protegemos tu información con los estándares más altos.</p>
              <p className="mt-3 text-slate-300 leading-relaxed">Si tienes consultas sobre cómo manejamos tus datos sensibles, escribe a nuestro equipo de privacidad.</p>
              <a href="mailto:privacidad@prerescatepty.com" className="inline-flex mt-6 rounded-full bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-white/15 transition-all">Contactar privacidad</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
