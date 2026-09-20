"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, MessageCircle, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

type Conversation = {
  id: string;
  subject: string;
  category: string;
  status: string;
  lastMessageAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  unreadCount: number;
  latestMessage?: { body: string; senderType: string; createdAt: string } | null;
};

type Message = {
  id: string;
  senderType: "client" | "agent" | "system";
  body: string;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PA", { dateStyle: "short", timeStyle: "short" });
}

export default function SupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMode, setNewMode] = useState(false);
  const [subject, setSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [reply, setReply] = useState("");

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/support/conversations", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar soporte.");
      setConversations(payload.conversations || []);
      setSelectedId((current) => current || payload.conversations?.[0]?.id || null);
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : "No se pudo cargar soporte.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string, silent = false) => {
    try {
      const response = await fetch(`/api/support/conversations/${conversationId}/messages`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar la conversación.");
      setMessages(payload.messages || []);
      if (!silent) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
          )
        );
      }
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : "No se pudo cargar la conversación.");
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadConversations(true);
      if (selectedId) void loadMessages(selectedId, true);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages, selectedId]);

  async function createConversation(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/support/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "general", subject, body: newBody }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo abrir la conversación.");
      setSubject("");
      setNewBody("");
      setNewMode(false);
      await loadConversations(true);
      setSelectedId(payload.conversation.id);
      toast.success("Conversación abierta.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la conversación.");
    } finally {
      setSending(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const response = await fetch(`/api/support/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo enviar el mensaje.");
      setReply("");
      await Promise.all([loadMessages(selectedId, true), loadConversations(true)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DA1A21]/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#DA1A21]">
              <MessageCircle className="h-4 w-4" /> Soporte directo
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Habla con soporte</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Este canal permanece disponible aunque tu acceso anual de administración esté vencido.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNewMode(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#DA1A21] px-5 py-3 text-xs font-black uppercase tracking-wider text-white"
          >
            <Plus className="h-4 w-4" /> Nueva consulta
          </button>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-xs font-semibold leading-5">
            Este chat no es un servicio de emergencias. Si existe una emergencia real, contacta al 911 o al servicio oficial correspondiente.
          </p>
        </div>
      </section>

      {newMode && (
        <form onSubmit={createConversation} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <h2 className="text-lg font-black text-slate-950">Nueva consulta</h2>
          <div className="mt-5 space-y-4">
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              minLength={3}
              maxLength={160}
              placeholder="Asunto"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#DA1A21]/20"
            />
            <textarea
              value={newBody}
              onChange={(event) => setNewBody(event.target.value)}
              required
              maxLength={5000}
              rows={5}
              placeholder="Describe lo que necesitas..."
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#DA1A21]/20"
            />
            <div className="flex flex-wrap gap-2">
              <button disabled={sending} className="rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50">
                {sending ? "Enviando..." : "Abrir conversación"}
              </button>
              <button type="button" onClick={() => setNewMode(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black text-slate-600">
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      <section className="grid min-h-[620px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Conversaciones</p>
            <button onClick={() => void loadConversations()} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50" aria-label="Actualizar">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-[#DA1A21]" /></div>
            ) : conversations.length === 0 ? (
              <p className="p-8 text-center text-sm font-semibold text-slate-500">Todavía no tienes consultas.</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full border-b border-slate-100 p-4 text-left transition ${
                    selectedId === conversation.id ? "bg-[#DA1A21]/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{conversation.subject}</p>
                    {conversation.unreadCount > 0 && (
                      <span className="rounded-full bg-[#DA1A21] px-2 py-0.5 text-[9px] font-black text-white">{conversation.unreadCount}</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {conversation.latestMessage?.body || "Sin mensajes"}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{formatDate(conversation.lastMessageAt)}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-[620px] min-w-0 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm font-bold text-slate-400">
              Selecciona una conversación o abre una nueva.
            </div>
          ) : (
            <>
              <header className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-black text-slate-950">{selected.subject}</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {selected.closedAt ? "Cerrada" : selected.resolvedAt ? "Resuelta" : "Abierta"}
                </p>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4 sm:p-6">
                {messages.map((message) => {
                  const client = message.senderType === "client";
                  return (
                    <div key={message.id} className={`flex ${client ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        client ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p className={`mt-2 text-[9px] font-bold uppercase tracking-wide ${client ? "text-slate-400" : "text-slate-400"}`}>
                          {client ? "Tú" : "Soporte"} · {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!selected.closedAt && (
                <form onSubmit={sendReply} className="border-t border-slate-200 p-4 sm:p-5">
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={5000}
                      rows={2}
                      placeholder="Escribe tu mensaje..."
                      className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#DA1A21]/20"
                    />
                    <button disabled={sending || !reply.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DA1A21] text-white disabled:opacity-40" aria-label="Enviar">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
