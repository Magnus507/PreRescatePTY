import { Building2 } from "lucide-react";

export default function EmpresasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Empresas</h1>
          <p className="text-muted-foreground">Administre stickers corporativos y personal.</p>
        </div>
      </div>
      <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
        <h2 className="text-xl font-semibold mb-2">Módulo en Desarrollo</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Esta función está en fase de prueba. Pronto podrá asignar, monitorear y gestionar identificaciones de emergencia para toda la plantilla de su empresa desde aquí.
        </p>
      </div>
    </div>
  );
}
