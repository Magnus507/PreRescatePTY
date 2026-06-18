import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Garantía y Reemplazos — PreRescue ID",
  description: "Información sobre garantía de fábrica y reemplazos de chips PreRescue ID.",
  canonical: "https://www.prerescatepty.com/legal/garantia",
};

export default function GarantiaPage() {
  return (
    <LegalPageLayout
      title="Garantía y Reemplazos"
      description="Cobertura de garantía y procedimientos para chips defectuosos, perdidos o dañados."
      lastUpdated="Junio 2025"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <p className="text-sm font-bold text-[#DA1A21]">
          Provisional commercial wording — pending legal review
        </p>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Garantía de fábrica
          </h2>
          <p>
            El producto cuenta con garantía de un año por defectos de fabricación
            desde la fecha de entrega.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Defectos cubiertos
          </h2>
          <p>La garantía cubre defectos de fabricación, incluyendo:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              NFC ilegible por defecto de fabricación
            </li>
            <li>
              Código QR ilegible por defecto de impresión presente desde la
              entrega
            </li>
            <li>
              Defectos de material o fabricación presentes al recibir el
              producto
            </li>
            <li>
              Fallo del adhesivo en el primer uso cuando se siguieron las
              instrucciones de aplicación
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Exclusiones
          </h2>
          <p>La garantía no cubre:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>Pérdida o robo</li>
            <li>Cortes, perforaciones o rasguños</li>
            <li>Daños por impacto</li>
            <li>
              Exposición a calor extremo, fuego o químicos
            </li>
            <li>Exposición a humedad inadecuada</li>
            <li>Instalación incorrecta</li>
            <li>
              Aplicación sobre superficies sucias, húmedas, porosas o no aptas
            </li>
            <li>Manipulación o alteración</li>
            <li>Reprogramación o reimpresión del QR</li>
            <li>Uso inadecuado</li>
            <li>Desgaste normal</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Proceso de garantía
          </h2>
          <p>
            En caso de una falla cubierta, evaluaremos el producto y
            gestionaremos su reemplazo o la solución correspondiente. No
            promovemos la reparación como única opción.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Chips perdidos o dañados (no cubiertos por garantía)
          </h2>
          <p>
            Los chips perdidos o dañados por causas no cubiertas por la
            garantía deben adquirirse al precio vigente del chip adicional o de
            reemplazo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Transferencia de perfil
          </h2>
          <p>
            El perfil médico puede transferirse a un chip nuevo después de
            verificar la identidad del titular y desactivar el chip anterior.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Contacto
          </h2>
          <p>
            Para solicitar una revisión por garantía o consultar sobre
            reemplazos, utiliza nuestro{" "}
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