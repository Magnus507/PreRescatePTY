import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Reembolsos y Cancelaciones — PreRescue ID",
  description: "Condiciones operativas de cancelación, devolución y reembolso.",
  canonical: "https://www.prerescatepty.com/legal/reembolsos",
};

export default function ReembolsosPage() {
  return (
    <LegalPageLayout
      title="Reembolsos y Cancelaciones"
      description="Cuándo puedes cancelar, devolver un producto y cómo se procesa un reembolso."
      lastUpdated="Septiembre 2026 · versión 1.2"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">1. Cancelación antes del despacho</h2>
          <p>
            Puedes solicitar la cancelación mientras el pedido todavía no haya sido
            entregado al transportista. Cuando la interfaz del pedido permita
            cancelarlo directamente, esa acción actualiza el estado del pedido.
            También puedes contactar soporte e indicar el número de pedido.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">2. Después del despacho</h2>
          <p>
            Una vez entregado el paquete al transportista, el pedido ya no se trata
            como cancelación previa al despacho. Si corresponde una devolución,
            garantía o incidente de transporte, se procesa por el flujo aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">3. Devolución por cambio de decisión</h2>
          <p>
            Como política comercial interna, puedes solicitar la devolución de un
            producto físico no usado, no activado y en condición apta para reventa
            dentro de los 7 días calendario siguientes a la entrega. Soporte debe
            autorizar el caso e indicar las instrucciones de devolución antes de que
            envíes el producto.
          </p>
          <p className="mt-2">
            Salvo que corresponda un derecho obligatorio distinto, el costo de una
            devolución por cambio de decisión corre por cuenta del cliente. Si el
            producto recibido es incorrecto, llega dañado por una causa atribuible a
            la entrega contratada o presenta un defecto cubierto, se aplica la solución
            correspondiente sin trasladar al cliente un costo que legalmente deba asumir
            el proveedor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">4. Identificadores activados</h2>
          <p>
            Por seguridad y por la vinculación del identificador con un perfil, un
            producto ya activado no se acepta como devolución por simple cambio de
            decisión. Esto no elimina la cobertura de garantía por defecto ni los
            derechos obligatorios del consumidor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">5. Inspección y reembolso</h2>
          <p>
            Al recibir una devolución autorizada se registra e inspecciona el producto.
            Cuando proceda reembolso, el objetivo operativo es iniciar la devolución
            del dinero dentro de 7 días hábiles después de aprobar la inspección. El
            banco o proveedor de pago puede requerir tiempo adicional para reflejarlo.
          </p>
          <p className="mt-2">
            El reembolso se intenta por el método original cuando sea técnicamente
            posible. Si no lo es, soporte coordina un método trazable alternativo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">6. Cómo abrir un caso</h2>
          <p>
            Usa el{" "}
            <Link href="/contacto" className="text-[#DA1A21] hover:text-white underline">
              formulario de contacto
            </Link>{" "}
            e incluye el número de pedido, motivo y una descripción suficiente. No
            envíes físicamente un producto hasta recibir instrucciones del caso.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">7. Derechos del consumidor</h2>
          <p>
            Esta política describe el proceso operativo de PreRescatePTY y no pretende
            reducir ni excluir derechos irrenunciables establecidos por la legislación
            de protección al consumidor aplicable en Panamá.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
