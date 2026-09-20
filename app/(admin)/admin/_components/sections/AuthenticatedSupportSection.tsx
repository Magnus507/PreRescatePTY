"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, RefreshCw, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";

type AdminConversation = {
  id: string;
  subject: string;
  category: string;
  status: string;
  lastMessageAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  unreadCount: number;
  opener?: { email: string | null; phone: string | null } | null;
  latestMessage?: { body: string; senderType: string; createdAt: string } | null;
};

type AdminMessage = {
  id: string;
  senderType: string;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PA", { dateStyle: "short", timeStyle: "short" });
}

export function AuthenticatedSupportSection({ searchQuery }: { searchQuery: string }) {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ state: "all" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const response = await fetch(`/api/admin/support-conversations?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el chat.");
      setConversations(payload.conversations || []);
      setSelectedId((current) =>
        current && payload.conversations?.some((item: AdminConversation) => item.id === current)
          ? current
          : payload.conversations?.[0]?.id || null
      );
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : "No se pudo cargar el chat.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [searchQuery]);

  const loadMessages = useCallback(async (id: string, silent = false) => {
    try {
      const response = await fetch(`/api/admin/support-conversations/${id}/messages`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar la conversación.");
      setMessages(payload.messages || []);
      if (!silent) {
        setConversations((current) =>
          current.map((conversation) => conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation)
        );
      }
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : "No se pudo cargar la conversación.");
    }
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadConversations(true);
      if (selectedId) void loadMessages(selectedId, true);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages, selectedId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const response = await fetch(`/api/admin/support-conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply, isInternalNote: internal }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo enviar.");
      setReply("");
      setInternal(false);
      await Promise.all([loadMessages(selectedId, true), loadConversations(true)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar.");
    } finally {
      setSending(false);
    }
  }

  async function lifecycle(action: "resolve" | "reopen") {
    if (!selectedId) return;
    try {
      const response = await fetch(`/api/admin/support-conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar.");
      await loadConversations(true);
      toast.success(action === "resolve" ? "Conversación resuelta." : "Conversación reabierta.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.6rem] border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <MessageCircle className="h-5 w-5" />
            <p className="text-xs font-black uppercase tracking-[0.18em]">Chat autenticado</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Conversaciones iniciadas desde cuentas de clientes. Las notas internas nunca se envían al cliente.
          </p>
        </div>
        <button onClick={() => void loadConversations()} className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-indigo-700 dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-300">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="grid min-h-[560px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[360px_1fr]">
        <div className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="max-h-[560px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : conversations.length === 0 ? (
              <p className="p-8 text-center text-sm font-semibold text-slate-500">No hay conversaciones autenticadas.</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full border-b border-slate-100 p-4 text-left dark:border-slate-900 ${
                    selectedId === conversation.id ? "bg-primary/5" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-950 dark:text-white">{conversation.subject}</p>
                    {conversation.unreadCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black text-white">{conversation.unreadCount}</span>}
                  </div>
                  <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{conversation.opener?.email || "Cuenta autenticada"}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{conversation.latestMessage?.body || "Sin mensajes"}</p>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">{formatDate(conversation.lastMessageAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[560px] min-w-0 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm font-bold text-slate-400">Selecciona una conversación.</div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">{selected.subject}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{selected.opener?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void lifecycle(selected.resolvedAt ? "reopen" : "resolve")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-950"
                >
                  {selected.resolvedAt ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {selected.resolvedAt ? "Reabrir" : "Resolver"}
                </button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-5 dark:bg-slate-950">
                {messages.map((message) => {
                  const agent = message.senderType === "agent";
                  return (
                    <div key={message.id} className={`flex ${agent ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.isInternalNote
                          ? "border border-amber-300 bg-amber-50 text-amber-900"
                          : agent
                            ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                            : "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      }`}>
                        {message.isInternalNote && <p className="mb-1 text-[9px] font-black uppercase tracking-wider">Nota interna</p>}
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p className="mt-2 text-[9px] font-bold uppercase tracking-wide opacity-55">
                          {agent ? "Soporte" : "Cliente"} · {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!selected.closedAt && (
                <form onSubmit={send} className="border-t border-slate-200 p-4 dark:border-slate-800">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={2}
                    maxLength={5000}
                    placeholder={internal ? "Escribe una nota interna..." : "Responder al cliente..."}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
                      Nota interna
                    </label>
                    <button disabled={sending || !reply.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {internal ? "Guardar nota" : "Enviar"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
