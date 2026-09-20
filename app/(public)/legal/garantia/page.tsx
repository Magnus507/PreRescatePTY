import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Garantía y Reemplazos — PreRescue ID",
  description: "Cobertura de garantía física, evaluación y reemplazos de PreRescue ID.",
  canonical: "https://www.prerescatepty.com/legal/garantia",
};

export default function GarantiaPage() {
  return (
    <LegalPageLayout
      title="Garantía y Reemplazos"
      description="Cobertura del producto físico y proceso de postventa."
      lastUpdated="Septiembre 2026 · versión 1.2"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">1. Garantía comercial del producto físico</h2>
          <p>
            PreRescatePTY ofrece una garantía comercial de 1 año desde la entrega
            para defectos de fabricación del identificador físico. La vigencia anual
            de administración de la cuenta es independiente de esa garantía. Aunque
            la administración venza, el QR/NFC y la ficha pública de rescate de un
            identificador activo continúan disponibles. Esta regla no limita garantías
            legales obligatorias que puedan corresponder.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">2. Qué puede estar cubierto</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Defectos de fabricación que impidan el uso normal del QR o NFC.</li>
            <li>Fallas físicas no atribuibles a uso incorrecto, modificación o daño externo.</li>
            <li>Producto incorrecto o defecto confirmado durante la evaluación de postventa.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">3. Exclusiones comerciales</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Pérdida o robo.</li>
            <li>Daños intencionales, modificación no autorizada o uso contrario a las instrucciones.</li>
            <li>Desgaste o daño externo que no corresponda a un defecto de fabricación.</li>
          </ul>
          <p className="mt-2">
            Las exclusiones anteriores no se aplican para eliminar derechos que la
            legislación obligatoria reconozca al consumidor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">4. Cómo abrir una reclamación</h2>
          <p>
            Utiliza el{" "}
            <Link href="/contacto" className="text-[#DA1A21] hover:text-white underline">
              formulario de contacto
            </Link>{" "}
            e indica el número de pedido o identificador, una descripción del problema
            y, cuando sea útil, evidencia del defecto. Soporte registra el caso antes
            de solicitar el envío o devolución física del producto.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">5. Evaluación y resolución</h2>
          <p>
            Al recibir la información o el producto, según el caso, el equipo de
            postventa evalúa la reclamación y registra la decisión. Cuando el defecto
            esté cubierto se gestiona reparación, reemplazo, devolución de dinero u
            otra solución apropiada conforme a la naturaleza del defecto y a los
            derechos aplicables.
          </p>
          <p className="mt-2">
            El objetivo operativo es acusar recibo del caso dentro de 2 días hábiles y
            comunicar el siguiente paso o la necesidad de evidencia adicional dentro
            de 5 días hábiles. Los tiempos de transporte se suman cuando sea necesario
            recibir físicamente el producto.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">6. Reemplazo de un identificador vinculado</h2>
          <p>
            Si un identificador debe reemplazarse, el equipo verifica la identidad y
            titularidad antes de transferir la relación al nuevo dispositivo. El
            identificador anterior se revoca o desactiva para evitar que continúe
            exponiendo el perfil. Un reemplazo cubierto por garantía conserva la
            relación operativa correspondiente, pero no añade automáticamente otros
            12 meses de administración.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">7. Producto perdido o daño no cubierto</h2>
          <p>
            Cuando no exista cobertura de garantía, el titular puede solicitar una
            opción de reemplazo al precio y condiciones vigentes. El proceso conserva
            la regla de revocar el identificador anterior antes de activar el nuevo.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
