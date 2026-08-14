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
  account_id: string;
  role: string;
  status: string;
};

type CountRow = {
  account_id: string;
};

function countByAccount(rows: CountRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.account_id] = (acc[row.account_id] ?? 0) + 1;
    return acc;
  }, {});
}

export default function ClientesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profileCounts, setProfileCounts] = useState<Record<string, number>>({});
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createSupabaseBrowserClient();
      const [accountsResult, membersResult, profilesResult, assignmentsResult] = await Promise.all([
        supabase.from("v2_accounts").select("id,account_type,status,created_at").order("created_at", { ascending: false }),
        supabase.from("v2_account_members").select("account_id,role,status").eq("status", "active"),
        supabase.from("v2_profiles").select("account_id").eq("status", "active"),
        supabase.from("v2_device_assignments").select("account_id").is("ended_at", null),
      ]);

      if (!active) return;

      if (accountsResult.error || membersResult.error || profilesResult.error || assignmentsResult.error) {
        setError(
          accountsResult.error?.message ||
            membersResult.error?.message ||
            profilesResult.error?.message ||
            assignmentsResult.error?.message ||
            "No se pudieron cargar los clientes.",
        );
      } else {
        setAccounts((accountsResult.data ?? []) as Account[]);
        setMembers((membersResult.data ?? []) as Member[]);
        setProfileCounts(countByAccount((profilesResult.data ?? []) as CountRow[]));
        setDeviceCounts(countByAccount((assignmentsResult.data ?? []) as CountRow[]));
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function membersFor(accountId: string) {
    return members.filter((member) => member.account_id === accountId);
  }

  return (
    <main className="main">
      <div className="eyebrow">Administracion</div>
      <div className="topbar">
        <div>
          <h1 className="title">Clientes</h1>
          <p className="muted">Cuentas creadas en la plataforma V2.</p>
        </div>
        <span className="badge">{loading ? "Cargando" : `${accounts.length} cuentas`}</span>
      </div>

      {error ? (
        <section className="card dangerCard" style={{ marginBottom: 18 }}>
          <strong>No se pudieron cargar los clientes</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="card">
        {loading ? (
          <p className="muted">Cargando clientes...</p>
        ) : accounts.length === 0 ? (
          <p className="muted">Sin clientes V2 todavia.</p>
        ) : (
          <div className="list">
            {accounts.map((account) => {
              const accountMembers = membersFor(account.id);
              return (
                <div className="row stackRow" key={account.id}>
                  <div>
                    <strong>{account.account_type} - {account.status}</strong>
                    <div className="muted">Creada {new Date(account.created_at).toLocaleString("es-PA")}</div>
                    <div className="muted">{accountMembers.length} miembro(s)</div>
                  </div>
                  <div className="linkChips">
                    <span className="chip">{profileCounts[account.id] ?? 0} perfiles</span>
                    <span className="chip">{deviceCounts[account.id] ?? 0} dispositivos</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
