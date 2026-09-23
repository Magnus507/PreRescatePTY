"use client";

import { useState } from "react";

type Status =
  | { type: "idle"; message: "" }
  | { type: "success" | "error"; message: string };

export default function ContactFormLite() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsappPhone: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/contacts/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.error || "No pudimos enviar tu mensaje. Intenta nuevamente.",
        });
        return;
      }

      setForm({ name: "", email: "", whatsappPhone: "", message: "" });
      setStatus({
        type: "success",
        message: data.message || "Mensaje enviado. Te responderemos por los canales disponibles.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "No pudimos conectar con el servidor. Intenta nuevamente.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Nombre
          <input
            required
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-[#1d66b0]"
            placeholder="Tu nombre"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Correo
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-[#1d66b0]"
            placeholder="nombre@ejemplo.com"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">
          WhatsApp
          <input
            type="tel"
            autoComplete="tel"
            value={form.whatsappPhone}
            onChange={(event) =>
              setForm((current) => ({ ...current, whatsappPhone: event.target.value }))
            }
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-[#1d66b0]"
            placeholder="+507 6000-0000"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-slate-700 sm:col-span-2">
          Mensaje
          <textarea
            required
            rows={6}
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-[#1d66b0]"
            placeholder="Cuéntanos cómo podemos ayudarte"
          />
        </label>
      </div>

      {status.type !== "idle" ? (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {status.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="mt-5 min-h-12 w-full rounded-xl bg-[#da1a21] px-5 text-sm font-black text-white disabled:opacity-60"
      >
        {sending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
