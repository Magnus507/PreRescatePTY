"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

export default function RecoveryCallbackPage() {
  const [message, setMessage] = useState("Validando recuperación...");

  useEffect(() => {
    async function finishRecovery() {
      const code = new URL(window.location.href).searchParams.get("code");
      if (!code) {
        setMessage("El enlace de recuperación no es válido.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage(`No pudimos validar el enlace: ${error.message}`);
        return;
      }

      window.location.replace("/restablecer");
    }

    finishRecovery();
  }, []);

  return <main className="hero"><div className="eyebrow">Seguridad · PreRescate V2</div><h1>{message}</h1><p>Estamos verificando tu solicitud.</p></main>;
}
