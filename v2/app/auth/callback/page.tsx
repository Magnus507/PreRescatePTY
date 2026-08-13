"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Validando acceso...");

  useEffect(() => {
    let active = true;

    async function finishLogin() {
      const code = new URL(window.location.href).searchParams.get("code");
      if (!code) {
        if (active) setMessage("No se recibió un código de acceso válido.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (active) setMessage(`No pudimos iniciar sesión: ${error.message}`);
        return;
      }

      window.location.replace("/dashboard");
    }

    finishLogin();
    return () => { active = false; };
  }, []);

  return <main className="hero"><div className="eyebrow">PreRescate V2</div><h1>{message}</h1><p>Estamos terminando tu inicio de sesión seguro.</p></main>;
}
