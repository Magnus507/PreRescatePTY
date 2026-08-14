"use client";

import Link from "next/link";
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
      <div className="eyebrow">Acceso seguro - PreRescate V2</div>
      <h1>Entra a tu cuenta</h1>
      <p>Accede con tu correo y contrasena. La sesion queda protegida por Supabase Auth.</p>
      <form onSubmit={submit} className="card authCard">
        <label>
          Correo electronico
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        {status ? <p className="errorText">{status}</p> : null}
      </form>
      <div className="actions">
        <Link className="button secondary" href="/registro">
          Crear cuenta
        </Link>
        <Link className="button secondary" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
