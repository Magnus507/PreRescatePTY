import LegalPageLayout from "@/components/public/LegalPageLayout";
import Link from "next/link";

export const metadata = {
  title: "Política de Cookies — PreRescue ID",
  description: "Información sobre el uso de cookies y tecnologías similares en PreRescue ID.",
  canonical: "https://www.prerescatepty.com/legal/cookies",
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Política de Cookies"
      description="Cómo utilizamos cookies y tecnologías de almacenamiento local."
      lastUpdated="Junio 2025"
    >
      <div className="space-y-6 text-[#A0AEC0]">
        <p className="text-sm font-bold text-[#DA1A21]">
          Provisional commercial wording — pending legal review
        </p>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            ¿Qué son las cookies?
          </h2>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en tu
            dispositivo cuando visitas un sitio web. Se utilizan para mejorar
            la experiencia de navegación y garantizar el funcionamiento del
            sitio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Almacenamiento necesario (siempre activo)
          </h2>
          <p>Estas cookies son esenciales para el funcionamiento del sitio:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              <strong className="text-[#EFF4FF]">Cookies de autenticación:</strong>{" "}
              Mantienen tu sesión activa cuando inicias sesión.
            </li>
            <li>
              <strong className="text-[#EFF4FF]">Cookies de seguridad:</strong>{" "}
              Protegen contra ataques CSRF y otras vulnerabilidades.
            </li>
            <li>
              <strong className="text-[#EFF4FF]">
                Cookies de diagnóstico técnico:
              </strong>{" "}
              Ayudan a identificar y resolver errores del sistema.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Análisis opcionales (requieren consentimiento)
          </h2>
          <p>
            Estas cookies nos ayudan a entender cómo los visitantes interactúan
            con el sitio. Solo se cargan si aceptas las cookies opcionales.
            Puedes rechazarlas sin afectar el funcionamiento básico.
          </p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              <strong className="text-[#EFF4FF]">Vercel Analytics:</strong>{" "}
              Analítica de uso del sitio web. Se carga solo con consentimiento.
            </li>
            <li>
              <strong className="text-[#EFF4FF]">Vercel Speed Insights:</strong>{" "}
              Métricas de rendimiento del sitio. Se carga solo con consentimiento.
            </li>
            <li>
              <strong className="text-[#EFF4FF]">Sentry:</strong> Seguimiento de
              errores y diagnóstico técnico. Se carga solo con consentimiento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            No utilizamos actualmente
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Google Analytics</li>
            <li>Meta Pixel</li>
            <li>Cookies de publicidad o marketing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Tus opciones
          </h2>
          <p>Puedes elegir:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              <strong className="text-[#EFF4FF]">Aceptar opcionales:</strong>{" "}
              Aceptas cookies de análisis.
            </li>
            <li>
              <strong className="text-[#EFF4FF]">Solo necesarias:</strong>{" "}
              Rechazas cookies opcionales.
            </li>
            <li>
              <strong className="text-[#EFF4FF]">Preferencias:</strong> Puedes
              cambiar tu selección en cualquier momento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Gestión de preferencias
          </h2>
          <p>
            Puedes cambiar tus preferencias de cookies en cualquier momento
            mediante el enlace &quot;Preferencias de cookies&quot; en el pie de
            página del sitio. También puedes gestionar las cookies desde la
            configuración de tu navegador.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Retención de preferencias
          </h2>
          <p>
            Tus preferencias de cookies se almacenan localmente en tu navegador
            hasta que las borres manualmente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-[#EFF4FF] mb-3">
            Contacto
          </h2>
          <p>
            Para consultas sobre cookies o privacidad, utiliza nuestro{" "}
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