import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones — PreRescue ID",
  description: "Condiciones de uso, compra y alcance del servicio PreRescue ID.",
  canonical: "https://www.prerescatepty.com/legal/terminos",
};

export default function TerminosPage() {
  return (
    <LegalPageLayout
      title="Términos y Condiciones"
      description="Condiciones de uso, compra y límites del producto."
      lastUpdated="Septiembre 2026 · versión 1.2"
    >
      <div className="space-y-7 text-[#A0AEC0]">
        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">1. Qué es PreRescue ID</h2>
          <p>
            PreRescue ID combina un identificador físico QR/NFC con un perfil
            digital configurable. Su finalidad es facilitar acceso rápido a
            información que el titular decide poner a disposición ante una
            emergencia o situación de identificación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">2. No es un servicio médico ni de emergencias</h2>
          <p>
            PreRescue ID no sustituye atención médica, diagnóstico, ambulancia,
            policía, bomberos, 911 ni otros servicios oficiales. Tampoco podemos
            garantizar que una tercera persona encuentre, escanee, consulte o use la
            información del perfil en una emergencia.
          </p>
          <p className="mt-2">
            El usuario es responsable de mantener la información relevante actualizada
            y de utilizar los canales oficiales de emergencia cuando corresponda.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">3. Acceso público y contacto de rescate</h2>
          <p>
            Un identificador activo puede abrir un perfil público. La visibilidad
            depende de la configuración del titular. El sistema registra el escaneo
            conforme a la Política de Privacidad, pero actualmente no envía
            automáticamente SMS, correo electrónico ni WhatsApp de rescate. El
            rescatista utiliza de forma deliberada las acciones de llamada/WhatsApp
            disponibles cuando correspondan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">4. Servicio digital y producto físico</h2>
          <p>
            La compra personal es de pago único. El servicio digital asociado al
            identificador no vence por el paso del tiempo mientras el identificador
            permanezca activo y no haya sido revocado, sustituido o desactivado por
            una causa válida. Esta continuidad digital no extiende la garantía física
            del producto.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">5. Cuenta y seguridad</h2>
          <p>
            Debes proporcionar información de cuenta veraz, proteger tus credenciales
            y avisarnos si sospechas acceso no autorizado. Podemos suspender funciones
            cuando sea necesario para proteger al titular, investigar abuso o cumplir
            una obligación aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">6. Datos personales y médicos</h2>
          <p>
            El tratamiento de datos se describe en la{" "}
            <Link href="/legal/privacidad" className="text-[#DA1A21] hover:text-white underline">
              Política de Privacidad
            </Link>. La cuenta permite corregir datos y eliminarla mediante un flujo
            protegido. Parte de la evidencia comercial o fiscal puede mantenerse
            privada y minimizada cuando exista una obligación válida de conservación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">7. Pedidos y pagos</h2>
          <p>
            Los precios del producto se muestran antes de crear el pedido. Los métodos
            de pago disponibles dependen de la configuración vigente. Un pedido no se
            considera pagado hasta que el sistema/proveedor o la revisión administrativa
            correspondiente confirme el pago.
          </p>
          <p className="mt-2">
            El total de producto mostrado en el checkout no incluye un cargo de
            transporte que no esté expresamente indicado. Si existe un cargo de
            entrega, se comunica y acepta antes del despacho conforme a la{" "}
            <Link href="/legal/envios" className="text-[#DA1A21] hover:text-white underline">
              Política de Envíos
            </Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">8. Cancelaciones, devoluciones y garantía</h2>
          <p>
            Las reglas operativas están publicadas en la{" "}
            <Link href="/legal/reembolsos" className="text-[#DA1A21] hover:text-white underline">
              Política de Reembolsos y Cancelaciones
            </Link>{" "}
            y en{" "}
            <Link href="/legal/garantia" className="text-[#DA1A21] hover:text-white underline">
              Garantía y Reemplazos
            </Link>. Ninguna condición contractual pretende excluir derechos
            irrenunciables que correspondan al consumidor conforme a la normativa
            aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">9. Soluciones para organizaciones</h2>
          <p>
            Las opciones corporativas que aparecen públicamente se ofrecen mediante
            solicitud de información y coordinación con PreRescatePTY. La página
            pública no constituye un checkout corporativo automático. La incorporación
            de miembros y el tratamiento de datos de una organización están sujetos a
            la configuración, permisos y acuerdos aplicables al caso.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">10. Documentos de compra y facturación</h2>
          <p>
            Los estados, constancias o comprobantes internos mostrados por la
            plataforma sirven para la operación del pedido y no deben confundirse por
            sí solos con una factura fiscal autorizada. Cuando corresponda emitir un
            documento fiscal, PreRescatePTY deberá utilizar el mecanismo permitido por
            la autoridad tributaria aplicable al operador comercial.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">11. Disponibilidad y cambios</h2>
          <p>
            Podemos realizar mantenimiento, correcciones de seguridad y cambios
            razonables en el servicio. Los cambios materiales de estos Términos o de
            la Política de Privacidad se versionarán. Cuando una nueva aceptación sea
            necesaria para continuar una relación comercial, se solicitará antes de
            la operación correspondiente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">12. Contacto</h2>
          <p>
            Para soporte, incidentes, privacidad o asuntos comerciales utiliza el{" "}
            <Link href="/contacto" className="text-[#DA1A21] hover:text-white underline">
              formulario de contacto
            </Link>.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
