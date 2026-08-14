"use client";

import Link from "next/link";
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
      setStatus("Las contrasenas no coinciden.");
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
      <div className="eyebrow">Registro - PreRescate V2</div>
      <h1>Crea tu cuenta</h1>
      <p>Tu cuenta sera el contenedor principal de tus perfiles, contactos y dispositivos.</p>
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
            autoComplete="new-password"
          />
        </label>

        <label>
          Confirmar contrasena
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
        {status ? <p className="muted" style={{ fontSize: 14 }}>{status}</p> : null}
      </form>
      <div className="actions">
        <Link className="button secondary" href="/login">
          Ya tengo cuenta
        </Link>
      </div>
    </main>
  );
}
