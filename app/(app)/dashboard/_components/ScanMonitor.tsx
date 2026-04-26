'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { AlertCircle, MapPin, Zap } from 'lucide-react';

/**
 * ScanMonitor Component
 * Polls the scans API to detect new events and show immediate alerts.
 */
export function ScanMonitor() {
  const [lastScanId, setLastScanId] = useState<string | null>(null);
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
          setLastScanId(latestScan.id);
          lastScanIdRef.current = latestScan.id;
          isFirstLoad.current = false;
          return;
        }

        if (latestScan.id !== lastScanIdRef.current) {
          setLastScanId(latestScan.id);
          lastScanIdRef.current = latestScan.id;
          
          // Sound effect or high-priority toast
          toast.custom((t) => (
            <div className="bg-[#DA1A21] text-white p-6 rounded-[2rem] shadow-2xl flex items-start gap-4 animate-in slide-in-from-right duration-500 border-2 border-white/20">
              <div className="bg-white/20 p-3 rounded-2xl">
                <AlertCircle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-black uppercase tracking-widest text-[10px] opacity-70">Alerta de Seguridad</p>
                <p className="text-lg font-black leading-none uppercase tracking-tighter italic">¡CHIP ESCANEADO!</p>
                <p className="text-xs font-medium opacity-90">Un rescatista ha accedido a la ficha {latestScan.chip.serialPublic}.</p>
                {latestScan.city && (
                  <div className="flex items-center gap-1.5 mt-2 bg-white/10 px-2 py-1 rounded-lg w-fit">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px] font-bold">{latestScan.city}</span>
                  </div>
                )}
              </div>
            </div>
          ), { duration: 10000, position: 'top-right' });
        }
      } catch (e) {
        console.error("Scan monitor error", e);
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
