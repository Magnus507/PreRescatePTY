"use client";

import { useEffect, useState } from "react";
import { History, MapPin, Smartphone, Monitor } from "lucide-react";

interface Scan {
  id: string;
  scannedAt: string;
  sourceType: string;
  ipAddress: string;
  userAgent: string;
  country: string | null;
  city: string | null;
  address: string | null;
  geoLat: number | null;
  geoLng: number | null;
  notificationStatus: string;
  chip: { shortCode: string; serialPublic: string; chipAlias?: string | null };
  notifications?: {
    channel: string;
    recipient: string;
    status: string;
    sentAt: string | null;
  }[];
}

export default function HistorialPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chips/scans")
      .then((r) => r.json())
      .then((data) => setScans(data.scans || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Accediendo a registros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">Historial de Rescate</h1>
        <p className="text-slate-500 font-medium">Cronograma detallado de accesos a tus fichas médicas.</p>
      </div>

      {scans.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-300">
          <History className="h-20 w-20 mx-auto mb-6 opacity-10 text-slate-900" />
          <p className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">Cero Escaneos Detectados</p>
          <p className="text-sm text-slate-400 mt-2 font-medium">Tus chips están listos. Aquí verás cada activación física.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => (
            <div key={scan.id} className="group relative">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-slate-900 rounded-[2rem] opacity-0 group-hover:opacity-10 transition-opacity" />
               <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-all group-hover:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                    scan.sourceType === "nfc" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                    <Smartphone className="h-7 w-7" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Evento de Rescate</span>
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        scan.notificationStatus === "sent" ? "bg-emerald-100 text-emerald-700" :
                        scan.notificationStatus === "failed" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-500"}`}>
                        {scan.notificationStatus === "sent" ? "✓ Notificado" :
                         scan.notificationStatus === "failed" ? "✗ Error Notif" :
                         scan.notificationStatus === "skipped" ? "— No Contacts" : "⏳ Pendiente"}
                       </span>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none italic">
                       Escaneo {scan.sourceType === 'qr' ? 'Vía Código QR' : 'Vía Sensor NFC'}
                    </h3>
                    
                    <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                       <span>{new Date(scan.scannedAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                       <span className="h-1 w-1 rounded-full bg-slate-300" />
                       <span className="text-primary">{new Date(scan.scannedAt).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 md:max-w-sm space-y-3">
                   <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Ubicación Detectada</p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                          {scan.address || scan.city || "Ubicación Geográfica No Compartida"}
                          {scan.country && <span className="text-slate-400 font-medium ml-1">({scan.country})</span>}
                        </p>
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between px-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-mono text-slate-500">{scan.ipAddress}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-1 rounded-lg">
                        Serial: {scan.chip.serialPublic}
                      </span>
                   </div>
                   {scan.chip.chipAlias && (
                      <div className="mt-2 px-3 py-1.5 bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit">
                         Etiqueta: {scan.chip.chipAlias}
                      </div>
                   )}
                </div>

                {scan.notifications && scan.notifications.length > 0 && (
                  <div className="flex flex-col gap-2 min-w-[200px] border-l border-slate-100 pl-6 self-stretch justify-center">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canales Alertados</p>
                     <div className="flex flex-wrap gap-2">
                        {scan.notifications.map((n, idx) => (
                          <div key={idx} className={`px-2 py-1 rounded-lg border flex items-center gap-2 ${
                            n.status === 'sent' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700 animate-pulse'
                          }`}>
                             <span className="text-[9px] font-bold">{n.channel === 'sms' ? '📱 SMS' : '📧 Email'}</span>
                             <span className="text-[9px] font-black opacity-40">{n.recipient.replace(/(.{3}).*(.{3})/, "$1...$2")}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
