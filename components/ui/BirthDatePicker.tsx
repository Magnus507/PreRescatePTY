"use client";

import { useMemo } from "react";

interface BirthDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label: string;
}

export function BirthDatePicker({ value, onChange, label }: BirthDatePickerProps) {
  // Parse current value
  const [year, month, day] = useMemo(() => {
    if (!value) return ["", "", ""];
    return value.split("-");
  }, [value]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let i = currentYear; i >= 1900; i--) {
      arr.push(i.toString());
    }
    return arr;
  }, []);

  const months = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  const days = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 31; i++) {
      arr.push(i.toString().padStart(2, "0"));
    }
    return arr;
  }, []);

  const handleUpdate = (type: "year" | "month" | "day", val: string) => {
    let newYear = year || "2000";
    let newMonth = month || "01";
    let newDay = day || "01";

    if (type === "year") newYear = val;
    if (type === "month") newMonth = val;
    if (type === "day") newDay = val;

    onChange(`${newYear}-${newMonth}-${newDay}`);
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-4">
        {/* Day */}
        <div className="relative group">
          <select
            value={day}
            onChange={(e) => handleUpdate("day", e.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-base font-bold focus:ring-4 focus:ring-primary/10 appearance-none transition-all hover:bg-slate-50 cursor-pointer shadow-sm outline-none"
          >
            <option value="" disabled>Día</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[9px] font-black group-hover:opacity-100 transition-opacity">DÍ</div>
        </div>

        {/* Month */}
        <div className="relative group">
          <select
            value={month}
            onChange={(e) => handleUpdate("month", e.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-base font-bold focus:ring-4 focus:ring-primary/10 appearance-none transition-all hover:bg-slate-50 cursor-pointer shadow-sm outline-none"
          >
            <option value="" disabled>Mes</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[9px] font-black group-hover:opacity-100 transition-opacity">ME</div>
        </div>

        {/* Year */}
        <div className="relative group">
          <select
            value={year}
            onChange={(e) => handleUpdate("year", e.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-4 text-base font-bold focus:ring-4 focus:ring-primary/10 appearance-none transition-all hover:bg-slate-50 cursor-pointer shadow-sm outline-none"
          >
            <option value="" disabled>Año</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[9px] font-black group-hover:opacity-100 transition-opacity">AÑ</div>
        </div>
      </div>
    </div>
  );
}
