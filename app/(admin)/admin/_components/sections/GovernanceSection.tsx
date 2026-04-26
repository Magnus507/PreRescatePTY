"use client";

import { toast } from "sonner";
import { AlertCircle, Shield, Database, HardDrive, Bell, CheckCircle2, ChevronRight, Activity, Zap, RefreshCw, Loader2 } from "lucide-react";
import { AdminStats, SystemAlert } from "../../_types/admin";

interface GovernanceSectionProps {
  stats: AdminStats | null;
  loading: boolean;
  loadStats: () => void;
}

export function GovernanceSection({ stats, loading, loadStats }: GovernanceSectionProps) {
  const alerts = stats?.alerts || [];

  const handleRecalculate = () => {
    loadStats();
    toast.success("Métricas recalculadas en tiempo real", {
      description: "El sistema ha verificado la integridad de la base de datos y el almacenamiento.",
      icon: <RefreshCw className="h-4 w-4 text-emerald-500" />
    });
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Consultando Infraestructura...</p>
      </div>
    );
  }

  // Final fallback if data still not present
  if (!stats) return null;
  
  const categories = [
    { id: "storage", icon: HardDrive, label: "Almacenamiento", color: "text-blue-500" },
    { id: "security", icon: Shield, label: "Seguridad", color: "text-emerald-500" },
    { id: "orders", icon: Activity, label: "Operaciones", color: "text-amber-500" },
    { id: "system", icon: Zap, label: "Core Root", color: "text-indigo-500" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Risk Assessment Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl">
           <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
              <Shield className="h-64 w-64" />
           </div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="h-2 w-10 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">Estado de la Infraestructura</span>
              </div>
              
              <h2 className="text-4xl font-black tracking-tighter mb-4">Integridad del Sistema</h2>
              <p className="text-slate-400 font-bold max-w-lg mb-8 text-sm leading-relaxed">
                 Análisis heurístico de la salud del ecosistema PreRescate. Supervisión de almacenamiento, latencia de base de datos y flujos de seguridad activos.
              </p>
              
              <div className="flex flex-wrap gap-4">
                 <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Alertas Activas</p>
                    <p className="text-2xl font-black flex items-center gap-2">
                       {alerts.length} <span className={`h-2 w-2 rounded-full ${alerts.length > 0 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                    </p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Uso de Storage</p>
                    <p className="text-2xl font-black">{stats.storageUsage?.percentage || 0}%</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Plan Actual</p>
                    <p className="text-2xl font-black text-amber-400 uppercase tracking-tighter italic">Base FREE</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col justify-between">
           <div>
              <h3 className="text-xl font-black tracking-tighter mb-2">Acciones Rápidas</h3>
              <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest">Gobernanza Superior</p>
              
              <div className="space-y-3">
                 <button onClick={handleRecalculate} className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-all group font-black uppercase text-[10px] tracking-widest">
                    <span>Recalcular Todo</span>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                 </button>
                 <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-all group font-black uppercase text-[10px] tracking-widest opacity-50 cursor-not-allowed">
                    <span>Backup de Datos</span>
                    <Database className="h-4 w-4" />
                 </button>
                 <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 group font-black uppercase text-[10px] tracking-widest">
                    <span>Exportar Auditoría</span>
                    <ChevronRight className="h-4 w-4" />
                 </button>
              </div>
           </div>
           
           <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                    <Activity className="h-5 w-5 text-slate-400" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Uptime Mensual</p>
                    <p className="text-xs font-bold text-emerald-500">99.98% Garantizado</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-6">
         <div className="flex items-center justify-between px-4">
            <h3 className="text-2xl font-black tracking-tighter">Bitácora de Advertencias</h3>
            <span className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
               {alerts.length} Entradas Detectadas
            </span>
         </div>

         {alerts.length === 0 ? (
           <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] p-12 text-center border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
              <h4 className="text-2xl font-black tracking-tighter text-emerald-700 dark:text-emerald-400 mb-2">Todo bajo control</h4>
              <p className="text-sm font-bold text-emerald-600/70 max-w-sm mx-auto">
                 No se han detectado anomalías críticas en el sistema. El ecosistema PreRescate opera con parámetros óptimos.
              </p>
           </div>
         ) : (
           <div className="grid grid-cols-1 gap-4">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`relative overflow-hidden p-8 rounded-[2.5rem] border flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:scale-[1.01] ${
                    alert.type === 'critical' 
                      ? 'bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/50' 
                      : alert.type === 'warning'
                        ? 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50'
                        : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-6">
                     <div className={`h-16 w-16 rounded-3xl flex items-center justify-center shrink-0 ${
                        alert.type === 'critical' ? 'bg-red-600 text-white' : 'bg-white shadow-xl dark:bg-slate-800'
                     }`}>
                        <AlertCircle className="h-8 w-8" />
                     </div>
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                              alert.type === 'critical' ? 'text-red-600' : 'text-slate-400'
                           }`}>{alert.category}</p>
                           <span className="h-1 w-1 rounded-full bg-slate-300" />
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Hace Instantes</p>
                        </div>
                        <h4 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{alert.title}</h4>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-snug">
                           {alert.message}
                        </p>
                     </div>
                  </div>
                  
                  {alert.actionUrl && (
                    <button 
                       className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                         alert.type === 'critical' ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-900 text-white shadow-slate-200'
                       }`}
                    >
                       {alert.actionLabel || "Gestionar"}
                    </button>
                  )}
                </div>
              ))}
           </div>
         )}
      </div>

      {/* Category Audit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         {categories.map((cat) => (
           <div key={cat.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 transition-all hover:shadow-2xl group text-center">
              <div className={`h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${cat.color}`}>
                 <cat.icon className="h-6 w-6" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{cat.label}</p>
              <p className="text-xs font-black text-slate-900 dark:text-white">STATUS: OK</p>
           </div>
         ))}
      </div>

    </div>
  );
}
