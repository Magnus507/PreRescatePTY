"use client";

import React, { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

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

type PendingGlow = {
  element: HTMLDivElement;
  x: number;
  y: number;
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
  const rectRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingGlowRef = useRef<PendingGlow | null>(null);

  const style: GlowStyles = {
    "--glow-x": "50%",
    "--glow-y": "50%",
    "--glow-rgb": glowColorMap[glowColor],
    width: toCssSize(width),
    height: toCssSize(height),
  };

  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    rectRef.current = event.currentTarget.getBoundingClientRect();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;

    const rect = rectRef.current ?? event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    pendingGlowRef.current = {
      element: event.currentTarget,
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };

    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      const pending = pendingGlowRef.current;
      if (pending) {
        pending.element.style.setProperty("--glow-x", `${pending.x}%`);
        pending.element.style.setProperty("--glow-y", `${pending.y}%`);
      }
      frameRef.current = null;
    });
  };

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    pendingGlowRef.current = null;
    rectRef.current = null;
    event.currentTarget.style.setProperty("--glow-x", "50%");
    event.currentTarget.style.setProperty("--glow-y", "50%");
  };

  return (
    <div
      data-glow-card
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={style}
      className={`group relative isolate overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-[border-color,transform,box-shadow] duration-500 md:hover:-translate-y-1 md:hover:border-white/[0.16] md:hover:shadow-[0_28px_90px_-38px_rgba(59,130,246,0.28)] ${customSize ? "" : sizeMap[size]} ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-55 transition-opacity duration-500 md:group-hover:opacity-100"
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
        className="pointer-events-none absolute -inset-16 -z-20 hidden opacity-0 blur-3xl transition-opacity duration-500 md:block md:group-hover:opacity-50"
        style={{
          background:
            "radial-gradient(circle at var(--glow-x) var(--glow-y), rgb(var(--glow-rgb) / 0.25), transparent 45%)",
        }}
      />
      {children}
    </div>
  );
}
