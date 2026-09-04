"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, QrCode, MessageCircle, Eye } from "lucide-react";
import Image from "next/image";

export default function DemoPage() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const demoUrl = `${window.location.origin}/e/DEMO-ADMIN-VIP?demo=true`;
    fetch(`/api/public/qr?data=${encodeURIComponent(demoUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setQrUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <div className="min-h-screen font-sans antialiased">
      <main id="main-content" className="relative overflow-hidden bg-[#030416] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(218,26,33,0.10),_transparent_30%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.03)_0%,transparent_60%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] border border-white/8 bg-gradient-to-b from-slate-900/80 to-slate-950/70 p-10 shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-black tracking-tight mb-4">Descubre cómo se ve un perfil de emergencia</h1>
              <p className="text-slate-300 max-w-2xl mx-auto">
                Escanea el código QR o abre el perfil de demostración para conocer la información que puede mostrarse en una situación de emergencia.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              {/* QR Code */}
              <div className="text-center">
                <div className="mx-auto mb-6 h-64 w-64 md:h-72 md:w-72 bg-white rounded-3xl border border-slate-200 shadow-lg flex items-center justify-center p-6">
                  {loading ? (
                    <Loader2 className="h-12 w-12 animate-spin text-slate-300" />
                  ) : qrUrl ? (
                    <Image src={qrUrl} alt="Código QR de demostración" width={288} height={288} unoptimized className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="h-24 w-24 text-slate-300" />
                  )}
                </div>
                <p className="text-sm text-slate-400 mb-2">Perfil ficticio de demostración</p>
                <p className="text-xs text-slate-500">Escanea con la cámara de tu celular</p>
              </div>

              {/* What demo shows */}
              <div>
                <h2 className="text-2xl font-bold mb-6">El perfil muestra:</h2>
                <ul className="space-y-3">
                  {[
                    "Nombre y foto",
                    "Tipo de sangre",
                    "Alergias",
                    "Condiciones médicas",
                    "Medicamentos",
                    "Contactos de emergencia",
                    "Instrucciones de comunicación",
                    "Retorno seguro",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500 mt-4 italic">
                  Los campos visibles dependen de la configuración del perfil.
                </p>
              </div>
            </div>

            {/* Manual contact explanation */}
            <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Contacto iniciado por la persona que escanea</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    El perfil incluye botones para llamar o abrir WhatsApp. La persona que realiza el escaneo debe iniciar la acción manualmente.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Si el navegador autoriza el acceso a ubicación, el mensaje puede incluir una posición aproximada.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Eye className="h-5 w-5 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Información de ejemplo, no datos reales</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    El perfil de demostración utiliza información ficticia. En una cuenta real, cada usuario decide qué campos serán visibles.
                  </p>
                  <Link href="/legal/privacidad" className="inline-flex items-center gap-2 mt-3 text-sm text-[#DA1A21] hover:text-white transition-colors">
                    Ver Política de Privacidad
                  </Link>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-12 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
                <Link
                  href="/e/DEMO-ADMIN-VIP?demo=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#DA1A21] font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
                >
                  Abrir perfil de demostración
                  <span className="text-xs opacity-70">(nueva pestaña)</span>
                </Link>
                <Link
                  href="/comprar"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  Crear tu propio perfil
                </Link>
              </div>
              <p className="text-center text-sm text-slate-400">
                El perfil se abrirá en una pestaña nueva para que puedas conservar esta guía.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
