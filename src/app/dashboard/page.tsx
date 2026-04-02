"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cpu, Users, History, User, AlertCircle, CheckCircle, ChevronRight, Building2 } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<{
    hasProfile: boolean;
    chipCount: number;
    contactCount: number;
    recentScans: number;
    accountType?: string;
    packageName?: string;
    organizationName?: string;
  }>({ hasProfile: false, chipCount: 0, contactCount: 0, recentScans: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, chipsRes, contactsRes, scansRes] = await Promise.all([
          fetch("/api/dashboard/profile"),
          fetch("/api/dashboard/chips"),
          fetch("/api/dashboard/contacts"),
          fetch("/api/dashboard/scans"),
        ]);
        const [profileData, chipsData, contactsData, scansData] = await Promise.all([
          profileRes.json(),
          chipsRes.json(),
          contactsRes.json(),
          scansRes.json(),
        ]);

        setData({
          hasProfile: !!profileData.profile,
          chipCount: chipsData.chips?.length || 0,
          contactCount: contactsData.contacts?.length || 0,
          recentScans: scansData.scans?.length || 0,
          accountType: profileData.user?.account?.accountType,
          packageName: profileData.user?.account?.package?.name,
          organizationName: profileData.user?.account?.organizations?.[0]?.legalName,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {data.accountType && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card shadow-sm text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span>
              Cuenta: <span className="font-semibold text-primary">
                {data.accountType === "company" ? "CORPORATIVA" : 
                 data.accountType === "school" ? "COLEGIO" : "PERSONAL"}
              </span>
              {data.packageName && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  {data.packageName}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Setup checklist */}
      {(!data.hasProfile || data.chipCount === 0 || data.contactCount === 0) && (
        <div className="mb-8 p-5 rounded-2xl border border-warning/30 bg-warning/5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" /> Completa tu configuración
          </h2>
          <div className="space-y-2">
            <SetupItem done={data.hasProfile} label="Completar perfil médico" href="/dashboard/perfil" />
            <SetupItem done={data.chipCount > 0} label="Activar un chip" href="/activar" />
            <SetupItem done={data.contactCount > 0} label="Agregar contacto de emergencia" href="/dashboard/contactos" />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={User} label="Perfil Médico" value={data.hasProfile ? "Completo" : "Pendiente"} color={data.hasProfile ? "text-success" : "text-warning"} href="/dashboard/perfil" />
        <StatCard icon={Cpu} label="Chips Activos" value={String(data.chipCount)} color="text-primary" href="/dashboard/chips" />
        <StatCard icon={Users} label="Contactos" value={String(data.contactCount)} color="text-primary" href="/dashboard/contactos" />
        <StatCard icon={History} label="Escaneos" value={String(data.recentScans)} color="text-primary" href="/dashboard/historial" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/perfil" className="flex items-center justify-between p-5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all group">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <span className="font-medium">Editar Mi Perfil Médico</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <Link href="/activar" className="flex items-center justify-between p-5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all group">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-primary" />
            <span className="font-medium">Activar Nuevo Chip</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>

      {/* Upsell Logic */}
      {data.accountType !== "organization" && (
        <div className="mt-12">
          <h2 className="text-lg font-bold mb-4">Módulos Extra</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col items-start gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-bold text-lg">Módulo Empresas</h3>
                <p className="text-sm text-muted-foreground mt-1 text-balance">
                  ¿Tienes una flotilla o una compañía? Administra múltiples chips centralizando todos los perfiles de tu equipo bajo un mismo panel y facturación.
                </p>
              </div>
              <a href="https://wa.me/50767516171?text=Hola%2C%20quisiera%20cotizar%20el%20Plan%20Empresarial%20de%20PreRescate." target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex border border-primary bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition">
                Cotizar para Empresas
              </a>
            </div>
            
            <div className="p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col items-start gap-3">
              <Users className="h-8 w-8 text-indigo-500" />
              <div>
                <h3 className="font-bold text-lg text-indigo-700">Módulo Colegios / Instituciones</h3>
                <p className="text-sm text-muted-foreground mt-1 text-balance">
                  Especial para organizaciones con decenas de estudiantes o asociados, permitiendo roles granulares para administradores y representantes.
                </p>
              </div>
              <a href="https://wa.me/50767516171?text=Hola%2C%20quisiera%20cotizar%20el%20M%C3%B3dulo%20para%20Colegios%20de%20PreRescate." target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                Consultar Módulo Colegial
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupItem({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
      {done ? <CheckCircle className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-warning" />}
      <span className={done ? "line-through text-muted-foreground" : ""}>{label}</span>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, color, href }: { icon: typeof User; label: string; value: string; color: string; href: string }) {
  return (
    <Link href={href} className="p-5 rounded-xl border border-border bg-card hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </Link>
  );
}
