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
      description="Cobertura, costos, despacho y entrega."
      lastUpdated="Septiembre 2026 · versión 1.2"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">1. Cobertura</h2>
          <p>
            Realizamos entregas dentro de Panamá, sujetas a la cobertura y
            condiciones del transportista. Actualmente no ofrecemos envíos
            internacionales ni retiro presencial como modalidad estándar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">2. Precio del producto y costo de entrega</h2>
          <p>
            El total mostrado al crear el pedido corresponde al producto. La
            plataforma no añade automáticamente un cargo de entrega a ese total.
            Si el transportista genera un costo adicional, PreRescatePTY lo
            comunicará antes del despacho y solicitará la aceptación del cliente
            antes de aplicar dicho cargo.
          </p>
          <p className="mt-2">
            Si el cliente no acepta un cargo de entrega adicional antes de que el
            pedido sea entregado al transportista, podrá solicitar la cancelación
            conforme a la Política de Reembolsos y Cancelaciones.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">3. Plazos operativos</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong className="text-[#EFF4FF]">Preparación/despacho:</strong> objetivo de 1 a 3 días hábiles después de confirmar el pago, salvo producto en producción/backorder o incidencia informada al cliente.</li>
            <li><strong className="text-[#EFF4FF]">Entrega:</strong> referencia de 1 a 5 días hábiles después del despacho, dependiendo de destino y transportista.</li>
          </ul>
          <p className="mt-2">
            Estos plazos son estimados operativos y no constituyen una garantía
            absoluta frente a eventos del transportista o causas fuera de control
            razonable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">4. Seguimiento y evidencia de entrega</h2>
          <p>
            Se proporciona número de seguimiento cuando el transportista lo ofrece.
            El sistema mantiene el estado operativo del despacho y la confirmación de
            entrega cuando dicha evidencia está disponible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">5. Dirección</h2>
          <p>
            El cliente debe proporcionar una dirección, ciudad/área y teléfono de
            contacto correctos. Antes del despacho, soporte podrá solicitar
            aclaraciones si los datos no permiten coordinar la entrega.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">6. Pérdida o daño durante transporte</h2>
          <p>
            Si un paquete se pierde o llega dañado, abre un caso mediante el
            formulario de contacto. Revisaremos el pedido y la evidencia disponible
            con el transportista. Cuando el incidente sea confirmado y corresponda a
            PreRescatePTY o al transporte contratado para la entrega, se gestionará
            reposición o la solución aplicable sin limitar los derechos obligatorios
            del consumidor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">7. Contacto</h2>
          <p>
            Para coordinación de entrega utiliza nuestro{" "}
            <Link href="/contacto" className="text-[#DA1A21] hover:text-white underline">
              formulario de contacto
            </Link>{" "}
            e incluye el número de pedido cuando lo tengas.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
