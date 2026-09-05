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
    <section className="relative overflow-hidden bg-[#050914] py-24 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 55% at 82% 38%, rgba(79,70,229,.13), transparent 62%), radial-gradient(38% 48% at 16% 76%, rgba(6,182,212,.07), transparent 64%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[.78fr_1.22fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.62 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/15 bg-indigo-300/[0.055] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-200">
              <Building2 className="h-3.5 w-3.5" />
              PreRescue para organizaciones
            </div>
            <h2 className="max-w-[10ch] text-[clamp(2.7rem,5vw,5rem)] font-black leading-[0.91] tracking-[-0.045em] text-slate-50">
              Un panel para cuidar a todo tu equipo.
            </h2>
            <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-400 sm:text-lg sm:leading-8">
              Las cuentas corporativas permiten organizar miembros, perfiles y dispositivos desde un solo espacio administrativo.
            </p>

            <ul className="mt-8 space-y-3">
              {benefits.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/[0.08] text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/empresas" className="group mt-9 inline-flex items-center gap-2 text-sm font-bold text-indigo-200 transition-colors hover:text-white">
              Conocer soluciones corporativas
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 22 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.72, delay: 0.08 }}
            className="relative"
          >
            <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-[110px]" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#090d15]/90 shadow-[0_50px_120px_-55px_rgba(79,70,229,.6)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-300/15 bg-indigo-300/[0.07]"><ShieldCheck className="h-4 w-4 text-indigo-200" /></div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Organization console</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-200">PreRescue ID · Empresa</p>
                  </div>
                </div>
                <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] text-slate-500 sm:flex"><Search className="h-3.5 w-3.5" /> Buscar miembro</div>
              </div>

              <div className="grid min-h-[470px] sm:grid-cols-[140px_1fr]">
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

                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      ["Miembros", "48"],
                      ["Chips activos", "43"],
                      ["Pendientes", "5"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 sm:p-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</p>
                        <p className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-100 sm:text-2xl">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">Equipo</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-300">Miembros recientes</p>
                      </div>
                      <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[9px] font-bold text-slate-500">Ver todos</span>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {rows.map((row) => (
                        <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[1.2fr_.8fr_auto]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[9px] font-black text-slate-300">{row.initials}</div>
                            <div><p className="text-[11px] font-bold text-slate-200">{row.name}</p><p className="mt-0.5 text-[9px] text-slate-600 sm:hidden">{row.area}</p></div>
                          </div>
                          <p className="hidden text-[10px] font-semibold text-slate-500 sm:block">{row.area}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${row.status === "Activo" ? "bg-emerald-300/[0.07] text-emerald-300" : "bg-amber-300/[0.07] text-amber-300"}`}>{row.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-indigo-300/10 bg-indigo-300/[0.035] p-4">
                    <div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-200/60">Cobertura del equipo</p><p className="mt-1 text-xs font-bold text-slate-300">89.5% de dispositivos asignados</p></div>
                    <div className="h-10 w-10 rounded-full border-[3px] border-indigo-300/20 border-t-indigo-300" />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] font-medium text-slate-600">Representación visual del panel corporativo.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
