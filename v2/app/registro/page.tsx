"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (password !== confirmPassword) {
      setStatus("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setStatus("Cuenta creada. Si Supabase solicita confirmar el correo, revisa tu bandeja de entrada una sola vez.");
  }

  return (
    <main className="hero">
      <div className="eyebrow">Registro · PreRescate V2</div>
      <h1>Crea tu cuenta</h1>
      <p>Tu cuenta será el contenedor principal de tus perfiles, contactos y dispositivos.</p>
      <form onSubmit={submit} className="card" style={{ marginTop: 24, maxWidth: 520 }}>
        <label htmlFor="email"><strong>Correo electrónico</strong></label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" style={{ width: "100%", marginTop: 10, padding: 14, border: "1px solid #d9dde5", borderRadius: 12, fontSize: 16 }} />

        <label htmlFor="password" style={{ display: "block", marginTop: 16 }}><strong>Contraseña</strong></label>
        <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" style={{ width: "100%", marginTop: 10, padding: 14, border: "1px solid #d9dde5", borderRadius: 12, fontSize: 16 }} />

        <label htmlFor="confirmPassword" style={{ display: "block", marginTop: 16 }}><strong>Confirmar contraseña</strong></label>
        <input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" style={{ width: "100%", marginTop: 10, padding: 14, border: "1px solid #d9dde5", borderRadius: 12, fontSize: 16 }} />

        <button className="button" type="submit" disabled={loading} style={{ border: 0, marginTop: 18 }}>{loading ? "Creando..." : "Crear cuenta"}</button>
        {status ? <p className="muted" style={{ fontSize: 14 }}>{status}</p> : null}
      </form>
      <div className="actions">
        <a className="button secondary" href="/login">Ya tengo cuenta</a>
      </div>
    </main>
  );
}
