"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Mail,
  MessageCircle,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppSupportUrl, formatWhatsAppPhoneForDisplay } from "@/lib/support/whatsapp";
import { AuthenticatedSupportSection } from "./AuthenticatedSupportSection";

type SupportMessage = {
  id: string;
  name: string;
  email: string;
  whatsappPhone: string;
  message: string;
  readAt: string | null;
  readByUserId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type InboxResponse = {
  messages: SupportMessage[];
  total: number;
  counts: {
    unread: number;
    open: number;
    resolved: number;
  };
};

type Filter = "open" | "unread" | "read" | "resolved" | "all";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SupportMessagesSection({ searchQuery }: { searchQuery: string }) {
  const [filter, setFilter] = useState<Filter>("open");
  const [data, setData] = useState<InboxResponse>({
    messages: [],
    total: 0,
    counts: { unread: 0, open: 0, resolved: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => data.messages.find((message) => message.id === selectedId) ?? null,
    [data.messages, selectedId],
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ state: filter });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const response = await fetch(`/api/admin/support-messages?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar soporte.");

      setData(payload);
      setSelectedId((current) => {
        if (current && payload.messages.some((message: SupportMessage) => message.id === current)) {
          return current;
        }
        return payload.messages[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar soporte.");
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const mutate = useCallback(async (id: string, action: "mark-read" | "mark-unread" | "resolve" | "reopen", silent = false) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/support-messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el mensaje.");

      setData((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === id ? payload.message : message
        ),
        counts: {
          unread: current.counts.unread
            + (action === "mark-unread" ? 1 : 0)
            - (action === "mark-read" && !current.messages.find((m) => m.id === id)?.readAt ? 1 : 0)
            - (action === "resolve" && !current.messages.find((m) => m.id === id)?.readAt ? 1 : 0),
          open: current.counts.open + (action === "reopen" ? 1 : 0) - (action === "resolve" ? 1 : 0),
          resolved: current.counts.resolved + (action === "resolve" ? 1 : 0) - (action === "reopen" ? 1 : 0),
        },
      }));

      if (!silent) {
        toast.success(
          action === "resolve"
            ? "Mensaje marcado como resuelto."
            : action === "reopen"
              ? "Mensaje reabierto."
              : action === "mark-unread"
                ? "Mensaje marcado como no leído."
                : "Mensaje marcado como leído.",
        );
      }

      if (action === "resolve" && filter !== "all" && filter !== "resolved") {
        await loadMessages();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el mensaje.");
    } finally {
      setActionLoading(false);
    }
  }, [filter, loadMessages]);

  const selectMessage = useCallback((message: SupportMessage) => {
    setSelectedId(message.id);
    if (!message.readAt) {
      void mutate(message.id, "mark-read", true);
    }
  }, [mutate]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "open", label: "Abiertos" },
    { id: "unread", label: "No leídos" },
    { id: "read", label: "Leídos" },
    { id: "resolved", label: "Resueltos" },
    { id: "all", label: "Todos" },
  ];

  return (
    <section className="space-y-8">
      <AuthenticatedSupportSection searchQuery={searchQuery} />
      <div className="border-t border-slate-200 pt-7 dark:border-slate-800">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Formulario público / bandeja histórica</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">No leídos</p>
            <Circle className="h-4 w-4 fill-red-500 text-red-500" />
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{data.counts.unread}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Abiertos</p>
            <Clock3 className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{data.counts.open}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Resueltos</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{data.counts.resolved}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-2xl px-4 py-2 text-xs font-black transition ${
                filter === item.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void loadMessages()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:border-primary/30 hover:text-primary disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[390px_1fr]">
        <div className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              <p className="font-black text-slate-950 dark:text-white">Bandeja de soporte</p>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-900">
                {data.total}
              </span>
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {loading && data.messages.length === 0 ? (
              <div className="p-8 text-center text-sm font-semibold text-slate-500">Cargando mensajes…</div>
            ) : data.messages.length === 0 ? (
              <div className="p-8 text-center text-sm font-semibold text-slate-500">No hay mensajes en este filtro.</div>
            ) : (
              data.messages.map((message) => {
                const isActive = selectedId === message.id;
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => selectMessage(message)}
                    className={`w-full border-b border-slate-100 p-5 text-left transition dark:border-slate-900 ${
                      isActive
                        ? "bg-primary/5"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        message.resolvedAt
                          ? "bg-emerald-500"
                          : message.readAt
                            ? "bg-slate-300 dark:bg-slate-700"
                            : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.45)]"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-sm ${
                            message.readAt ? "font-bold text-slate-700 dark:text-slate-300" : "font-black text-slate-950 dark:text-white"
                          }`}>
                            {message.name}
                          </p>
                          {message.resolvedAt && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600">
                              Resuelto
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{message.message}</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="min-w-0">
          {!selected ? (
            <div className="flex min-h-[620px] flex-col items-center justify-center gap-3 p-8 text-center text-slate-400">
              <MessageSquareText className="h-12 w-12 opacity-20" />
              <p className="text-sm font-black">Selecciona un mensaje para verlo.</p>
            </div>
          ) : (
            <div className="flex min-h-[620px] flex-col">
              <div className="border-b border-slate-200 p-6 dark:border-slate-800 sm:p-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{selected.name}</h2>
                      {!selected.readAt && (
                        <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-red-600">Nuevo</span>
                      )}
                      {selected.resolvedAt && (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-600">Resuelto</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{formatDate(selected.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={buildWhatsAppSupportUrl(selected.whatsappPhone, selected.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-500"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Responder por WhatsApp
                    </a>
                    <a
                      href={`mailto:${selected.email}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-primary/30 hover:text-primary dark:border-slate-800 dark:text-slate-300"
                    >
                      <Mail className="h-4 w-4" />
                      Correo
                    </a>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">WhatsApp</p>
                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatWhatsAppPhoneForDisplay(selected.whatsappPhone)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Correo</p>
                    <p className="mt-1 break-all text-sm font-black text-slate-900 dark:text-white">{selected.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Mensaje</p>
                <div className="mt-3 whitespace-pre-wrap rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {selected.message}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-800 sm:px-8">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void mutate(selected.id, selected.readAt ? "mark-unread" : "mark-read")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-primary/30 hover:text-primary disabled:opacity-50 dark:border-slate-800 dark:text-slate-300"
                >
                  <Circle className="h-4 w-4" />
                  {selected.readAt ? "Marcar no leído" : "Marcar leído"}
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void mutate(selected.id, selected.resolvedAt ? "reopen" : "resolve")}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black text-white transition disabled:opacity-50 ${
                    selected.resolvedAt ? "bg-slate-700 hover:bg-slate-600" : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {selected.resolvedAt ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {selected.resolvedAt ? "Reabrir caso" : "Marcar resuelto"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
