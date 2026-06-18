import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Política de Cancelaciones y Reembolsos — PreRescue ID",
  description: "Información sobre cancelaciones, devoluciones y reembolsos de PreRescue ID.",
  canonical: "https://www.prerescatepty.com/legal/reembolsos",
};

export default function ReembolsosPage() {
  return (
    <LegalPageLayout
      title="Política de Cancelaciones y Reembolsos"
      description="Condiciones para cancelaciones y devoluciones de productos."
      lastUpdated="Junio 2025"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <p className="text-sm font-bold text-[#DA1A21]">
          Provisional commercial wording — pending legal review
        </p>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Cancelación antes del despacho
          </h2>
          <p>
            Puedes cancelar el pedido antes de que sea entregado al
            transportista. Una vez entregado al transportista, no se puede
            cancelar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Devoluciones
          </h2>
          <p>
            Los productos sin abrir, sin usar y sin activar podrán devolverse
            dentro de los 7 días calendario posteriores a su recepción, en su
            empaque original.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Productos no retornables
          </h2>
          <p>
            Los chips activados no son reembolsables por cambio de opinión, sin
            perjuicio de la garantía aplicable por defectos de fabricación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Proceso de reembolso
          </h2>
          <p>
            Una vez recibido e inspeccionado el producto devuelto, el reembolso
            se procesa hasta 7 días hábiles. El procesador de pagos o banco
            puede demorar tiempo adicional en reflejar el reembolso en tu
            cuenta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Método de reembolso
          </h2>
          <p>
            Generalmente se procesa por el mismo método de pago original, cuando
            es operativamente posible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Garantía
          </h2>
          <p>
            Los productos con defectos de fabricación están cubiertos por la
            garantía. Consulta nuestra{" "}
            <Link
              href="/legal/garantia"
              className="text-[#DA1A21] hover:text-white underline"
            >
              política de garantía
            </Link>{" "}
            para más información.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Contacto
          </h2>
          <p>
            Para solicitar una devolución o consultar sobre reembolsos, utiliza
            nuestro{" "}
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