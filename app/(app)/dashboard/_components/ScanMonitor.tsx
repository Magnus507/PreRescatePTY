'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { AlertCircle, MapPin } from 'lucide-react';

/**
 * ScanMonitor Component
 * Polls the scans API to detect new events and show immediate alerts.
 */
export function ScanMonitor() {
  const lastScanIdRef = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const checkScans = async () => {
      try {
        const res = await fetch('/api/chips/scans?limit=1');
        const data = await res.json();
        const latestScan = data.scans?.[0];

        if (!latestScan) return;

        if (isFirstLoad.current) {
          lastScanIdRef.current = latestScan.id;
          isFirstLoad.current = false;
          return;
        }

        if (latestScan.id !== lastScanIdRef.current) {
          lastScanIdRef.current = latestScan.id;
          
          // Sound effect or high-priority toast
          toast.custom(() => (
            <div className="flex items-start gap-4 rounded-[1.75rem] border border-red-100 bg-white p-5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.55)] animate-in slide-in-from-right duration-500">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-[0_14px_32px_-18px_rgba(220,38,38,0.6)]">
                <AlertCircle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-600">Alerta de seguridad</p>
                <p className="text-lg font-black leading-tight tracking-tight text-slate-950">Chip escaneado</p>
                <p className="text-xs leading-5 text-slate-600">Un rescatista ha accedido a la ficha {latestScan.chip.serialPublic}.</p>
                {latestScan.city && (
                  <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-[0.24em]">{latestScan.city}</span>
                  </div>
                )}
              </div>
            </div>
          ), { duration: 10000, position: 'top-right' });
        }
      } catch {
        console.error("Scan monitor error");
      }
    };

    // Initial check
    checkScans();

    // Poll every 10 seconds
    const interval = setInterval(checkScans, 10000);
    return () => clearInterval(interval);
  }, []); // Only run once on mount

  return null;
}
