"use client";

import { Boxes } from "lucide-react";
import { FinishedGoodsSection } from "./FinishedGoodsSection";

export function PhysicalInventorySection() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Boxes className="h-7 w-7 text-primary" />
        <h2 className="text-2xl font-black tracking-tight">Productos terminados</h2>
      </div>
      <FinishedGoodsSection />
    </div>
  );
}
