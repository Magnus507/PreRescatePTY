"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Copy, Download, ExternalLink, Factory, Loader2, PackageCheck, Plus, Printer, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { buildProductionQcChecklist } from "@/lib/operations/production-qc-checklist";

type FinishedGood = {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
};

type PrintOrder = {
  id: string;
  code: string;
  status: string;
};

type Unit = {
  id: string;
  qaStatus: string | null;
  status: string;
  activationStatus: string | null;
  reservedOrderId: string | null;
};

type DigitalItem = {
  id: string;
  internalLabel: string;
  shortCode: string | null;
  qrUrl: string | null;
  nfcUrl: string | null;
  nfcProgrammed: boolean;
  qrPrepared: boolean;
  activationUrl?: string | null;
  activationCode?: string | null;
  activationCodeLast4?: string | null;
  status: string;
  finishedGoodUnitId?: string | null;
  qaStatus?: string | null;
  inventoryStatus?: string | null;
  activationStatus?: string | null;
  reservedOrderId?: string | null;
  finishedGoodUnits?: Unit[];
  printOrderItems?: Array<{ printOrder: PrintOrder }>;
};

type ProductionOrder = {
  id: string;
  code: string;
  title: string;
  status: string;
  plannedQuantity: number;
  producedQuantity: number;
  outputType: string;
  createdAt: string;
  updatedAt: string;
  digitalItems?: DigitalItem[];
};

type ProductionFilter = "active" | "completed" | "all";

const STATUS_LABELS: Record<string, string> = {
  draft: "Pendiente",
  planned: "Preparando",
  sent_to_print: "Imprenta",
  print_received: "Recibida",
  started: "Ensamblaje",
  paused: "Pausada",
  qa_pending: "QC",
  completed: "Completada",
  cancelled: "Cancelada",
};

function getUnit(item: DigitalItem) {
  return item.finishedGoodUnits?.find((unit) => unit.id === item.finishedGoodUnitId)
    || item.finishedGoodUnits?.[0]
    || null;
}

const STICKER_TEMPLATE_PATH = "/sticker-official.png";
const ACTIVATION_CARD_TEMPLATE_PATHS = ["/activation-code-card-base-v2.webp", "/activation-code-card-base.svg"] as const;
const ACTIVATION_CARD_REFERENCE = {
  width: 1559,
  height: 1009,
  exportScale: 1,
  activationCodeX: 1067,
  activationCodeY: 389,
  activationCodeMaxWidth: 590,
  identifierX: 1067,
  identifierY: 596,
  identifierMaxWidth: 590,
  qrX: 216,
  qrY: 309,
  qrSize: 304,
} as const;

const STICKER_REFERENCE = {
  width: 2048,
  height: 1365,
  qrX: 1434,
  qrY: 506,
  qrSize: 440,
} as const;

function sanitizeFilename(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getDigitalItemQrTarget(item: DigitalItem) {
  if (item.qrUrl) return item.qrUrl;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.prerescatepty.com";
  if (item.shortCode) return `${origin}/e/${item.shortCode}`;
  if (item.nfcUrl) {
    try {
      const url = new URL(item.nfcUrl, origin);
      url.searchParams.delete("source");
      return url.toString();
    } catch {
      return item.nfcUrl;
    }
  }
  return item.activationUrl || null;
}

async function fetchQrPng(targetUrl: string) {
  const response = await fetch(`/api/public/qr?data=${encodeURIComponent(targetUrl)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo generar el QR");
  return response.blob();
}

function loadBrowserImage(src: string, label = "la imagen") {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${label}`));
    image.src = src;
  });
}

async function loadFirstAvailableImage(sources: readonly string[], label: string) {
  let lastError: unknown = null;

  for (const src of sources) {
    try {
      return await loadBrowserImage(src, label);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(`No se pudo cargar ${label}`);
}

async function renderStickerPng(targetUrl: string, preparedQr?: Blob) {
  const qrBlob = preparedQr || await fetchQrPng(targetUrl);
  const qrObjectUrl = URL.createObjectURL(qrBlob);

  try {
    const [template, qrImage] = await Promise.all([
      loadBrowserImage(STICKER_TEMPLATE_PATH, "la plantilla del sticker"),
      loadBrowserImage(qrObjectUrl, "el QR"),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = template.naturalWidth || template.width;
    canvas.height = template.naturalHeight || template.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar el sticker");

    context.drawImage(template, 0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / STICKER_REFERENCE.width;
    const scaleY = canvas.height / STICKER_REFERENCE.height;
    const qrSize = Math.round(STICKER_REFERENCE.qrSize * Math.min(scaleX, scaleY));
    const qrX = Math.round(STICKER_REFERENCE.qrX * scaleX);
    const qrY = Math.round(STICKER_REFERENCE.qrY * scaleY);

    context.imageSmoothingEnabled = false;
    context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!output) throw new Error("No se pudo exportar el sticker");
    return output;
  } finally {
    URL.revokeObjectURL(qrObjectUrl);
  }
}

async function renderActivationCardPng(item: DigitalItem, preparedQr?: Blob) {
  if (!item.activationCode) throw new Error("Código de activación no disponible");

  const target = getDigitalItemQrTarget(item);
  const qrBlob = target ? (preparedQr || await fetchQrPng(target)) : null;
  const qrObjectUrl = qrBlob ? URL.createObjectURL(qrBlob) : null;

  try {
    const template = await loadFirstAvailableImage(
      ACTIVATION_CARD_TEMPLATE_PATHS,
      "la plantilla de la tarjeta de activación",
    );
    const qrImage = qrObjectUrl ? await loadBrowserImage(qrObjectUrl, "el QR") : null;

    const canvas = document.createElement("canvas");
    canvas.width = ACTIVATION_CARD_REFERENCE.width * ACTIVATION_CARD_REFERENCE.exportScale;
    canvas.height = ACTIVATION_CARD_REFERENCE.height * ACTIVATION_CARD_REFERENCE.exportScale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la tarjeta de activación");

    context.scale(ACTIVATION_CARD_REFERENCE.exportScale, ACTIVATION_CARD_REFERENCE.exportScale);
    context.drawImage(
      template,
      0,
      0,
      ACTIVATION_CARD_REFERENCE.width,
      ACTIVATION_CARD_REFERENCE.height,
    );

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#ffffff";
    context.shadowColor = "rgba(0, 0, 0, 0.65)";
    context.shadowBlur = 3;
    context.font = '800 39px Arial, Helvetica, sans-serif';
    context.fillText(
      item.activationCode,
      ACTIVATION_CARD_REFERENCE.activationCodeX,
      ACTIVATION_CARD_REFERENCE.activationCodeY,
      ACTIVATION_CARD_REFERENCE.activationCodeMaxWidth,
    );

    context.font = '700 27px Arial, Helvetica, sans-serif';
    context.fillText(
      item.internalLabel,
      ACTIVATION_CARD_REFERENCE.identifierX,
      ACTIVATION_CARD_REFERENCE.identifierY,
      ACTIVATION_CARD_REFERENCE.identifierMaxWidth,
    );

    context.shadowColor = "transparent";
    context.shadowBlur = 0;

    if (qrImage) {
      context.imageSmoothingEnabled = false;
      context.drawImage(
        qrImage,
        ACTIVATION_CARD_REFERENCE.qrX,
        ACTIVATION_CARD_REFERENCE.qrY,
        ACTIVATION_CARD_REFERENCE.qrSize,
        ACTIVATION_CARD_REFERENCE.qrSize,
      );
    }

    const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!output) throw new Error("No se pudo exportar la tarjeta de activación");
    return output;
  } finally {
    if (qrObjectUrl) URL.revokeObjectURL(qrObjectUrl);
  }
}

function escapeCsv(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildActivationText(item: DigitalItem, targetUrl: string | null) {
  return [
    `IDENTIFICADOR: ${item.internalLabel}`,
    `CODIGO DE ACTIVACION: ${item.activationCode || "PENDIENTE"}`,
    `URL PUBLICA: ${targetUrl || "PENDIENTE"}`,
    "",
  ].join("\n");
}

function buildCodesCsv(items: DigitalItem[]) {
  const header = ["IDENTIFICADOR", "CODIGO_ACTIVACION", "URL_PUBLICA"];
  const rows = items.map((item) => {
    const target = getDigitalItemQrTarget(item);
    return [
      escapeCsv(item.internalLabel),
      escapeCsv(item.activationCode || "PENDIENTE"),
      escapeCsv(target || "PENDIENTE"),
    ].join(",");
  });
  return new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function asBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function createStoredZip(files: Array<{ name: string; blob: Blob }>) {
  const encoder = new TextEncoder();
  const entries: Array<{
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    offset: number;
  }> = [];
  const chunks: BlobPart[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, checksum, true);
    view.setUint32(18, data.byteLength, true);
    view.setUint32(22, data.byteLength, true);
    view.setUint16(26, nameBytes.byteLength, true);
    view.setUint16(28, 0, true);

    entries.push({ nameBytes, data, crc: checksum, offset });
    chunks.push(asBlobPart(localHeader), asBlobPart(nameBytes), asBlobPart(data));
    offset += localHeader.byteLength + nameBytes.byteLength + data.byteLength;
  }

  const centralDirectoryOffset = offset;

  for (const entry of entries) {
    const centralHeader = new Uint8Array(46);
    const view = new DataView(centralHeader.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.data.byteLength, true);
    view.setUint32(24, entry.data.byteLength, true);
    view.setUint16(28, entry.nameBytes.byteLength, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);

    chunks.push(asBlobPart(centralHeader), asBlobPart(entry.nameBytes));
    offset += centralHeader.byteLength + entry.nameBytes.byteLength;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, centralDirectoryOffset, true);
  endView.setUint16(20, 0, true);
  chunks.push(asBlobPart(end));

  return new Blob(chunks, { type: "application/zip" });
}

export default function DirectProductionSection() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<FinishedGood[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductionOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [downloadKey, setDownloadKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [finishedGoodId, setFinishedGoodId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [creating, setCreating] = useState(false);
  const [productionFilter, setProductionFilter] = useState<ProductionFilter>("active");

  const copyToClipboard = useCallback(async (value: string | null | undefined, label: string) => {
    if (!value) return toast.error(`${label} no disponible`);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error(`No se pudo copiar ${label}`);
    }
  }, []);

  const downloadQrPng = useCallback(async (item: DigitalItem) => {
    const target = getDigitalItemQrTarget(item);
    if (!target) return toast.error("QR no disponible para esta unidad");
    const key = `qr-${item.id}`;
    setDownloadKey(key);
    try {
      const blob = await fetchQrPng(target);
      triggerBlobDownload(blob, `${sanitizeFilename(item.internalLabel)}-QR.png`);
      toast.success("QR descargado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar el QR");
    } finally {
      setDownloadKey(null);
    }
  }, []);

  const downloadStickerPng = useCallback(async (item: DigitalItem) => {
    const target = getDigitalItemQrTarget(item);
    if (!target) return toast.error("QR no disponible para esta unidad");
    const key = `sticker-${item.id}`;
    setDownloadKey(key);
    try {
      const sticker = await renderStickerPng(target);
      triggerBlobDownload(sticker, `${sanitizeFilename(item.internalLabel)}.png`);
      toast.success("Sticker listo para producción");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el sticker");
    } finally {
      setDownloadKey(null);
    }
  }, []);

  const downloadActivationCode = useCallback(async (item: DigitalItem) => {
    if (!item.activationCode) return toast.error("Código de activación no disponible");
    const key = `code-${item.id}`;
    setDownloadKey(key);
    try {
      const card = await renderActivationCardPng(item);
      triggerBlobDownload(card, `${sanitizeFilename(item.internalLabel)}-CODIGO.png`);
      toast.success("Tarjeta de activación descargada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la tarjeta de activación");
    } finally {
      setDownloadKey(null);
    }
  }, []);

  const downloadCodesCsv = useCallback(() => {
    const items = detail?.digitalItems || [];
    if (items.length === 0 || !detail) return toast.error("No hay unidades para descargar");
    triggerBlobDownload(buildCodesCsv(items), `${sanitizeFilename(detail.code)}-codigos.csv`);
    toast.success("Listado de códigos descargado");
  }, [detail]);

  const downloadBatchAssets = useCallback(async () => {
    const items = detail?.digitalItems || [];
    if (items.length === 0 || !detail) return toast.error("No hay unidades para descargar");

    setDownloadKey("batch");
    try {
      const files: Array<{ name: string; blob: Blob }> = [];

      for (const item of items) {
        const safeLabel = sanitizeFilename(item.internalLabel);
        const target = getDigitalItemQrTarget(item);
        let qrBlob: Blob | undefined;

        if (target) {
          qrBlob = await fetchQrPng(target);
          files.push({ name: `qr/${safeLabel}-QR.png`, blob: qrBlob });
          const stickerBlob = await renderStickerPng(target, qrBlob);
          files.push({ name: `stickers/${safeLabel}.png`, blob: stickerBlob });
        }

        if (item.activationCode) {
          const activationCard = await renderActivationCardPng(item, qrBlob);
          files.push({ name: `codigos/${safeLabel}-CODIGO.png`, blob: activationCard });
        }

        const codeBlob = new Blob([buildActivationText(item, target)], { type: "text/plain;charset=utf-8" });
        files.push({ name: `codigos/${safeLabel}-CODIGO.txt`, blob: codeBlob });
      }

      files.push({
        name: `codigos/${sanitizeFilename(detail.code)}-codigos.csv`,
        blob: buildCodesCsv(items),
      });

      const zip = await createStoredZip(files);
      triggerBlobDownload(zip, `${sanitizeFilename(detail.code)}-produccion.zip`);
      toast.success("Lote de producción descargado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el ZIP");
    } finally {
      setDownloadKey(null);
    }
  }, [detail]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${id}?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la producción");
      setDetail(data.productionOrder || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar producción");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadData = useCallback(async ({ silent = false, refreshDetail = true }: { silent?: boolean; refreshDetail?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`/api/admin/operations/production-orders?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/admin/operations/finished-goods?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [ordersData, productsData] = await Promise.all([ordersRes.json(), productsRes.json()]);
      if (!ordersRes.ok) throw new Error(ordersData.error || "No se pudo cargar producción");
      if (!productsRes.ok) throw new Error(productsData.error || "No se pudo cargar Productos base");
      setOrders(Array.isArray(ordersData.productionOrders) ? ordersData.productionOrders : []);
      const activeProducts = Array.isArray(productsData.finishedGoods)
        ? productsData.finishedGoods.filter((item: FinishedGood) => item.status === "active")
        : [];
      setProducts(activeProducts);
      if (!finishedGoodId && activeProducts[0]?.id) setFinishedGoodId(activeProducts[0].id);
      if (refreshDetail && selectedOrderId) await loadDetail(selectedOrderId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar producción");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [finishedGoodId, loadDetail, selectedOrderId]);

  useEffect(() => {
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedOrderId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedOrderId);
  }, [loadDetail, selectedOrderId]);

  const createProduction = async (event: React.FormEvent) => {
    event.preventDefault();
    const plannedQuantity = Number(quantity);
    if (!finishedGoodId) return toast.error("Selecciona un Producto base");
    if (!Number.isInteger(plannedQuantity) || plannedQuantity <= 0) return toast.error("Cantidad inválida");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/operations/production-orders/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finishedGoodId, plannedQuantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear la producción");
      toast.success("Producción creada");
      setShowCreate(false);
      setQuantity("1");
      setSelectedOrderId(data.productionOrder?.id || null);
      await loadData({ silent: true, refreshDetail: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear producción");
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (key: string, url: string, success: string, body?: unknown) => {
    setActionKey(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo completar la acción");
      toast.success(success);
      await Promise.all([
        selectedOrderId ? loadDetail(selectedOrderId) : Promise.resolve(),
        loadData({ silent: true, refreshDetail: false }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar producción");
    } finally {
      setActionKey(null);
    }
  };

  const printOrder = useMemo(() => {
    for (const item of detail?.digitalItems || []) {
      const found = item.printOrderItems?.[0]?.printOrder;
      if (found) return found;
    }
    return null;
  }, [detail]);

  const allDigitalReady = Boolean(detail?.digitalItems?.length) && (detail?.digitalItems || []).every((item) => item.nfcProgrammed && item.qrPrepared && item.shortCode);
  const activeCount = orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;
  const completedCount = orders.filter((order) => order.status === "completed").length;
  const visibleOrders = useMemo(() => {
    if (productionFilter === "completed") return orders.filter((order) => order.status === "completed");
    if (productionFilter === "all") return orders;
    return orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  }, [orders, productionFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Factory className="h-5 w-5 text-violet-600" />
          <div>
            <h3 className="text-lg font-black text-slate-950">Producción</h3>
            <p className="text-xs font-bold text-slate-400">{activeCount} activas · {orders.length} total</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">
            <Plus className="h-4 w-4" /> Nueva producción
          </button>
          <button type="button" onClick={() => loadData({ silent: true })} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 disabled:opacity-50" aria-label="Actualizar">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-sm font-bold text-slate-400">Sin producción</div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 p-2">
              {[
                { id: "active" as const, label: `Activas (${activeCount})` },
                { id: "completed" as const, label: `Completadas (${completedCount})` },
                { id: "all" as const, label: `Todas (${orders.length})` },
              ].map((filter) => (
                <button key={filter.id} type="button" onClick={() => setProductionFilter(filter.id)} className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider ${productionFilter === filter.id ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:bg-white"}`}>
                  {filter.label}
                </button>
              ))}
            </div>
            {visibleOrders.length === 0 ? (
              <div className="py-10 text-center text-sm font-bold text-slate-400">Sin producción en esta vista</div>
            ) : (
          <div className="divide-y divide-slate-100">
            {visibleOrders.map((order) => {
              const selected = selectedOrderId === order.id;
              return (
                <button key={order.id} type="button" onClick={() => setSelectedOrderId(selected ? null : order.id)} className={`grid w-full gap-3 px-4 py-4 text-left md:grid-cols-[1.2fr_1fr_110px_110px_120px] md:items-center ${selected ? "bg-violet-50/60" : "hover:bg-slate-50"}`}>
                  <div><p className="font-mono text-xs font-black text-primary">{order.code}</p><p className="mt-1 text-sm font-black text-slate-900">{order.title}</p></div>
                  <p className="text-xs font-bold text-slate-500">{order.outputType}</p>
                  <p className="text-xs font-black text-slate-700">{order.producedQuantity}/{order.plannedQuantity}</p>
                  <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600">{STATUS_LABELS[order.status] || order.status}</span>
                  <span className="text-right text-[10px] font-black uppercase tracking-widest text-primary">{selected ? "Cerrar" : "Abrir"}</span>
                </button>
              );
            })}
          </div>
            )}
          </div>
        )}
      </div>

      {selectedOrderId && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          {detailLoading || !detail ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div><p className="font-mono text-xs font-black text-primary">{detail.code}</p><h4 className="mt-1 text-xl font-black text-slate-950">{detail.title}</h4></div>
                <div className="flex flex-wrap gap-2">
                  {Boolean(detail.digitalItems?.length) && (
                    <>
                      <button type="button" onClick={downloadCodesCsv} disabled={Boolean(downloadKey)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 disabled:opacity-50">
                        <Download className="h-4 w-4" /> Códigos CSV
                      </button>
                      <button type="button" onClick={() => void downloadBatchAssets()} disabled={Boolean(downloadKey)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                        {downloadKey === "batch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Descargar lote ZIP
                      </button>
                    </>
                  )}
                  {(!detail.digitalItems || detail.digitalItems.length === 0) && !["completed", "cancelled"].includes(detail.status) && (
                    <button type="button" onClick={() => runAction("prepare", `/api/admin/operations/production-orders/${detail.id}/prepare-digital-items`, "Unidades digitales creadas", { quantity: detail.plannedQuantity })} disabled={Boolean(actionKey)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">Generar unidades</button>
                  )}
                  {allDigitalReady && !printOrder && (
                    <button type="button" onClick={() => runAction("print", `/api/admin/operations/production-orders/${detail.id}/send-to-print`, "Enviada a imprenta")} disabled={Boolean(actionKey)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"><Printer className="h-4 w-4" /> Enviar imprenta</button>
                  )}
                  {printOrder && ["sent", "partially_received"].includes(printOrder.status) && (
                    <button type="button" onClick={() => runAction("received", `/api/admin/operations/production-orders/${detail.id}/mark-print-received`, "Imprenta recibida")} disabled={Boolean(actionKey)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"><PackageCheck className="h-4 w-4" /> Recibido</button>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                {(detail.digitalItems || []).map((item) => {
                  const unit = getUnit(item);
                  const unitId = item.finishedGoodUnitId || unit?.id || null;
                  const qaStatus = unit?.qaStatus || item.qaStatus || null;
                  const inventoryStatus = unit?.status || item.inventoryStatus || null;
                  const pendingQc = Boolean(unitId && qaStatus === "pending" && inventoryStatus === "qa_pending");
                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-mono text-xs font-black text-slate-900">{item.internalLabel}</p><span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase text-slate-500 ring-1 ring-slate-200">{item.status}</span></div>
                          <p className="mt-1 text-xs font-bold text-slate-500">{item.shortCode || "Sin shortCode"}{qaStatus ? ` · QC ${qaStatus}` : ""}{inventoryStatus ? ` · ${inventoryStatus}` : ""}</p>
                          <div className="mt-3 grid gap-2 text-[10px] font-bold text-slate-500 sm:grid-cols-2">
                            <button type="button" onClick={() => copyToClipboard(item.activationCode, "Código de activación")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left">
                              <span className="block font-black uppercase tracking-wider text-amber-700">Activación</span>
                              <span className="font-mono text-sm font-black text-slate-950">{item.activationCode || "Pendiente"}</span>
                            </button>
                            <button type="button" onClick={() => copyToClipboard(item.nfcUrl, "NFC")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left">
                              <span className="block font-black uppercase tracking-wider text-slate-500">NFC / QR</span>
                              <span className="block truncate font-mono text-[11px] font-black text-slate-900">{item.nfcUrl || item.qrUrl || "Pendiente"}</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.nfcUrl && <button type="button" onClick={() => copyToClipboard(item.nfcUrl, "URL NFC")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-700"><Copy className="h-3.5 w-3.5" /> NFC</button>}
                          {item.qrUrl && <a href={item.qrUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-700"><ExternalLink className="h-3.5 w-3.5" /> QR</a>}
                          {getDigitalItemQrTarget(item) && <button type="button" onClick={() => void downloadQrPng(item)} disabled={Boolean(downloadKey)} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-sky-700 disabled:opacity-50">{downloadKey === `qr-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} QR PNG</button>}
                          {getDigitalItemQrTarget(item) && <button type="button" onClick={() => void downloadStickerPng(item)} disabled={Boolean(downloadKey)} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-violet-700 disabled:opacity-50">{downloadKey === `sticker-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Sticker</button>}
                          {item.activationCode && <button type="button" onClick={() => void downloadActivationCode(item)} disabled={Boolean(downloadKey)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-amber-700 disabled:opacity-50">{downloadKey === `code-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Código</button>}
                          {!item.nfcProgrammed && <button type="button" onClick={() => runAction(`nfc-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-preparation/${item.id}/nfc-programmed`, "NFC marcado")} disabled={Boolean(actionKey)} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-sky-700 disabled:opacity-50">NFC listo</button>}
                          {!item.qrPrepared && <button type="button" onClick={() => runAction(`qr-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-preparation/${item.id}/qr-prepared`, "QR marcado")} disabled={Boolean(actionKey)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-emerald-700 disabled:opacity-50">QR listo</button>}
                          {item.status === "printed" && <button type="button" onClick={() => runAction(`assembly-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-assembly/${item.id}/assembled`, "Unidad ensamblada")} disabled={Boolean(actionKey)} className="rounded-lg bg-violet-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50">Ensamblar</button>}
                          {item.status === "assembled" && <button type="button" onClick={() => runAction(`pack-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-assembly/${item.id}/packaging-completed`, "Empaque completado")} disabled={Boolean(actionKey)} className="rounded-lg bg-amber-500 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50">Empacar</button>}
                          {item.status === "packaged" && <button type="button" onClick={() => runAction(`qc-${item.id}`, `/api/admin/operations/production-orders/${detail.id}/unit-assembly/${item.id}/complete`, "Enviada a QC")} disabled={Boolean(actionKey)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50"><ClipboardCheck className="h-3.5 w-3.5" /> QC</button>}
                          {pendingQc && unitId && <button type="button" onClick={() => runAction(`pass-${unitId}`, `/api/admin/operations/production-orders/${detail.id}/qa/${unitId}/pass`, "QC aprobado", { checklist: buildProductionQcChecklist(), notes: null })} disabled={Boolean(actionKey)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Aprobar QC</button>}
                          {pendingQc && unitId && <button type="button" onClick={() => { const reason = window.prompt("Motivo del rechazo QC"); if (reason) void runAction(`fail-${unitId}`, `/api/admin/operations/production-orders/${detail.id}/qa/${unitId}/fail`, "QC rechazado", { reason, notes: null }); }} disabled={Boolean(actionKey)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50">Rechazar QC</button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={createProduction} className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h3 className="text-xl font-black text-slate-950">Nueva producción</h3><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 p-2 text-slate-400"><X className="h-4 w-4" /></button></div>
            <div className="mt-5 space-y-4">
              <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Producto base</span><select required value={finishedGoodId} onChange={(event) => setFinishedGoodId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><option value="">Seleccionar</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}</select></label>
              <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad</span><input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600">Cancelar</button><button type="submit" disabled={creating || products.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
