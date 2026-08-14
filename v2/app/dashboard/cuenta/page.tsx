"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Account = {
  id: string;
  account_type: string;
  status: string;
  created_at: string;
};

type Member = {
  role: string;
  status: string;
  account_id: string;
};

export default function CuentaPage() {
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        setError(userError?.message || "No hay una sesion activa.");
        setLoading(false);
        return;
      }

      setEmail(user.email || "");

      const { data: membership, error: membershipError } = await supabase
        .from("v2_account_members")
        .select("account_id,role,status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership) {
        setError(membershipError?.message || "No encontramos una cuenta activa para este usuario.");
        setLoading(false);
        return;
      }

      setMember(membership as Member);

      const { data: accountData, error: accountError } = await supabase
        .from("v2_accounts")
        .select("id,account_type,status,created_at")
        .eq("id", membership.account_id)
        .maybeSingle();

      if (accountError) {
        setError(accountError.message);
      } else {
        setAccount(accountData as Account | null);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="main">
      <div className="eyebrow">Mi cuenta</div>
      <div className="topbar">
        <div>
          <h1 className="title">Cuenta y sesion</h1>
          <p className="muted">Datos basicos de acceso y membresia V2.</p>
        </div>
        <button className="button secondary" onClick={signOut} type="button">
          Cerrar sesion
        </button>
      </div>

      {error ? (
        <section className="card dangerCard" style={{ marginBottom: 18 }}>
          <strong>No se pudo cargar la cuenta</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="grid">
        <article className="card">
          <div className="eyebrow">Correo</div>
          <h2>{loading ? "Cargando..." : email || "Sin correo"}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Rol</div>
          <h2>{loading ? "Cargando..." : member?.role || "Sin rol"}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Cuenta</div>
          <h2>{loading ? "Cargando..." : account?.account_type || "Personal"}</h2>
        </article>
        <article className="card">
          <div className="eyebrow">Estado</div>
          <h2>{loading ? "Cargando..." : account?.status || member?.status || "Activa"}</h2>
        </article>
      </section>

      <section className="section card">
        <div className="eyebrow">Nota operativa</div>
        <h2>V2 aislada</h2>
        <p className="muted">
          Esta cuenta pertenece al flujo nuevo. No cambia tablas legacy ni afecta la web de produccion actual.
        </p>
      </section>
    </main>
  );
}
