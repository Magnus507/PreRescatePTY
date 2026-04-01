"use client";

import { useEffect, useState } from "react";
import { RELATIONSHIPS } from "@/lib/constants";
import { Plus, Trash2, Users, Loader2, Save } from "lucide-react";

interface Contact {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string | null;
  priorityOrder: number;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  active: boolean;
}

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isServiceActive, setIsServiceActive] = useState(true);
  const [newContact, setNewContact] = useState({
    fullName: "", relationship: "Esposo/a", phone: "", email: "",
    notifyEmail: true, notifySms: false, notifyWhatsapp: false,
  });

  useEffect(() => {
    fetch("/api/dashboard/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts || []);
        if (data.isServiceActive !== undefined) {
          setIsServiceActive(data.isServiceActive);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/dashboard/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newContact,
        priorityOrder: contacts.length + 1,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setContacts((prev) => [...prev, data.contact]);
      setShowForm(false);
      setNewContact({ fullName: "", relationship: "Esposo/a", phone: "", email: "", notifyEmail: true, notifySms: false, notifyWhatsapp: false });
    }
    setSaving(false);
  }

  async function deleteContact(id: string) {
    if (!confirm("¿Eliminar este contacto de emergencia?")) return;
    const res = await fetch(`/api/dashboard/contacts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contactos de Emergencia</h1>
        {isServiceActive && contacts.length < 3 && (
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Agregar
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Estos contactos serán notificados automáticamente cuando alguien escanee tu chip en modo emergencia. Puedes agregar hasta 3 contactos.
      </p>

      {!isServiceActive && (
        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm flex items-start gap-4">
          <svg className="w-5 h-5 mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <div>
            <p className="font-semibold mb-1">Servicio de Edición Expirado (Modo Lectura)</p>
            <p>Se mantendrán los contactos configurados para emergencias, pero no puedes modificarlos ni eliminarlos. <a href="#" className="underline font-medium hover:text-orange-500">Renueva tu servicio</a>.</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={addContact} className="mb-6 p-6 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
          <h3 className="font-semibold">Nuevo Contacto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nombre Completo *</label>
              <input required value={newContact.fullName} onChange={(e) => setNewContact((f) => ({ ...f, fullName: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="María García" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Parentesco *</label>
              <select required value={newContact.relationship} onChange={(e) => setNewContact((f) => ({ ...f, relationship: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Teléfono *</label>
              <input required type="tel" value={newContact.phone} onChange={(e) => setNewContact((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+507 6000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email (opcional)</label>
              <input type="email" value={newContact.email} onChange={(e) => setNewContact((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="contacto@email.com" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newContact.notifyEmail} onChange={(e) => setNewContact((f) => ({ ...f, notifyEmail: e.target.checked }))} /> Notificar por Email</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newContact.notifySms} onChange={(e) => setNewContact((f) => ({ ...f, notifySms: e.target.checked }))} /> SMS</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newContact.notifyWhatsapp} onChange={(e) => setNewContact((f) => ({ ...f, notifyWhatsapp: e.target.checked }))} /> WhatsApp</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No tienes contactos de emergencia configurados.</p>
          <p className="text-sm mt-1">Agrega al menos 1 contacto para que sea notificado en caso de emergencia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact, i) => (
            <div key={contact.id} className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold">{contact.fullName}</p>
                  <p className="text-xs text-muted-foreground">{contact.relationship} · {contact.phone}</p>
                  <div className="flex gap-2 mt-1">
                    {contact.notifyEmail && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Email</span>}
                    {contact.notifySms && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">SMS</span>}
                    {contact.notifyWhatsapp && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">WhatsApp</span>}
                  </div>
                </div>
              </div>
              {isServiceActive && (
                <button onClick={() => deleteContact(contact.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
