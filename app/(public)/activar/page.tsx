"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";

export default function ActivarPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir siempre al dashboard integrado
    // Si no está logueado, el dashboard lo mandará a login solo
    router.replace("/dashboard/chips?activate=true");
  }, [router]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#050812] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(218,26,33,0.12),_transparent_28%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-[3rem] border border-white/10 bg-white/5 shadow-2xl shadow-blue-500/10 backdrop-blur-xl overflow-hidden flex flex-col md:flex-row min-h-[70vh]">
          
          <div className="hidden md:flex md:w-[45%] bg-slate-950/90 p-12 text-white flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-emerald-600/10"></div>
            
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-brand/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-brand mb-8">Bienvenido de vuelta</div>
              <h1 className="text-4xl font-black tracking-tight leading-tight mb-6">
                Activa tu <br />
                <span className="text-blue-400">protección</span> <br />
                ahora mismo.
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-xs">
                Tienes tu chip en mano. Hora de activarlo en el sistema. Te guiaremos paso a paso.
              </p>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-400 font-black mb-2">Qué necesitas</p>
                <ul className="text-sm space-y-2 text-slate-200">
                  <li>• Tu código de 12 dígitos</li>
                  <li>• Datos médicos básicos</li>
                  <li>• Contactos de emergencia</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 md:p-16 flex flex-col justify-center bg-slate-950/60 scrollbar-hide overflow-y-auto max-h-[80vh]">
            <div className="max-w-md mx-auto w-full">
              <div className="md:hidden inline-flex rounded-full bg-brand/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-brand mb-8">Activación de chip</div>
              
              <h2 className="text-3xl font-black tracking-tight mb-4">Sincronizando tu protección</h2>
              <p className="text-slate-300 leading-relaxed mb-10">El centro de activación se está cargando. En un momento estarás listo para asignar tus datos médicos y contactos de emergencia.</p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-glow flex-shrink-0">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-black">Estado actual</p>
                    <p className="text-xl font-black text-white">Iniciando sesión segura</p>
                  </div>
                </div>
                
                <div className="grid gap-3">
                  {['Conectando a servidor', 'Verificando código', 'Cargando formulario'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-brand animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-sm text-slate-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 p-6 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black mb-2">¿Necesitas ayuda?</p>
                <p className="text-sm text-slate-300">Si se tarda más de 10 segundos, recarga la página o <a href="/contacto" className="text-brand font-black hover:underline">contacta soporte</a>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
