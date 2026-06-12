import React from 'react';
import type { ChipDetail, ScanEvent } from '../../_types/admin';
import { 
  ChevronLeft, Cpu, RefreshCw, Loader2, User, 
  MapPin, Scan as ScanIcon, Printer
} from 'lucide-react';
import Image from 'next/image';

interface ChipDetailProps {
  chip: ChipDetail;
  loading: boolean;
  reactivating: boolean;
  onBack: () => void;
  onReactivate: (id: string) => void;
  formatDate: (d: string) => string;
  statusColor: (s: string) => string;
  serviceColor: (s: string) => string;
}

export const ChipDetailView: React.FC<ChipDetailProps> = ({ 
  chip, loading, reactivating, onBack, onReactivate, 
  formatDate, statusColor, serviceColor 
}) => {
  if (loading || !chip) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-300">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Volver
          </button>
          <span className="text-xs text-muted-foreground font-mono font-bold">{chip.serialPublic}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="bg-white rounded-[2.5rem] border border-border p-8 text-center space-y-4 flex-shrink-0 shadow-sm">
            <div className="w-56 h-56 mx-auto bg-white rounded-3xl p-4 border-2 border-dashed border-slate-200 flex items-center justify-center relative group">
              <Image
                src={chip.qrUrl}
                alt={`QR ${chip.shortCode}`}
                width={200}
                height={200}
                className="w-full h-full object-contain"
                unoptimized
              />
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl">
                 <button className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl scale-90 group-hover:scale-100 transition-transform">
                    <Printer className="h-5 w-5" />
                 </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Código Corto</p>
              <p className="font-mono text-2xl font-black tracking-widest text-slate-900">{chip.shortCode}</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="p-6 rounded-[2.5rem] border border-border bg-card shadow-sm">
              <h2 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" /> Ficha Técnica del Dispositivo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                 <InfoRow label="Serial Público" value={chip.serialPublic} mono />
                 <InfoRow label="Estado Operativo" value={chip.status} badge={statusColor(chip.status)} />
                 <InfoRow label="Servicio Médico" value={chip.serviceStatus} badge={serviceColor(chip.serviceStatus)} />
                 <InfoRow label="Fecha Vencimiento" value={chip.serviceEndDate ? formatDate(chip.serviceEndDate) : "—"} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => onReactivate(chip.id)}
                disabled={reactivating}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-[2rem] bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 group"
              >
                {reactivating ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />}
                RENOVAR LICENCIA (2 AÑOS)
              </button>
              
              <div className="p-6 rounded-[2.5rem] border border-border bg-card shadow-sm">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Perfil Clínico Asignado
                </h3>
                {chip.assignedProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase text-slate-400">Paciente</p>
                       <p className="font-bold text-slate-900">{chip.assignedProfile.firstName} {chip.assignedProfile.lastName}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase text-slate-400">Tipo de Sangre</p>
                       <p className="font-black text-red-600 text-lg">{chip.assignedProfile.bloodType}</p>
                    </div>
                    <div className="col-span-full pt-2 border-t border-slate-50">
                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Observaciones Críticas</p>
                       <div className="p-3 bg-slate-50 rounded-xl text-sm italic text-slate-600">
                          {chip.assignedProfile.allergies || "Sin alergias reportadas."}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-sm text-slate-400 font-medium italic">Dispositivo virgen - Esperando activación de usuario.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scan Events Timeline */}
        <div className="p-8 rounded-[2.5rem] border border-border bg-card shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <ScanIcon className="h-4 w-4 text-primary" /> Historial de Escaneos Inteligentes
              </h3>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                {chip.scanEvents?.length || 0} Eventos
              </span>
           </div>
           
           <div className="space-y-3">
              {chip.scanEvents && chip.scanEvents.length > 0 ? chip.scanEvents.map((scan: ScanEvent) => (
                <div key={scan.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${scan.sourceType === "nfc" ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"}`}>
                       {scan.sourceType === "nfc" ? <ScanIcon className="h-5 w-5" /> : <ScanIcon className="h-5 w-5" />}
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-900">{formatDate(scan.scannedAt)}</p>
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{scan.sourceType} Scan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs font-bold text-slate-600">
                     {scan.city && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {scan.city}</span>}
                     <span className="font-mono text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{scan.ipAddress?.substring(0, 15)}</span>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center text-slate-300">
                   <Activity className="h-10 w-10 mx-auto mb-4 opacity-20" />
                   <p className="text-xs font-black uppercase tracking-widest">Sin actividad de escaneo registrada.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

// Internal sub-component for layout consistency
function InfoRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors px-2 rounded-lg">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      {badge ? (
        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${badge}`}>{value}</span>
      ) : (
        <span className={`text-right font-bold text-slate-900 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</span>
      )}
    </div>
  );
}

function Activity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
