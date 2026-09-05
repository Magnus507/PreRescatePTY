"use client";

import React, { type CSSProperties, type PointerEvent, type ReactNode, useMemo, useState } from "react";

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue: "59 130 246",
  purple: "139 92 246",
  green: "16 185 129",
  red: "218 26 33",
  orange: "249 115 22",
} as const;

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
} as const;

type GlowStyles = CSSProperties & {
  "--glow-x": string;
  "--glow-y": string;
  "--glow-rgb": string;
};

function toCssSize(value: string | number | undefined) {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

export function GlowCard({
  children,
  className = "",
  glowColor = "blue",
  size = "md",
  width,
  height,
  customSize = false,
}: GlowCardProps) {
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const style = useMemo<GlowStyles>(
    () => ({
      "--glow-x": `${pointer.x}%`,
      "--glow-y": `${pointer.y}%`,
      "--glow-rgb": glowColorMap[glowColor],
      width: toCssSize(width),
      height: toCssSize(height),
    }),
    [glowColor, height, pointer.x, pointer.y, width],
  );

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointer({ x, y });
  };

  return (
    <div
      data-glow-card
      onPointerMove={onPointerMove}
      onPointerLeave={() => setPointer({ x: 50, y: 50 })}
      style={style}
      className={`group relative isolate overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-[border-color,transform,box-shadow] duration-500 hover:-translate-y-1 hover:border-white/[0.16] hover:shadow-[0_28px_90px_-38px_rgba(59,130,246,0.28)] ${customSize ? "" : sizeMap[size]} ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--glow-x) var(--glow-y), rgb(var(--glow-rgb) / 0.22), transparent 42%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px -z-10 rounded-[calc(1.5rem-1px)] opacity-90"
        style={{
          background:
            "linear-gradient(145deg, rgb(255 255 255 / 0.055), transparent 42%, rgb(var(--glow-rgb) / 0.055))",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-16 -z-20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
        style={{
          background:
            "radial-gradient(circle at var(--glow-x) var(--glow-y), rgb(var(--glow-rgb) / 0.25), transparent 45%)",
        }}
      />
      {children}
    </div>
  );
}
