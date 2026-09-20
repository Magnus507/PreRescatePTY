"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

type YappyElement = HTMLElement & {
  eventPayment: (input: { transactionId: string; documentName: string; token: string }) => void;
  isButtonLoading: boolean;
};

let yappyScriptPromise: Promise<void> | null = null;
const REFRESH_DELAYS_MS = [1200, 3000, 6000, 10000, 15000, 22000] as const;

function loadYappyScript(src: string) {
  if (customElements.get("btn-yappy")) return Promise.resolve();
  if (yappyScriptPromise) return yappyScriptPromise;

  yappyScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-yappy-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("yappy_sdk_error")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    script.dataset.yappySdk = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("yappy_sdk_error")), { once: true });
    document.head.appendChild(script);
  });

  return yappyScriptPromise;
}

export function YappyRenewalButton({ onPaymentUpdate }: { onPaymentUpdate: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState("");
  const phoneRef = useRef("");
  const callbackRef = useRef(onPaymentUpdate);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    callbackRef.current = onPaymentUpdate;
  }, [onPaymentUpdate]);

  useEffect(() => {
    let active = true;
    let element: YappyElement | null = null;
    const timers: number[] = [];

    const handleClick = async () => {
      if (!element) return;
      const normalizedPhone = phoneRef.current.replace(/\D/g, "").replace(/^507(?=\d{8}$)/, "");
      if (!/^\d{8}$/.test(normalizedPhone)) {
        toast.error("Ingresa tu numero Yappy de 8 digitos");
        element.isButtonLoading = false;
        return;
      }

      element.isButtonLoading = true;
      try {
        const response = await fetch("/api/payments/yappy/renewal/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ aliasYappy: normalizedPhone }),
        });
        const result = await response.json() as {
          paid?: boolean;
          transactionId?: string;
          documentName?: string;
          token?: string;
          buttonScriptUrl?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || "No se pudo iniciar Yappy");
        if (result.paid) {
          toast.success("La renovacion ya fue confirmada");
          callbackRef.current();
          return;
        }
        if (!result.transactionId || !result.documentName || !result.token) {
          throw new Error("Yappy devolvio una sesion invalida");
        }
        element.eventPayment({
          transactionId: result.transactionId,
          documentName: result.documentName,
          token: result.token,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo iniciar Yappy");
      } finally {
        if (element) element.isButtonLoading = false;
      }
    };

    const handleSuccess = () => {
      toast.success("Yappy confirmo la transaccion. Verificando renovacion...");
      REFRESH_DELAYS_MS.forEach((delay) => {
        timers.push(window.setTimeout(() => callbackRef.current(), delay));
      });
    };
    const handleError = () => toast.error("El pago no fue completado. Puedes intentarlo nuevamente.");

    async function setup() {
      try {
        const configResponse = await fetch("/api/payments/yappy/config", { cache: "no-store" });
        const config = await configResponse.json() as { available?: boolean; buttonScriptUrl?: string };
        if (!config.available || !config.buttonScriptUrl) {
          if (active) setAvailable(false);
          return;
        }
        await loadYappyScript(config.buttonScriptUrl);
        if (!active || !containerRef.current) return;

        element = document.createElement("btn-yappy") as YappyElement;
        element.setAttribute("theme", "blue");
        element.setAttribute("rounded", "true");
        element.addEventListener("eventClick", handleClick);
        element.addEventListener("eventSuccess", handleSuccess);
        element.addEventListener("eventError", handleError);
        containerRef.current.replaceChildren(element);
      } catch {
        if (active) setAvailable(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    setup();
    return () => {
      active = false;
      timers.forEach(window.clearTimeout);
      if (element) {
        element.removeEventListener("eventClick", handleClick);
        element.removeEventListener("eventSuccess", handleSuccess);
        element.removeEventListener("eventError", handleError);
        element.remove();
      }
    };
  }, []);

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-black text-slate-950">Renovar con Yappy</p>
            <p className="text-xs font-medium text-slate-500">Los 12 meses se aplican solo tras la confirmacion firmada de Yappy.</p>
          </div>
        </div>

        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            phoneRef.current = event.target.value;
            setPhone(event.target.value);
          }}
          placeholder="Numero Yappy: 61234567"
          aria-label="Numero de telefono Yappy"
          className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        />

        {loading && (
          <div className="flex h-12 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          </div>
        )}
        {available && <div ref={containerRef} className={`min-h-12 items-center justify-center ${loading ? "hidden" : "flex"}`} />}
        {!loading && !available && (
          <p className="text-center text-xs font-bold text-amber-700">Yappy automatico no esta disponible.</p>
        )}
      </div>
    </div>
  );
}
