"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setLoading(false);
    setStatus(error ? error.message : "Revisa tu correo: te enviamos un enlace seguro para entrar.");
  }

  return (
    <main className="hero">
      <div className="eyebrow">Acceso seguro · PreRescate V2</div>
      <h1>Entra a tu cuenta</h1>
      <p>Usaremos un enlace de acceso enviado a tu correo. No necesitas crear una contraseña.</p>
      <form onSubmit={submit} className="card" style={{marginTop:24,maxWidth:520}}>
        <label htmlFor="email"><strong>Correo electrónico</strong></label>
        <input id="email" type="email" value={email} onChange={(event)=>setEmail(event.target.value)} required style={{width:"100%",marginTop:10,padding:14,border:"1px solid #d9dde5",borderRadius:12,fontSize:16}} />
        <button className="button" type="submit" disabled={loading} style={{border:0,marginTop:14}}>{loading ? "Enviando..." : "Enviar enlace de acceso"}</button>
        {status ? <p className="muted" style={{fontSize:14}}>{status}</p> : null}
      </form>
      <div className="actions"><a className="button secondary" href="/">Volver al inicio</a></div>
    </main>
  );
}
