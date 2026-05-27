"use client";

import { CheckCircle2, PackageSearch, QrCode } from "lucide-react";

interface InventoryChip {
  id: string;
  serialPublic: string;
  shortCode: string;
  internalLabel: string | null;
  isPhysical: boolean;
}

interface ChipClaimToken {
  id: string;
  activationCode: string;
  chip: {
    serialPublic: string;
    shortCode: string;
    internalLabel: string | null;
  };
}

interface ChipAssignmentPanelProps {
  /** Current order status */
  orderStatus: string;
  /** Number of chips purchased */
  purchasedChips: number;
  /** If the order is already completed/shipped, show tokens instead of assigner */
  chipClaimTokens?: ChipClaimToken[];
  /** Available inventory chips for assignment */
  inventory: InventoryChip[];
  /** Currently assigned chip IDs */
  assignedChipIds: string[];
  /** Search text for filtering inventory */
  searchInventory: string;
  onSearchChange: (val: string) => void;
  onToggleChip: (chipId: string) => void;
}

export function ChipAssignmentPanel({
  orderStatus,
  purchasedChips,
  chipClaimTokens = [],
  inventory,
  assignedChipIds,
  searchInventory,
  onSearchChange,
  onToggleChip,
}: ChipAssignmentPanelProps) {
  const isFinal = orderStatus === "completed" || orderStatus === "shipped";

  if (isFinal) {
    return (
      <section className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
          <div className="h-1.5 w-6 bg-primary rounded-full" />
          Picking Físico
        </h3>
        <div className="space-y-4">
          <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[1.5rem] text-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
            <h4 className="text-xl font-black uppercase tracking-tight text-emerald-700">Completado</h4>
            <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest mt-1">
              Los chips ya están vinculados.
            </p>
          </div>
          <div className="space-y-3">
            {chipClaimTokens.map((token) => (
              <div
                key={token.id}
                className="p-4 bg-white border border-border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      {token.chip.internalLabel || "ID INTERNO"}
                    </span>
                    <span className="font-mono text-sm font-bold tracking-tighter text-indigo-600">
                      {token.chip.shortCode || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col mt-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">SERIAL PÚBLICO</span>
                    <span className="font-mono text-[11px] font-bold text-slate-500">{token.chip.serialPublic}</span>
                  </div>
                </div>
                <div className="w-full sm:w-auto p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center sm:text-right">
                  <p className="text-[9px] font-black text-indigo-900/60 uppercase tracking-[0.2em] mb-1">Cód. Activación</p>
                  <p className="font-mono text-xl font-black text-indigo-600 tracking-[0.2em]">{token.activationCode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
        <div className="h-1.5 w-6 bg-primary rounded-full" />
        Picking Físico
      </h3>
      <div className="space-y-4">
        <div className="relative group">
          <PackageSearch className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Escanea o busca sticker..."
            className="w-full bg-white dark:bg-slate-800 border-border rounded-xl pl-12 pr-4 py-3 text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            value={searchInventory}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {inventory
            .filter(
              (c) =>
                c.isPhysical &&
                (c.serialPublic.toLowerCase().includes(searchInventory.toLowerCase()) ||
                  c.internalLabel?.toLowerCase().includes(searchInventory.toLowerCase()))
            )
            .map((chip) => {
              const isAssigned = assignedChipIds.includes(chip.id);
              const canAddMore = assignedChipIds.length < purchasedChips;

              return (
                <button
                  key={chip.id}
                  disabled={!isAssigned && !canAddMore}
                  onClick={() => onToggleChip(chip.id)}
                  className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-all border ${isAssigned ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white border-transparent hover:border-border"} ${!isAssigned && !canAddMore ? "opacity-20 grayscale cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isAssigned ? "bg-white/20" : "bg-slate-100"}`}>
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">
                        {chip.internalLabel || "Sin Etiqueta"}
                      </p>
                      <p className="text-[10px] font-mono opacity-60 mt-0.5">{chip.serialPublic}</p>
                    </div>
                  </div>
                  {isAssigned && <CheckCircle2 className="h-5 w-5" />}
                </button>
              );
            })}
        </div>

        <div className="p-5 bg-indigo-600 dark:bg-indigo-700 text-white rounded-[1.5rem] shadow-lg shadow-indigo-600/30 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">{assignedChipIds.length}</span>
            <span className="text-base opacity-50 font-bold">/ {purchasedChips}</span>
          </div>
          <p className="text-[11px] font-bold text-right">
            Seleccionados
            <br />
            {assignedChipIds.length} / {purchasedChips}
          </p>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
          Chips comprados: {purchasedChips}
        </p>
      </div>
    </section>
  );
}