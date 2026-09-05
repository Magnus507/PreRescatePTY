"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FileText, QrCode, ScanLine, ShoppingBag, Smartphone, UserRoundCheck } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: ShoppingBag,
    title: "Obtén tu PreRescue ID",
    description: "Recibes una identificación física con chip NFC y código QR vinculable a tu cuenta.",
    status: "Identificación lista para activar",
  },
  {
    num: "02",
    icon: Smartphone,
    title: "Activa el chip",
    description: "Ingresas el código de activación y vinculas el dispositivo a tu cuenta de PreRescue ID.",
    status: "Chip vinculado a tu cuenta",
  },
  {
    num: "03",
    icon: FileText,
    title: "Configura tu perfil",
    description: "Completa tu información médica y decide qué datos estarán disponibles en la vista pública.",
    status: "Perfil médico configurado",
  },
  {
    num: "04",
    icon: ScanLine,
    title: "Escanea y consulta",
    description: "Un teléfono compatible abre el perfil desde el navegador para consultar la información configurada y los contactos disponibles.",
    status: "Perfil de emergencia disponible",
  },
];

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const active = steps[activeStep];

  return (
    <section className="relative overflow-hidden bg-[#050914] py-24 text-white md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(55% 55% at 80% 40%, rgba(37,99,235,.11), transparent 62%), radial-gradient(40% 50% at 10% 72%, rgba(6,182,212,.07), transparent 64%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.6 }}
          className="mb-14 max-w-3xl lg:mb-8"
        >
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-300/80">Cómo funciona</p>
          <h2 className="text-[clamp(2.7rem,5vw,5.2rem)] font-black leading-[0.92] tracking-[-0.045em] text-slate-50">
            Cuatro pasos. Cero complicaciones.
          </h2>
          <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-slate-400 sm:text-lg">
            Diseñado para que la preparación sea sencilla y la consulta sea directa cuando realmente importa.
          </p>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,.92fr)_minmax(430px,1.08fr)] lg:gap-16">
          <div className="space-y-4 lg:py-24">
            {steps.map((step, index) => {
              const isActive = activeStep === index;
              return (
                <motion.article
                  key={step.num}
                  onViewportEnter={() => setActiveStep(index)}
                  viewport={{ amount: 0.55, margin: "-15% 0px -35% 0px" }}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`relative min-h-[250px] overflow-hidden rounded-[1.8rem] border p-6 transition-all duration-500 sm:p-8 lg:min-h-[310px] ${
                    isActive
                      ? "border-sky-300/20 bg-sky-300/[0.055] shadow-[0_22px_80px_-45px_rgba(56,189,248,.7)]"
                      : "border-white/[0.07] bg-white/[0.025]"
                  }`}
                >
                  <div aria-hidden="true" className={`absolute inset-y-8 left-0 w-px bg-gradient-to-b from-transparent ${isActive ? "via-sky-300" : "via-white/10"} to-transparent`} />
                  <div className="flex items-start gap-5 sm:gap-6">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-500 ${isActive ? "border-sky-300/20 bg-sky-300/10" : "border-white/[0.08] bg-white/[0.04]"}`}>
                      <step.icon className={`h-5 w-5 ${isActive ? "text-sky-300" : "text-slate-500"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${isActive ? "text-sky-300/80" : "text-slate-600"}`}>Paso {step.num}</span>
                        <span className={`h-2 w-2 rounded-full ${isActive ? "bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,.9)]" : "bg-white/10"}`} />
                      </div>
                      <h3 className="mt-6 text-2xl font-black tracking-[-0.03em] text-slate-100 sm:text-3xl">{step.title}</h3>
                      <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">{step.description}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}

            <Link
              href="/como-funciona"
              className="group inline-flex items-center gap-2 px-2 pt-4 text-sm font-bold text-sky-200 transition-colors hover:text-white"
            >
              Ver el proceso completo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="relative hidden lg:block">
            <div className="sticky top-28 flex min-h-[650px] items-center justify-center">
              <div aria-hidden="true" className="absolute h-[70%] w-[70%] rounded-full bg-blue-600/15 blur-[110px]" />
              <div className="relative w-full max-w-[540px] rounded-[2.4rem] border border-white/[0.08] bg-white/[0.025] p-8 shadow-[0_45px_120px_-55px_rgba(37,99,235,.55)] backdrop-blur-2xl">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-600">Experiencia de uso</p>
                    <p className="mt-1 text-sm font-bold text-slate-300">PreRescue ID / Emergency Flow</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.055] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    preparado
                  </div>
                </div>

                <div className="mx-auto w-[78%] overflow-hidden rounded-[2.3rem] border border-white/[0.1] bg-[#070b12] p-2 shadow-2xl">
                  <div className="min-h-[510px] rounded-[1.9rem] border border-white/[0.055] bg-gradient-to-b from-[#0d1726] to-[#070a10] p-5">
                    <div className="mx-auto mb-7 h-1.5 w-16 rounded-full bg-white/10" />
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={active.num}
                        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                        transition={{ duration: 0.28 }}
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-300/[0.07]">
                          <active.icon className="h-6 w-6 text-sky-300" />
                        </div>
                        <p className="mt-7 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-300/70">{active.num} / 04</p>
                        <h4 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{active.title}</h4>
                        <p className="mt-4 text-sm leading-6 text-slate-400">{active.description}</p>

                        <div className="mt-8 space-y-3">
                          {activeStep === 0 && (
                            <>
                              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                                <div className="flex items-center gap-3"><QrCode className="h-5 w-5 text-sky-300" /><span className="text-sm font-bold text-slate-200">QR impreso</span></div>
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              </div>
                              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                                <div className="flex items-center gap-3"><Smartphone className="h-5 w-5 text-indigo-300" /><span className="text-sm font-bold text-slate-200">Chip NFC</span></div>
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              </div>
                            </>
                          )}
                          {activeStep === 1 && (
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Código de activación</p>
                              <div className="mt-3 flex gap-2">
                                {["P", "R", "8", "2", "K", "Q"].map((char, i) => <span key={`${char}-${i}`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 text-sm font-black text-white">{char}</span>)}
                              </div>
                            </div>
                          )}
                          {activeStep === 2 && (
                            <>
                              {["Datos médicos", "Contactos de emergencia", "Visibilidad pública"].map((label, i) => (
                                <div key={label} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                                  <span className="text-sm font-bold text-slate-200">{label}</span>
                                  <span className={`h-5 w-9 rounded-full p-0.5 ${i === 2 ? "bg-sky-400/60" : "bg-emerald-400/60"}`}><span className="block h-4 w-4 translate-x-4 rounded-full bg-white" /></span>
                                </div>
                              ))}
                            </>
                          )}
                          {activeStep === 3 && (
                            <div className="rounded-2xl border border-[#DA1A21]/15 bg-[#DA1A21]/[0.055] p-5">
                              <div className="flex items-center gap-3"><UserRoundCheck className="h-5 w-5 text-rose-300" /><span className="text-sm font-extrabold text-slate-100">Perfil de emergencia encontrado</span></div>
                              <p className="mt-3 text-xs leading-5 text-slate-400">La información visible depende de la configuración del perfil.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <div className="mt-8 flex items-center gap-3 border-t border-white/[0.06] pt-5 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      {active.status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
