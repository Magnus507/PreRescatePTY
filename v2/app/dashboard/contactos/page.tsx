"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Contact = {
  id: string;
  name: string;
  relationship: string | null;
  phone: string;
  email: string | null;
  status: string;
};

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
};

function profileName(profile: Profile) {
  return (profile.preferred_name || `${profile.first_name} ${profile.last_name}`).trim();
}

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Debes iniciar sesion para gestionar contactos.");
      setLoading(false);
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("v2_account_members")
      .select("account_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      setError(membershipError?.message || "No encontramos una cuenta activa para este usuario.");
      setLoading(false);
      return;
    }

    setAccountId(membership.account_id);

    const [contactsResult, profilesResult] = await Promise.all([
      supabase
        .from("v2_emergency_contacts")
        .select("id,name,relationship,phone,email,status")
        .eq("account_id", membership.account_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("v2_profiles")
        .select("id,first_name,last_name,preferred_name")
        .eq("account_id", membership.account_id)
        .order("first_name"),
    ]);

    if (contactsResult.error || profilesResult.error) {
      setError(contactsResult.error?.message || profilesResult.error?.message || "No se pudieron cargar los datos.");
    } else {
      setContacts((contactsResult.data ?? []) as Contact[]);
      setProfiles((profilesResult.data ?? []) as Profile[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const profileId = String(form.get("profile_id") || "").trim();
    const showPublicly = form.get("show_publicly") === "on";
    const supabase = createSupabaseBrowserClient();

    if (!accountId) {
      setSaving(false);
      setError("No encontramos una cuenta activa para este usuario.");
      return;
    }

    const { data: contact, error: insertError } = await supabase
      .from("v2_emergency_contacts")
      .insert({
        account_id: accountId,
        name: String(form.get("name") || "").trim(),
        relationship: String(form.get("relationship") || "").trim() || null,
        phone: String(form.get("phone") || "").trim(),
        email: String(form.get("email") || "").trim() || null,
      })
      .select("id")
      .single();

    if (insertError || !contact) {
      setSaving(false);
      setError(insertError?.message || "No se pudo crear el contacto.");
      return;
    }

    if (profileId) {
      const { error: linkError } = await supabase.from("v2_profile_emergency_contacts").insert({
        profile_id: profileId,
        contact_id: contact.id,
        show_publicly: showPublicly,
      });

      if (linkError) {
        setSaving(false);
        setError(linkError.message);
        return;
      }
    }

    event.currentTarget.reset();
    setSaving(false);
    await load();
  }

  return (
    <main className="main">
      <div className="eyebrow">Mi cuenta</div>
      <div className="topbar">
        <div>
          <h1 className="title">Contactos</h1>
          <p className="muted">Gestiona personas de auxilio y enlazalas al perfil correcto.</p>
        </div>
        <span className="badge">{loading ? "Cargando" : `${contacts.length} contactos`}</span>
      </div>

      {error ? (
        <section className="card" style={{ marginBottom: 18 }}>
          <strong>No se pudieron guardar los cambios</strong>
          <p className="errorText">{error}</p>
        </section>
      ) : null}

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>Agregar contacto</h2>
        <form className="section" onSubmit={submit}>
          <div className="formgrid">
            <label>
              Nombre
              <input name="name" required />
            </label>
            <label>
              Relacion
              <input name="relationship" placeholder="Mama, hermano, medico..." />
            </label>
            <label>
              Telefono
              <input name="phone" required />
            </label>
            <label>
              Email
              <input name="email" type="email" />
            </label>
            <label>
              Enlazar a perfil
              <select name="profile_id" defaultValue="">
                <option value="">Sin enlace por ahora</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profileName(profile)}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ alignSelf: "end" }}>
              <input name="show_publicly" type="checkbox" defaultChecked /> Visible en emergencia
            </label>
          </div>
          <div className="actions">
            <button className="button" type="submit" disabled={saving || loading}>
              {saving ? "Guardando..." : "Agregar contacto"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Contactos guardados</h2>
        <div className="list" style={{ marginTop: 16 }}>
          {loading ? (
            <div className="row">
              <strong>Cargando contactos</strong>
              <span>Un momento</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="row">
              <strong>Sin contactos</strong>
              <span>Agrega el primero arriba</span>
            </div>
          ) : (
            contacts.map((contact) => (
              <div className="row" key={contact.id}>
                <div>
                  <strong>{contact.name}</strong>
                  <div className="muted">{contact.relationship || "Contacto"} - {contact.status}</div>
                </div>
                <span>{contact.phone}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
