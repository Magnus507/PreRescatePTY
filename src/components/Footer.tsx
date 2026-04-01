import Link from "next/link";
import { Shield, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold">
                Pre<span className="text-primary">Rescate</span>
                <span className="text-xs font-medium text-muted-foreground ml-0.5">PTY</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sistema panameño de identificación de emergencia para motociclistas. Tu información vital, siempre accesible.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Producto</h3>
            <ul className="space-y-2">
              <li><Link href="/como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cómo Funciona</Link></li>
              <li><Link href="/comprar" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Comprar</Link></li>
              <li><Link href="/activar" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Activar Mi Chip</Link></li>
              <li><Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preguntas Frecuentes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Soporte</h3>
            <ul className="space-y-2">
              <li><Link href="/contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contacto</Link></li>
              <li><Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ayuda</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/legal/terminos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Términos y Condiciones</Link></li>
              <li><Link href="/legal/privacidad" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Política de Privacidad</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PreRescate PTY. Todos los derechos reservados. Panamá.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Hecho con <Heart className="h-3 w-3 text-emergency fill-emergency" /> para salvar vidas
          </p>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-xs text-center text-muted-foreground">
            ⚠️ PreRescate PTY es una herramienta de identificación de emergencia. <strong>No reemplaza al 911 ni a los servicios médicos profesionales.</strong> En caso de emergencia, llame al 911 inmediatamente.
          </p>
        </div>
      </div>
    </footer>
  );
}
