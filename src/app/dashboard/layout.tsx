"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  LayoutDashboard, User, Cpu, Users, History, Building2, GraduationCap, UsersRound,
} from "lucide-react";

const baseNavItems = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/perfil", label: "Mi Perfil", icon: User },
  { href: "/dashboard/chips", label: "Mis Chips", icon: Cpu },
  { href: "/dashboard/contactos", label: "Contactos", icon: Users },
  { href: "/dashboard/historial", label: "Historial", icon: History },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;
  const isEmployee = userRole === "member" || userRole === "employee";

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-4rem)] flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 p-4">
          <nav className="space-y-1 flex-1">
            {baseNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* Family section — for non-employees only */}
            {!isEmployee && (
              <>
                <div className="pt-6 pb-2">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Mi Familia
                  </p>
                </div>
                <Link
                  href="/dashboard/familia"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/dashboard/familia"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <UsersRound className="h-4 w-4" />
                  Perfiles Familiares
                </Link>
              </>
            )}

            {/* Org modules — for non-employees only */}
            {!isEmployee && (
              <>
                <div className="pt-6 pb-2">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Módulos Extra
                  </p>
                </div>
                <Link
                  href="/dashboard/empresas"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/dashboard/empresas"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  Empresas
                </Link>
                <Link
                  href="/dashboard/colegios"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/dashboard/colegios"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  Colegios
                </Link>
              </>
            )}
          </nav>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground truncate px-3">{session.user?.email}</p>
            {isEmployee && (
              <p className="text-[10px] text-primary font-semibold uppercase tracking-wider px-3 mt-0.5">
                Cuenta Institucional
              </p>
            )}
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around py-2">
          {baseNavItems.slice(0, 5).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 text-xs px-2 py-1 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 p-6 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </>
  );
}
