"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setStatus(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="hero">
      <div className="eyebrow">Acceso seguro · PreRescate V2</div>
      <h1>Entra a tu cuenta</h1>
      <p>Accede con tu correo y contraseña. La sesión queda protegida por Supabase Auth.</p>
      <form onSubmit={submit} className="card" style={{ marginTop: 24, maxWidth: 520 }}>
        <label htmlFor="email"><strong>Correo electrónico</strong></label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" style={{ width: "100%", marginTop: 10, padding: 14, border: "1px solid #d9dde5", borderRadius: 12, fontSize: 16 }} />

        <label htmlFor="password" style={{ display: "block", marginTop: 16 }}><strong>Contraseña</strong></label>
        <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="current-password" style={{ width: "100%", marginTop: 10, padding: 14, border: "1px solid #d9dde5", borderRadius: 12, fontSize: 16 }} />

        <button className="button" type="submit" disabled={loading} style={{ border: 0, marginTop: 18 }}>{loading ? "Entrando..." : "Entrar"}</button>
        {status ? <p className="muted" style={{ fontSize: 14 }}>{status}</p> : null}
      </form>
      <div className="actions">
        <a className="button secondary" href="/registro">Crear cuenta</a>
        <a className="button secondary" href="/">Volver al inicio</a>
      </div>
    </main>
  );
}
