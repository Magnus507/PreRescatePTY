"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function DashboardPage() {
  const [metrics,setMetrics]=useState({profiles:"—",devices:"—",contacts:"—",lastScan:"—"});

  useEffect(()=>{let active=true;async function load(){const supabase=createSupabaseBrowserClient();const [profiles,devices,contacts,scan]=await Promise.all([
    supabase.from("v2_profiles").select("id",{count:"exact",head:true}),
    supabase.from("v2_devices").select("id",{count:"exact",head:true}),
    supabase.from("v2_emergency_contacts").select("id",{count:"exact",head:true}),
    supabase.from("v2_scan_events").select("scanned_at").order("scanned_at",{ascending:false}).limit(1).maybeSingle()
  ]);if(active)setMetrics({profiles:String(profiles.count??0),devices:String(devices.count??0),contacts:String(contacts.count??0),lastScan:scan.data?.scanned_at?new Date(scan.data.scanned_at).toLocaleString("es-PA"):"Sin actividad"});}load();return()=>{active=false}},[]);

  const cards=[["Perfiles",metrics.profiles,"Personas protegidas"],["Dispositivos",metrics.devices,"NFC y QR vinculados"],["Contactos",metrics.contacts,"Contactos registrados"],["Último escaneo",metrics.lastScan,"Actividad más reciente"]];

  return <main className="main"><div className="topbar"><div><div className="eyebrow">Panel del cliente · V2</div><h1 className="title">Mi protección</h1></div><span className="badge">Backend conectado</span></div><section className="grid">{cards.map(([label,value,detail])=><article className="card" key={label}><div className="muted">{label}</div><div className="metric">{value}</div><div className="muted">{detail}</div></article>)}</section><section className="section card"><div className="eyebrow">Primeros pasos</div><h2>Completa tu protección</h2><div className="list"><div className="row"><strong>Crear perfil</strong><span>01</span></div><div className="row"><strong>Agregar contactos</strong><span>02</span></div><div className="row"><strong>Activar dispositivo</strong><span>03</span></div></div></section></main>;
}
