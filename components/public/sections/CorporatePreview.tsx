"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, CheckCircle2, LayoutDashboard, PackageCheck, Search, ShieldCheck, UsersRound } from "lucide-react";

const benefits = [
  "Panel para gestionar miembros",
  "Asignación de chips por colaborador",
  "Perfiles médicos individuales",
  "Operación centralizada para equipos",
];

const rows = [
  { initials: "AM", name: "Ana M.", area: "Operaciones", status: "Activo" },
  { initials: "JR", name: "José R.", area: "Logística", status: "Activo" },
  { initials: "LC", name: "Laura C.", area: "Administración", status: "Pendiente" },
];

export default function CorporatePreview() {
  return (
    <section className="relative overflow-hidden bg-[#050914] py-20 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 55% at 82% 38%, rgba(79,70,229,.13), transparent 62%), radial-gradient(38% 48% at 16% 76%, rgba(6,182,212,.07), transparent 64%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 sm:gap-14 lg:grid-cols-[.78fr_1.22fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[0.055] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-indigo-200 sm:mb-6 sm:text-[10px] sm:tracking-[0.18em]">
              <Building2 className="h-3.5 w-3.5" />
              PreRescue para organizaciones
            </div>
            <h2 className="max-w-[10ch] text-[clamp(2.35rem,10vw,3.1rem)] font-black leading-[0.94] tracking-[-0.045em] text-slate-50 sm:text-[clamp(2.7rem,5vw,5rem)] sm:leading-[0.91]">
              Un panel para cuidar a todo tu equipo.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] font-medium leading-6 text-slate-400 sm:mt-6 sm:text-lg sm:leading-8">
              Las cuentas corporativas permiten organizar miembros, perfiles y dispositivos desde un solo espacio administrativo.
            </p>

            <ul className="mt-6 space-y-2.5 sm:mt-8 sm:space-y-3">
              {benefits.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/[0.08] text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/empresas" className="group mt-7 inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-bold text-indigo-200 transition-colors active:text-white sm:mt-9 sm:hover:text-white">
              Conocer soluciones corporativas
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.985, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="relative"
          >
            <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[80px] sm:h-[78%] sm:w-[78%] sm:bg-indigo-500/15 sm:blur-[110px]" />
            <div className="relative overflow-hidden rounded-[1.55rem] border border-white/[0.09] bg-[#090d15]/90 shadow-[0_40px_100px_-55px_rgba(79,70,229,.55)] backdrop-blur-xl sm:rounded-[2rem] sm:shadow-[0_50px_120px_-55px_rgba(79,70,229,.6)] sm:backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 sm:px-6 sm:py-4">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-300/15 bg-indigo-300/[0.07]"><ShieldCheck className="h-4 w-4 text-indigo-200" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[9px] sm:tracking-[0.16em]">Organization console</p>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-slate-200 sm:text-xs">PreRescue ID · Empresa</p>
                  </div>
                </div>
                <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] text-slate-500 sm:flex"><Search className="h-3.5 w-3.5" /> Buscar miembro</div>
              </div>

              <div className="grid sm:min-h-[470px] sm:grid-cols-[140px_1fr]">
                <aside className="hidden border-r border-white/[0.06] bg-black/20 p-4 sm:block">
                  <div className="space-y-2">
                    {[
                      [LayoutDashboard, "Resumen", true],
                      [UsersRound, "Miembros", false],
                      [PackageCheck, "Dispositivos", false],
                    ].map(([Icon, label, active]) => {
                      const NavIcon = Icon as typeof LayoutDashboard;
                      return <div key={String(label)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-bold ${active ? "bg-indigo-400/10 text-indigo-200" : "text-slate-600"}`}><NavIcon className="h-3.5 w-3.5" />{String(label)}</div>;
                    })}
                  </div>
                </aside>

                <div className="p-3.5 sm:p-5 lg:p-6">
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {[
                      ["Miembros", "48"],
                      ["Chips activos", "43"],
                      ["Pendientes", "5"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 sm:rounded-2xl sm:p-4">
                        <p className="truncate text-[7px] font-black uppercase tracking-[0.1em] text-slate-600 sm:text-[8px] sm:tracking-[0.14em]">{label}</p>
                        <p className="mt-1.5 text-lg font-black tracking-[-0.03em] text-slate-100 sm:mt-2 sm:text-2xl">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-white/[0.02] sm:mt-4 sm:rounded-[1.35rem]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-3 sm:px-4 sm:py-3.5">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.13em] text-slate-600 sm:text-[9px] sm:tracking-[0.15em]">Equipo</p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-300 sm:text-xs">Miembros recientes</p>
                      </div>
                      <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-[8px] font-bold text-slate-500 sm:px-2.5 sm:text-[9px]">Ver todos</span>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {rows.map((row) => (
                        <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-2.5 px-3 py-3 sm:grid-cols-[1.2fr_.8fr_auto] sm:gap-3 sm:px-4 sm:py-3.5">
                          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[9px] font-black text-slate-300">{row.initials}</div>
                            <div className="min-w-0"><p className="truncate text-[10px] font-bold text-slate-200 sm:text-[11px]">{row.name}</p><p className="mt-0.5 truncate text-[8px] text-slate-600 sm:hidden">{row.area}</p></div>
                          </div>
                          <p className="hidden text-[10px] font-semibold text-slate-500 sm:block">{row.area}</p>
                          <span className={`rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-wider sm:px-2.5 sm:text-[8px] ${row.status === "Activo" ? "bg-emerald-300/[0.07] text-emerald-300" : "bg-amber-300/[0.07] text-amber-300"}`}>{row.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-300/10 bg-indigo-300/[0.035] p-3 sm:mt-4 sm:rounded-2xl sm:p-4">
                    <div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-indigo-200/60 sm:text-[9px] sm:tracking-[0.14em]">Cobertura del equipo</p><p className="mt-1 text-[10px] font-bold text-slate-300 sm:text-xs">89.5% de dispositivos asignados</p></div>
                    <div className="h-9 w-9 shrink-0 rounded-full border-[3px] border-indigo-300/20 border-t-indigo-300 sm:h-10 sm:w-10" />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-center text-[9px] font-medium text-slate-600 sm:mt-3 sm:text-[10px]">Representación visual del panel corporativo.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
