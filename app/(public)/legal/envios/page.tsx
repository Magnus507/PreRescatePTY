import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Política de Envíos — PreRescue ID",
  description: "Información sobre envíos, entregas y cobertura de PreRescue ID en Panamá.",
  canonical: "https://www.prerescatepty.com/legal/envios",
};

export default function EnviosPage() {
  return (
    <LegalPageLayout
      title="Política de Envíos"
      description="Información sobre entregas, costos y plazos."
      lastUpdated="Junio 2025"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <p className="text-sm font-bold text-[#DA1A21]">
          Provisional commercial wording — pending legal review
        </p>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Alcance de entregas
          </h2>
          <p>
            Realizamos entregas dentro de Panamá, sujetas a la cobertura del
            transportista. El costo y plazo estimado se informan antes de
            confirmar el pedido.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Costo de envío
          </h2>
          <p>
            El costo de entrega se informará antes de confirmar el pedido. No
            ofrecemos envío gratuito garantizado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Plazos de despacho y entrega
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-[#EFF4FF]">Despacho:</strong> 1 a 3 días
              hábiles después de la confirmación del pago.
            </li>
            <li>
              <strong className="text-[#EFF4FF]">Entrega:</strong> 1 a 5 días
              hábiles después del despacho, según destino y transportista.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Seguimiento
          </h2>
          <p>
            Se entrega número de seguimiento solo cuando el transportista lo
            proporciona. No garantizamos seguimiento en todos los envíos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Dirección de entrega
          </h2>
          <p>
            El cliente es responsable de proporcionar una dirección correcta y
            completa al momento del pedido. Verifica que la información sea
            precisa antes de confirmar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Paquetes perdidos o dañados
          </h2>
          <p>
            Si un paquete se pierde o llega dañado durante el transporte,
            revisaremos el caso y, una vez confirmado, enviaremos un reemplazo.
            El incidente debe verificarse con el cliente y el transportista.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Retiro presencial
          </h2>
          <p>
            Actualmente no ofrecemos retiro presencial. Todos los pedidos se
            entregan a través de transportistas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Envíos internacionales
          </h2>
          <p>
            Actualmente no realizamos envíos internacionales. Esta política
            aplica únicamente a entregas dentro de Panamá.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Contacto
          </h2>
          <p>
            Para consultas sobre envíos, utiliza nuestro{" "}
            <Link
              href="/contacto"
              className="text-[#DA1A21] hover:text-white underline"
            >
              formulario de contacto
            </Link>
            .
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}