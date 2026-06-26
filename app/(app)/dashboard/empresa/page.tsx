"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Loader2, Building2, UsersRound,
  Clock, CheckCircle2, XCircle, UserPlus, UserCheck, UserX, UserMinus,
  Package, ShoppingCart, ArrowRight, AlertTriangle,
  LayoutDashboard, TrendingUp
} from "lucide-react";

// Types
type MemberProfile = {
  firstName?: string;
  lastName?: string;
  user?: { email?: string } | null;
};

type CorporateMember = {
  id: string;
  corporateStatus?: string | null;
  profile?: MemberProfile | null;
  employeePosition?: string | null;
  employeeDepartment?: string | null;
  employeeNationalId?: string | null;
};

type CompanyRequestItem = {
  id: string;
  quantity: number;
  subtotal?: number;
  product?: { name?: string };
};

type CompanyRequest = {
  id: string;
  status: string;
  createdAt?: string;
  items?: CompanyRequestItem[];
  organizationMember?: {
    profile?: MemberProfile | null;
    employeePosition?: string | null;
    employeeDepartment?: string | null;
  };
};

type CorporateOrder = {
  id: string;
  paymentStatus?: string;
  adminReviewStatus?: string;
  orderNumber?: string;
  amount?: number;
  createdAt?: string;
};

type StatusCounts = {
  total: number;
  pending: number;
  approved: number;
  active: number;
  suspended: number;
  rejected: number;
  archived: number;
};

type RequestCounts = {
  pending: number;
  approved: number;
  paymentReview: number;
  rejected: number;
};

type OrderCounts = {
  inReview: number;
  approved: number;
  rejected: number;
};

function getHealthColor(health: number): string {
  if (health >= 70) return "bg-emerald-500";
  if (health >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function getHealthText(health: number): string {
  if (health >= 70) return "Saludable";
  if (health >= 40) return "En riesgo";
  return "Crítica";
}

function getHealthTextColor(health: number): string {
  if (health >= 70) return "text-emerald-700";
  if (health >= 40) return "text-amber-700";
  return "text-rose-700";
}

function getHealthBg(health: number): string {
  if (health >= 70) return "bg-emerald-50 border-emerald-200";
  if (health >= 40) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
}

const STATUS_LABELS: Record<string, string> = {
  pending_company_approval: "Pendiente",
  approved_pending_payment: "Aprobada",
  payment_under_review: "Pago en revisión",
  paid_approved: "Pagada / aprobada",
  rejected_by_company: "Rechazada",
};

const STATUS_COLORS: Record<string, string> = {
  pending_company_approval: "bg-amber-100 text-amber-700 border-amber-200",
  approved_pending_payment: "bg-blue-100 text-blue-700 border-blue-200",
  payment_under_review: "bg-indigo-100 text-indigo-700 border-indigo-200",
  paid_approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected_by_company: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function EmpresaDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<CorporateMember[]>([]);
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [orders, setOrders] = useState<CorporateOrder[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [membersRes, requestsRes, ordersRes] = await Promise.all([
          fetch("/api/organizations/members"),
          fetch("/api/organizations/product-requests"),
          fetch("/api/organizations/corporate-orders"),
        ]);

        if (!membersRes.ok && !requestsRes.ok && !ordersRes.ok) {
          throw new Error("Error al cargar datos del dashboard");
        }

        if (membersRes.ok) {
          const membersJson = await membersRes.json();
          setMembers(membersJson.members || []);
        }
        if (requestsRes.ok) {
          const requestsJson = await requestsRes.json();
          setRequests(requestsJson.requests || []);
        }
        if (ordersRes.ok) {
          const ordersJson = await ordersRes.json();
          setOrders(ordersJson.orders || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error de conexión");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const memberCounts: StatusCounts = useMemo(() => {
    const total = members.length;
    const pending = members.filter((m) => m.corporateStatus === "pending_company_review").length;
    const approved = members.filter((m) => m.corporateStatus === "approved_unpaid").length;
    const active = members.filter((m) => m.corporateStatus === "paid_active").length;
    const suspended = members.filter((m) => m.corporateStatus === "suspended").length;
    const rejected = members.filter((m) => m.corporateStatus === "rejected_by_company").length;
    const archived = members.filter((m) => m.corporateStatus === "archived").length;
    return { total, pending, approved, active, suspended, rejected, archived };
  }, [members]);

  const requestCounts: RequestCounts = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending_company_approval").length;
    const approved = requests.filter((r) => r.status === "approved_pending_payment").length;
    const paymentReview = requests.filter((r) => r.status === "payment_under_review").length;
    const rejected = requests.filter((r) => r.status === "rejected_by_company").length;
    return { pending, approved, paymentReview, rejected };
  }, [requests]);

  const orderCounts: OrderCounts = useMemo(() => {
    const inReview = orders.filter((o) => o.paymentStatus === "under_review" || o.adminReviewStatus === "pending").length;
    const approved = orders.filter((o) => o.adminReviewStatus === "approved").length;
    const rejected = orders.filter((o) => o.paymentStatus === "rejected").length;
    return { inReview, approved, rejected };
  }, [orders]);

  const programHealth = useMemo(() => {
    const nonArchived = memberCounts.total - memberCounts.archived;
    if (nonArchived === 0) return null;
    return Math.round((memberCounts.active / nonArchived) * 100);
  }, [memberCounts]);

  const recentActivity = useMemo(() => {
    const activities: { id: string; type: "request" | "order" | "member"; date: number; title: string; description: string; status: string; statusColor: string; icon: React.ElementType; iconColor: string }[] = [];

    requests.forEach((r) => {
      if (r.createdAt) {
        const member = r.organizationMember;
        const name = member?.profile ? `${member.profile.firstName || ""} ${member.profile.lastName || ""}`.trim() : "—";
        const productNames = (r.items || []).map((i) => i.product?.name || "Producto").join(", ");
        activities.push({
          id: r.id,
          type: "request",
          date: new Date(r.createdAt).getTime(),
          title: "Nueva solicitud",
          description: `${name} solicitó ${productNames || "productos"}`,
          status: STATUS_LABELS[r.status] || r.status,
          statusColor: STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600 border-slate-200",
          icon: Package,
          iconColor: "text-amber-500",
        });
      }
    });

    orders.forEach((o) => {
      if (o.createdAt) {
        const orderStatus =
          o.adminReviewStatus === "approved"
            ? { label: "Aprobado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
            : o.paymentStatus === "rejected"
            ? { label: "Rechazado", color: "bg-rose-100 text-rose-700 border-rose-200" }
            : { label: "En revisión", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
        activities.push({
          id: o.id,
          type: "order",
          date: new Date(o.createdAt).getTime(),
          title: `Pedido #${o.orderNumber || "—"}`,
          description: `Monto: $${o.amount?.toFixed(2) || "0.00"}`,
          status: orderStatus.label,
          statusColor: orderStatus.color,
          icon: ShoppingCart,
          iconColor: "text-blue-500",
        });
      }
    });

    members.forEach((m) => {
      const memberName = m.profile ? `${m.profile.firstName || ""} ${m.profile.lastName || ""}`.trim() : "—";
      const statusMap: Record<string, { label: string; icon: React.ElementType; color: string }> = {
        pending_company_approval: { label: "Pendiente de aprobación", icon: UserPlus, color: "text-amber-500" },
        approved_unpaid: { label: "Aprobado sin pagar", icon: UserCheck, color: "text-blue-500" },
        paid_active: { label: "Colaborador activado", icon: UserCheck, color: "text-emerald-500" },
        suspended: { label: "Suspendido", icon: UserMinus, color: "text-red-500" },
        rejected_by_company: { label: "Rechazado", icon: UserX, color: "text-rose-500" },
        archived: { label: "Archivado", icon: UserMinus, color: "text-slate-500" },
      };
      const statusInfo = statusMap[m.corporateStatus || ""];
      if (statusInfo) {
        activities.push({
          id: m.id,
          type: "member",
          date: Date.now(),
          title: memberName,
          description: statusInfo.label,
          status: statusInfo.label,
          statusColor: "bg-slate-100 text-slate-600 border-slate-200",
          icon: statusInfo.icon,
          iconColor: statusInfo.color,
        });
      }
    });

    return activities
      .sort((a, b) => b.date - a.date)
      .slice(0, 15);
  }, [requests, orders, members]);

  const getTimeLabel = (date: number): string => {
    const now = new Date();
    const diff = now.getTime() - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    return new Date(date).toLocaleDateString("es-PA", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <p className="font-black text-lg text-rose-800 mb-1">Error al cargar el dashboard</p>
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <LayoutDashboard className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Dashboard Empresarial</h1>
          <p className="text-sm text-muted-foreground">Resumen operativo del programa PreRescue</p>
        </div>
      </div>

      {/* Empty state */}
      {memberCounts.total === 0 && requestCounts.pending === 0 && orderCounts.inReview === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Building2 className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-slate-700 mb-1">Sin datos disponibles</p>
          <p className="text-sm text-muted-foreground">
            Aún no hay colaboradores, solicitudes o pedidos registrados.
          </p>
        </div>
      ) : (
        <>
          {/* Program Health */}
          <div className={`rounded-2xl border-2 p-6 ${programHealth !== null ? getHealthBg(programHealth) : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white ${
                  programHealth !== null ? getHealthColor(programHealth) : "bg-slate-400"
                }`}>
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Salud del Programa</p>
                  {programHealth !== null ? (
                    <p className={`text-2xl font-black ${getHealthTextColor(programHealth)}`}>
                      {getHealthText(programHealth)} ({programHealth}%)
                    </p>
                  ) : (
                    <p className="text-lg font-black text-slate-600">Sin datos suficientes</p>
                  )}
                </div>
              </div>
              {programHealth !== null && (
                <div className="w-24 h-24 relative">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2"
                      className="text-slate-200" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeDasharray={`${programHealth} ${100 - programHealth}`}
                      strokeLinecap="round"
                      className={
                        programHealth >= 70 ? "text-emerald-500" :
                        programHealth >= 40 ? "text-amber-500" : "text-rose-500"
                      }
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-lg font-black ${
                    programHealth >= 70 ? "text-emerald-700" :
                    programHealth >= 40 ? "text-amber-700" : "text-rose-700"
                  }`}>
                    {programHealth}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* KPIs - Members */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <UsersRound className="h-4 w-4" /> Colaboradores
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
                <p className="text-2xl font-black text-slate-900">{memberCounts.total}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pendientes</p>
                <p className="text-2xl font-black text-amber-900">{memberCounts.pending}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Aprobados</p>
                <p className="text-2xl font-black text-blue-900">{memberCounts.approved}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Activos</p>
                <p className="text-2xl font-black text-emerald-900">{memberCounts.active}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Rechazados</p>
                <p className="text-2xl font-black text-rose-900">{memberCounts.rejected}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Suspendidos</p>
                <p className="text-2xl font-black text-red-900">{memberCounts.suspended}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Archivados</p>
                <p className="text-2xl font-black text-slate-700">{memberCounts.archived}</p>
              </div>
            </div>
          </div>

          {/* KPIs - Requests */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" /> Solicitudes de Productos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pendientes</p>
                <p className="text-2xl font-black text-amber-900">{requestCounts.pending}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Aprobadas</p>
                <p className="text-2xl font-black text-blue-900">{requestCounts.approved}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">En revisión</p>
                <p className="text-2xl font-black text-indigo-900">{requestCounts.paymentReview}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Rechazadas</p>
                <p className="text-2xl font-black text-rose-900">{requestCounts.rejected}</p>
              </div>
            </div>
          </div>

          {/* KPIs - Orders */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Pedidos Corporativos
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">En revisión</p>
                <p className="text-2xl font-black text-indigo-900">{orderCounts.inReview}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Aprobados</p>
                <p className="text-2xl font-black text-emerald-900">{orderCounts.approved}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1">
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Rechazados</p>
                <p className="text-2xl font-black text-rose-900">{orderCounts.rejected}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ArrowRight className="h-4 w-4" /> Acciones Rápidas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link
                href="/dashboard/colaboradores"
                className="rounded-xl border border-indigo-200 bg-white p-4 hover:bg-indigo-50 hover:border-indigo-300 transition-all space-y-2 group"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <UsersRound className="h-5 w-5" />
                </div>
                <p className="font-bold text-sm text-slate-900">Ver Colaboradores</p>
                <p className="text-[10px] text-muted-foreground">Gestiona miembros y solicitudes</p>
              </Link>
              <Link
                href="/dashboard/empresa-perfil"
                className="rounded-xl border border-emerald-200 bg-white p-4 hover:bg-emerald-50 hover:border-emerald-300 transition-all space-y-2 group"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="font-bold text-sm text-slate-900">Perfil Empresarial</p>
                <p className="text-[10px] text-muted-foreground">Configura tu empresa</p>
              </Link>
              <Link
                href="/dashboard/empresas"
                className="rounded-xl border border-amber-200 bg-white p-4 hover:bg-amber-50 hover:border-amber-300 transition-all space-y-2 group"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
                <p className="font-bold text-sm text-slate-900">Gestionar Solicitudes</p>
                <p className="text-[10px] text-muted-foreground">Revisa y aprueba productos</p>
              </Link>
              <Link
                href="/dashboard/empresas"
                className="rounded-xl border border-blue-200 bg-white p-4 hover:bg-blue-50 hover:border-blue-300 transition-all space-y-2 group"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <p className="font-bold text-sm text-slate-900">Ver Pedidos</p>
                <p className="text-[10px] text-muted-foreground">Seguimiento de compras</p>
              </Link>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          {recentActivity.length > 0 ? (
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Actividad Reciente
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={`${activity.type}-${activity.id}`} className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 ${activity.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{activity.title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${activity.statusColor} shrink-0`}>
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1">{activity.description}</p>
                        <p className="text-[9px] text-muted-foreground/70">{getTimeLabel(activity.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No existe actividad reciente</p>
              <p className="text-[10px] text-muted-foreground">Las acciones de colaboradores, solicitudes y pedidos aparecerán aquí</p>
            </div>
          )}

          {/* Notification Center */}
          {(() => {
            const notifications: { level: "critical" | "warning" | "info"; icon: React.ElementType; iconColor: string; title: string; description: string; count: number; href?: string; actionLabel?: string }[] = [];

            // CRITICAL
            if (memberCounts.pending > 0) {
              notifications.push({
                level: "critical",
                icon: Clock,
                iconColor: "text-rose-600",
                title: "Colaboradores pendientes",
                description: `${memberCounts.pending} colaborador(es) esperando aprobación.`,
                count: memberCounts.pending,
                href: "/dashboard/colaboradores",
                actionLabel: "Ver colaboradores",
              });
            }
            if (requestCounts.pending > 0) {
              notifications.push({
                level: "critical",
                icon: Package,
                iconColor: "text-rose-600",
                title: "Solicitudes pendientes",
                description: `${requestCounts.pending} solicitud(es) esperando aprobación.`,
                count: requestCounts.pending,
                href: "/dashboard/solicitudes?status=pending_company_approval",
                actionLabel: "Ver solicitudes",
              });
            }
            if (orderCounts.inReview > 0) {
              notifications.push({
                level: "critical",
                icon: ShoppingCart,
                iconColor: "text-rose-600",
                title: "Pedidos en revisión",
                description: `${orderCounts.inReview} pedido(s) esperando revisión de pago.`,
                count: orderCounts.inReview,
                href: "/dashboard/pedidos-corporativos?status=under_review",
                actionLabel: "Ver pedidos",
              });
            }
            if (programHealth !== null && programHealth < 40) {
              notifications.push({
                level: "critical",
                icon: AlertTriangle,
                iconColor: "text-rose-600",
                title: "Salud del programa crítica",
                description: `Solo el ${programHealth}% de colaboradores están activos.`,
                count: 1,
                href: "/dashboard/colaboradores",
                actionLabel: "Ver colaboradores",
              });
            }

            // WARNING
            if (memberCounts.suspended > 0) {
              notifications.push({
                level: "warning",
                icon: UserMinus,
                iconColor: "text-amber-600",
                title: "Colaboradores suspendidos",
                description: `${memberCounts.suspended} colaborador(es) requieren revisión.`,
                count: memberCounts.suspended,
                href: "/dashboard/colaboradores",
                actionLabel: "Ver colaboradores",
              });
            }
            if (requestCounts.rejected > 0) {
              notifications.push({
                level: "warning",
                icon: XCircle,
                iconColor: "text-amber-600",
                title: "Solicitudes rechazadas",
                description: `${requestCounts.rejected} solicitud(es) rechazadas.`,
                count: requestCounts.rejected,
                href: "/dashboard/solicitudes?status=rejected_by_company",
                actionLabel: "Ver solicitudes",
              });
            }
            if (orderCounts.rejected > 0) {
              notifications.push({
                level: "warning",
                icon: XCircle,
                iconColor: "text-amber-600",
                title: "Pedidos rechazados",
                description: `${orderCounts.rejected} pedido(s) rechazados.`,
                count: orderCounts.rejected,
                href: "/dashboard/pedidos-corporativos?status=rejected",
                actionLabel: "Ver pedidos",
              });
            }
            if (memberCounts.approved > 0) {
              notifications.push({
                level: "warning",
                icon: UserCheck,
                iconColor: "text-amber-600",
                title: "Aprobados sin pagar",
                description: `${memberCounts.approved} colaborador(es) aprobado(s) pendiente(s) de pago.`,
                count: memberCounts.approved,
                href: "/dashboard/colaboradores",
                actionLabel: "Ver colaboradores",
              });
            }

            // INFO
            if (memberCounts.active > 0) {
              notifications.push({
                level: "info",
                icon: UserCheck,
                iconColor: "text-emerald-600",
                title: "Colaboradores activos",
                description: `${memberCounts.active} colaborador(es) activo(s) en el programa.`,
                count: memberCounts.active,
                href: "/dashboard/colaboradores",
                actionLabel: "Ver colaboradores",
              });
            }
            if (requestCounts.approved > 0) {
              notifications.push({
                level: "info",
                icon: CheckCircle2,
                iconColor: "text-emerald-600",
                title: "Solicitudes aprobadas",
                description: `${requestCounts.approved} solicitud(es) aprobada(s) pendiente(s) de pago.`,
                count: requestCounts.approved,
                href: "/dashboard/solicitudes?status=approved_pending_payment",
                actionLabel: "Ver solicitudes",
              });
            }
            if (orderCounts.approved > 0) {
              notifications.push({
                level: "info",
                icon: CheckCircle2,
                iconColor: "text-emerald-600",
                title: "Pedidos aprobados",
                description: `${orderCounts.approved} pedido(s) aprobado(s).`,
                count: orderCounts.approved,
                href: "/dashboard/pedidos-corporativos?status=approved",
                actionLabel: "Ver pedidos",
              });
            }
            if (programHealth !== null && programHealth >= 70) {
              notifications.push({
                level: "info",
                icon: TrendingUp,
                iconColor: "text-emerald-600",
                title: "Programa saludable",
                description: `El ${programHealth}% de colaboradores están activos.`,
                count: 1,
                href: "/dashboard/colaboradores",
                actionLabel: "Ver colaboradores",
              });
            }

            if (notifications.length === 0) {
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No existen notificaciones pendientes</p>
                  <p className="text-[10px] text-muted-foreground">Todo en orden</p>
                </div>
              );
            }

            const levelConfig = {
              critical: { label: "CRÍTICAS", bg: "bg-rose-50", border: "border-rose-200", iconBg: "bg-rose-100" },
              warning: { label: "ATENCIÓN", bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100" },
              info: { label: "INFORMACIÓN", bg: "bg-emerald-50", border: "border-emerald-200", iconBg: "bg-emerald-100" },
            };

            const grouped = {
              critical: notifications.filter((n) => n.level === "critical"),
              warning: notifications.filter((n) => n.level === "warning"),
              info: notifications.filter((n) => n.level === "info"),
            };

            return (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Centro de Notificaciones
                </h3>
                {(["critical", "warning", "info"] as const).map((level) => {
                  const items = grouped[level];
                  if (items.length === 0) return null;
                  const config = levelConfig[level];
                  return (
                    <div key={level} className={`rounded-2xl border-2 ${config.bg} ${config.border} p-4`}>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{config.label}</p>
                      <div className="space-y-2">
                        {items.map((notif, idx) => {
                          const Icon = notif.icon;
                          return (
                            <div key={`${level}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0 ${notif.iconColor}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className="text-sm font-bold text-slate-900 truncate">{notif.title}</p>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-900 text-white shrink-0">
                                    {notif.count}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-1">{notif.description}</p>
                                {notif.href && (
                                  <Link href={notif.href} className="inline-flex items-center gap-1 text-[9px] font-black text-primary hover:underline">
                                    {notif.actionLabel || "Ver"} →
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}