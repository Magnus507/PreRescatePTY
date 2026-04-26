"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/public/demo");
        const data = await res.json();
        if (data.shortCode) {
          router.replace(`/e/${data.shortCode}?demo=true`);
        } else {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    }
    load();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
       <Loader2 className="h-10 w-10 animate-spin text-primary" />
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Accediendo a la Obra Maestra...</p>
    </div>
  );
}
