"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cpu, Users, History, User, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<{
    hasProfile: boolean;
    chipCount: number;
    contactCount: number;
    recentScans: number;
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
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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
