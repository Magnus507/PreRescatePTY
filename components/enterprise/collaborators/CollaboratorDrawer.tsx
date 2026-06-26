"use client";

import { Member, CorporateKitData, DetailTab } from "./types";
import { XCircle, Info, ClipboardList, History, Package, FileText, Smartphone, Truck, Shield, Lock } from "lucide-react";
import CollaboratorActionCenter from "./CollaboratorActionCenter";
import CollaboratorInfoTab from "./CollaboratorInfoTab";
import CollaboratorProgramTab from "./CollaboratorProgramTab";
import CollaboratorHistoryTab from "./CollaboratorHistoryTab";
import CollaboratorKitTab from "./CollaboratorKitTab";
import CollaboratorRequestsTab from "./CollaboratorRequestsTab";

interface CollaboratorDrawerProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  detailTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  kitData: CorporateKitData | null;
  kitLoading: boolean;
  kitError: string | null;
  onRetryKit: () => void;
  statusInfo: Record<string, { label: string; color: string; bg: string }>;
  actingOn: string | null;
  onAction: (memberId: string, action: "suspend" | "unsuspend" | "archive" | "restore" | "reject" | "delete_forever" | "approve") => Promise<void>;
}

export default function CollaboratorDrawer({
  member,
  isOpen,
  onClose,
  detailTab,
  setDetailTab,
  kitData,
  kitLoading,
  kitError,
  onRetryKit,
  statusInfo,
  actingOn,
  onAction,
}: CollaboratorDrawerProps) {
  if (!isOpen || !member) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[90] overflow-y-auto">
        <div className="p-6 md:p-8 space-y-6">
          {/* Header del drawer */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black">{member.profile?.firstName} {member.profile?.lastName}</h2>
                <p className="text-sm text-muted-foreground">{member.profile?.user?.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Centro de Acciones */}
          <CollaboratorActionCenter
            member={member}
            actingOn={actingOn}
            onAction={onAction}
            statusInfo={statusInfo}
          />

          {/* Próximamente */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-4 w-4 text-slate-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Próximamente</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Ver Kit
                <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
              </button>
              <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Solicitudes
                <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
              </button>
              <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Registrar Entrega
                <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
              </button>
              <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                Reasignar Chip
                <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
              </button>
              <button disabled className="px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5 col-span-2">
                <ClipboardList className="h-3.5 w-3.5" />
                Descargar Expediente
                <span className="text-[8px] ml-auto text-slate-300">próximamente</span>
              </button>
            </div>
          </div>

          {/* Tabs del drawer */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setDetailTab("info")}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                detailTab === "info"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-slate-700"
              }`}
            >
              <Info className="h-4 w-4 inline mr-2" />
              Información
            </button>
            <button
              onClick={() => setDetailTab("program")}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                detailTab === "program"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-slate-700"
              }`}
            >
              <ClipboardList className="h-4 w-4 inline mr-2" />
              Programa
            </button>
            <button
              onClick={() => setDetailTab("history")}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                detailTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-slate-700"
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              Historial
            </button>
            <button
              onClick={() => setDetailTab("kit")}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                detailTab === "kit"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-slate-700"
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Kit Empresarial
            </button>
            <button
              onClick={() => setDetailTab("requests")}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                detailTab === "requests"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-slate-700"
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Solicitudes
            </button>
          </div>

          {/* Contenido de las tabs */}
          <div className="space-y-4">
            {detailTab === "info" && <CollaboratorInfoTab member={member} />}
            {detailTab === "program" && <CollaboratorProgramTab member={member} />}
            {detailTab === "history" && <CollaboratorHistoryTab member={member} />}
            {detailTab === "kit" && (
              <CollaboratorKitTab
                kitData={kitData}
                kitLoading={kitLoading}
                kitError={kitError}
                onRetry={onRetryKit}
              />
            )}
            {detailTab === "requests" && (
              <CollaboratorRequestsTab
                kitData={kitData}
                kitLoading={kitLoading}
                kitError={kitError}
                onRetry={onRetryKit}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}