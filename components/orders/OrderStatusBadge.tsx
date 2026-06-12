import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { getOrderStatusLabel } from "@/lib/order-status";

type BadgeVariant = "customer" | "admin";

interface OrderStatusBadgeProps {
  orderStatus: string | null | undefined;
  paymentStatus?: string | null | undefined;
  adminReviewStatus?: string | null | undefined;
  variant?: BadgeVariant;
  /** Optional class override */
  className?: string;
}

/**
 * Shared order status badge for both customer dashboard and admin panel.
 * - variant="customer":  icon + label inside a colored pill (used in /dashboard/pedidos)
 * - variant="admin":     inline <span> badge (used in admin table rows & detail)
 */
export function OrderStatusBadge({
  orderStatus,
  paymentStatus,
  adminReviewStatus,
  variant = "customer",
  className = "",
}: OrderStatusBadgeProps) {
  const label = getOrderStatusLabel(orderStatus, paymentStatus);

  // Resolve status config ---------------------------------------------------
  const config = resolveStatusConfig(
    orderStatus,
    paymentStatus,
    adminReviewStatus,
  );

  if (variant === "admin") {
    return (
      <span
        className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${config.adminClass} ${className}`}
      >
        {label}
      </span>
    );
  }

  // customer variant (icon + pill)
  const Icon = config.icon;
  return (
    <div
      className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${config.customerClass} ${className}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-black uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal helpers – mirrors the exact logic of the original files
// ---------------------------------------------------------------------------

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  customerClass: string;
  adminClass: string;
}

function resolveStatusConfig(
  orderStatus?: string | null,
  paymentStatus?: string | null,
  adminReviewStatus?: string | null,
): StatusConfig {
  // rejected / under_review / paid take precedence over orderStatus
  if (paymentStatus === "rejected") {
    return {
      icon: AlertCircle,
      customerClass: "text-red-500 bg-red-500/10 border-red-500/20",
      adminClass: "bg-red-500/10 text-red-600",
    };
  }

  if (paymentStatus === "under_review" || adminReviewStatus === "pending") {
    return {
      icon: Clock,
      customerClass: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      adminClass: "bg-blue-500/10 text-blue-600",
    };
  }

  if (paymentStatus === "paid") {
    return {
      icon: CheckCircle2,
      customerClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      adminClass: "bg-emerald-500/10 text-emerald-600",
    };
  }

  switch (orderStatus) {
    case "pending":
      return {
        icon: Clock,
        customerClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        adminClass: "bg-amber-500/10 text-amber-600",
      };
    case "processing":
      return {
        icon: ShoppingBag,
        customerClass: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        adminClass: "bg-blue-500/10 text-blue-600",
      };
    case "shipped":
      return {
        icon: Truck,
        customerClass: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
        adminClass: "bg-indigo-500/10 text-indigo-600",
      };
    case "completed":
      return {
        icon: CheckCircle2,
        customerClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        adminClass: "bg-emerald-500/10 text-emerald-600",
      };
    case "cancelled":
      return {
        icon: AlertCircle,
        customerClass: "text-red-500 bg-red-500/10 border-red-500/20",
        adminClass: "bg-red-500/10 text-red-600",
      };
    default:
      return {
        icon: AlertCircle,
        customerClass: "text-slate-500 bg-slate-500/10 border-slate-500/20",
        adminClass: "bg-slate-500/10 text-slate-600",
      };
  }
}