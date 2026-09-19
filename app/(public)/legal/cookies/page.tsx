import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Política de Cookies — PreRescue ID",
  description: "Información sobre cookies, almacenamiento local y telemetría técnica de PreRescue ID.",
  canonical: "https://www.prerescatepty.com/legal/cookies",
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Política de Cookies"
      description="Cómo utilizamos cookies, almacenamiento local y herramientas técnicas."
      lastUpdated="Septiembre 2026"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">1. Almacenamiento necesario</h2>
          <p>
            Utilizamos cookies y mecanismos de almacenamiento estrictamente necesarios
            para autenticación, seguridad, preferencias esenciales y funcionamiento del
            servicio. Estos elementos no se desactivan desde el panel de preferencias
            porque sin ellos algunas funciones no operarían correctamente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">2. Diagnóstico técnico y seguridad</h2>
          <p>
            Sentry se utiliza como herramienta de diagnóstico técnico y seguridad para
            detectar errores de la aplicación. Su configuración está separada de la
            analítica opcional, aplica sanitización de telemetría y no utiliza
            grabaciones de sesión en la superficie que maneja información médica.
          </p>
          <p className="mt-2">
            Este diagnóstico no se presenta como publicidad ni como medición comercial
            opcional. La información enviada se limita conforme a nuestras medidas de
            minimización y a la{" "}
            <Link href="/legal/privacidad" className="text-[#DA1A21] hover:text-white underline">
              Política de Privacidad
            </Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">3. Analítica opcional</h2>
          <p>
            Vercel Analytics y Vercel Speed Insights solo se cargan en el navegador
            cuando aceptas la categoría opcional de análisis. Puedes rechazarlos sin
            afectar las funciones esenciales del servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">4. Tecnologías que no usamos actualmente para marketing</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Google Analytics</li>
            <li>Meta Pixel</li>
            <li>Cookies de publicidad comportamental</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">5. Tus opciones</h2>
          <p>
            El banner permite aceptar la analítica opcional, mantener solo lo necesario
            o abrir las preferencias. También puedes volver a abrir las preferencias
            desde el pie de página.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">6. Retención de preferencias</h2>
          <p>
            La selección de cookies se guarda localmente en tu navegador hasta que la
            cambies, borres el almacenamiento local o cambie la versión de preferencias
            que requiera una nueva decisión.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">7. Contacto</h2>
          <p>
            Para consultas sobre cookies o privacidad utiliza nuestro{" "}
            <Link href="/contacto" className="text-[#DA1A21] hover:text-white underline">
              formulario de contacto
            </Link>.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
