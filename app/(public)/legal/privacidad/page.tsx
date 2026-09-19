import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad — PreRescue ID",
  description: "Tratamiento de datos personales, médicos, de ubicación y comerciales en PreRescue ID.",
  canonical: "https://www.prerescatepty.com/legal/privacidad",
};

export default function PrivacidadPage() {
  return (
    <LegalPageLayout
      title="Política de Privacidad"
      description="Qué datos tratamos, para qué los usamos, cuánto tiempo los conservamos y cómo ejercer tus derechos."
      lastUpdated="Septiembre 2026 · versión 1.2"
    >
      <div className="space-y-7 text-[#A0AEC0]">
        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">1. Alcance y principios</h2>
          <p>
            PreRescatePTY trata datos personales para operar la identificación de
            emergencia, las cuentas, compras, entregas y soporte. Aplicamos
            minimización, finalidad, confidencialidad y conservación limitada. Los
            datos de salud se consideran información sensible y reciben controles
            reforzados.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">2. Datos que podemos tratar</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong className="text-[#EFF4FF]">Cuenta e identidad:</strong> nombre, correo, teléfono, identificadores internos y, si el usuario lo proporciona, documento, fecha de nacimiento, dirección y ciudad.</li>
            <li><strong className="text-[#EFF4FF]">Perfil médico y de emergencia:</strong> grupo sanguíneo, alergias, condiciones, medicamentos, notas, contactos, datos de seguro, hospital preferido, médico, necesidades de comunicación, vulnerabilidad, instrucciones o ubicación segura de retorno.</li>
            <li><strong className="text-[#EFF4FF]">Archivos:</strong> fotografía de perfil y otros archivos permitidos por el producto.</li>
            <li><strong className="text-[#EFF4FF]">Escaneos:</strong> fecha y hora, QR/NFC, IP, agente de usuario y, solo cuando el dispositivo/usuario lo permite, coordenadas, precisión, ciudad, país o dirección aproximada.</li>
            <li><strong className="text-[#EFF4FF]">Compras y logística:</strong> pedidos, productos, destinatario, teléfono, dirección, ciudad, notas de entrega, estados de despacho y entrega.</li>
            <li><strong className="text-[#EFF4FF]">Pagos y comprobantes:</strong> método, referencias, intentos/eventos del proveedor, comprobantes privados y datos necesarios para constancias o facturación.</li>
            <li><strong className="text-[#EFF4FF]">Postventa:</strong> datos necesarios para garantías, reemplazos, devoluciones e incidencias relacionadas con un pedido o identificador.</li>
            <li><strong className="text-[#EFF4FF]">Soporte:</strong> nombre, correo y contenido que el usuario envía mediante el formulario de contacto.</li>
            <li><strong className="text-[#EFF4FF]">Seguridad y telemetría:</strong> registros técnicos minimizados para autenticación, prevención de abuso, diagnóstico y seguridad.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">3. Finalidades</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Crear y proteger la cuenta.</li>
            <li>Mostrar al rescatista únicamente la información configurada para el perfil público.</li>
            <li>Registrar y mostrar al titular el historial de escaneos dentro del período de conservación.</li>
            <li>Procesar pedidos, pagos, despacho, entrega, activación y postventa.</li>
            <li>Atender solicitudes de soporte, privacidad, garantía o devolución.</li>
            <li>Prevenir abuso, investigar fallos y mantener la seguridad y disponibilidad del servicio.</li>
          </ul>
          <p className="mt-3">
            El registro de un escaneo no envía automáticamente SMS, correo ni WhatsApp
            de rescate. El contacto con familiares o responsables se inicia de forma
            deliberada mediante las acciones visibles en el perfil público.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">4. Consentimiento y evidencia</h2>
          <p>
            Al crear una cuenta personal se exige aceptar los Términos y esta Política.
            La aplicación conserva una versión del texto aceptado, fecha de aceptación
            y evidencia mínima de la operación. No conservamos la IP o el agente de
            usuario como huella de largo plazo para demostrar ese consentimiento.
          </p>
          <p className="mt-2">
            El tratamiento voluntario de información médica se basa en la decisión
            expresa del titular al registrarse y aportar esos datos. Si el titular
            desea dejar de utilizar el servicio y eliminar su información, puede
            ejecutar la eliminación de cuenta desde Configuración o solicitar ayuda
            mediante el canal de soporte. Cuando exista una obligación legal de
            conservación, solo se mantiene el registro mínimo permitido durante el
            período aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">5. Perfil público y control de visibilidad</h2>
          <p>
            Un identificador activo puede abrir un perfil público de emergencia. La
            información visible depende de los campos y controles de visibilidad
            configurados por el titular. El usuario debe evitar publicar información
            que no desee que un tercero que escanee el identificador pueda consultar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">6. Conservación</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-white/5 text-[#EFF4FF]">
                <tr>
                  <th className="p-3 text-left">Categoría</th>
                  <th className="p-3 text-left">Criterio / período operativo</th>
                  <th className="p-3 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr><td className="p-3">Cuenta, perfil médico y contactos</td><td className="p-3">Mientras la cuenta esté activa; se elimina o anonimiza al ejecutar SafeDelete.</td><td className="p-3">Prestación del servicio y control del titular.</td></tr>
                <tr><td className="p-3">Fotos y archivos personales clasificados para borrado</td><td className="p-3">Hasta reemplazo/borrado o eliminación de cuenta. Objetivo de limpieza técnica: 24 horas; fallos quedan en cola e incidente hasta resolverse.</td><td className="p-3">Operación del perfil y minimización.</td></tr>
                <tr><td className="p-3">Telemetría de escaneos y última ubicación de escaneo</td><td className="p-3">Máximo 365 días, salvo eliminación de cuenta anterior.</td><td className="p-3">Historial útil para el titular, seguridad y soporte.</td></tr>
                <tr><td className="p-3">Pedidos, despacho, garantías, devoluciones y reemplazos</td><td className="p-3">Mientras sean necesarios para la transacción, postventa y obligaciones aplicables; al borrar la cuenta se elimina PII no necesaria y se conserva solo el registro mínimo que deba mantenerse.</td><td className="p-3">Ejecución contractual, postventa y trazabilidad.</td></tr>
                <tr><td className="p-3">Comprobantes privados de pago y facturas emitidas</td><td className="p-3">Durante el período legal/comercial aplicable. Se revisan para eliminación al vencer la obligación o el hold correspondiente.</td><td className="p-3">Soporte de la transacción y obligaciones contables/fiscales.</td></tr>
                <tr><td className="p-3">Solicitudes de soporte</td><td className="p-3">Mientras el caso esté activo y, como objetivo operativo, hasta 24 meses después de su cierre salvo necesidad legal o disputa vigente.</td><td className="p-3">Continuidad de soporte y defensa de la gestión realizada.</td></tr>
                <tr><td className="p-3">Preferencia de cookies</td><td className="p-3">En el navegador hasta cambio, borrado local o nueva versión de preferencias.</td><td className="p-3">Recordar la elección del usuario.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm">
            Los períodos legales pueden variar por tipo de documento u obligación. No
            utilizamos una regla genérica de “guardar para siempre”.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">7. Proveedores e infraestructura</h2>
          <p>
            Utilizamos proveedores tecnológicos para alojamiento, base de datos,
            almacenamiento, seguridad/diagnóstico, limitación de abuso, correo
            transaccional y pagos. Entre los proveedores actualmente integrados se
            encuentran Vercel, Supabase, Sentry, Upstash y Resend; los proveedores de
            pago se utilizan únicamente cuando el método correspondiente está
            habilitado. Estos proveedores reciben solo la información necesaria para
            la función que prestan y pueden operar infraestructura fuera de Panamá.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">8. Eliminación de cuenta</h2>
          <p>
            Desde Configuración el titular puede solicitar la eliminación permanente.
            El flujo exige sesión reciente, contraseña y confirmación explícita.
            SafeDelete revoca el acceso, elimina o anonimiza los datos personales
            operativos, desvincula/desactiva los identificadores afectados y programa
            la limpieza de archivos clasificados para borrado. La evidencia
            comercial/fiscal que deba conservarse permanece privada y minimizada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">9. Derechos del titular</h2>
          <p>
            Puedes solicitar acceso, corrección, actualización, oposición o eliminación
            de tus datos conforme a la normativa aplicable. Para ejercer estos derechos
            o plantear una consulta de privacidad utiliza el{" "}
            <Link href="/contacto" className="text-[#DA1A21] hover:text-white underline">
              formulario de contacto
            </Link>. La eliminación completa de cuenta también está disponible desde el
            panel autenticado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">10. Seguridad e incidentes</h2>
          <p>
            Aplicamos controles de acceso, cifrado de secretos, sanitización de
            telemetría, aislamiento de archivos privados, autenticación y procesos de
            recuperación. Si sospechas acceso no autorizado, pérdida de credenciales o
            compromiso de un identificador, utiliza el formulario de contacto y
            selecciona/indica claramente que se trata de un incidente de seguridad.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
