"use client";

import { useEffect,useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function AdminPage(){
  const [m,setM]=useState({clients:"—",profiles:"—",devices:"—",scans:"—"});
  useEffect(()=>{let active=true;async function load(){const supabase=createSupabaseBrowserClient();const today=new Date();today.setHours(0,0,0,0);const [clients,profiles,devices,scans]=await Promise.all([
    supabase.from("v2_accounts").select("id",{count:"exact",head:true}).eq("status","active"),
    supabase.from("v2_profiles").select("id",{count:"exact",head:true}),
    supabase.from("v2_devices").select("id",{count:"exact",head:true}),
    supabase.from("v2_scan_events").select("id",{count:"exact",head:true}).gte("scanned_at",today.toISOString())
  ]);if(active)setM({clients:String(clients.count??0),profiles:String(profiles.count??0),devices:String(devices.count??0),scans:String(scans.count??0)});}load();return()=>{active=false}},[]);
  const metrics=[["Clientes",m.clients,"Cuentas activas"],["Perfiles",m.profiles,"Personas protegidas"],["Dispositivos",m.devices,"Unidades registradas"],["Escaneos hoy",m.scans,"Actividad del día"]];
  return <main className="main"><div className="topbar"><div><div className="eyebrow">Administración · V2</div><h1 className="title">Centro de operaciones</h1></div><span className="badge">Datos en vivo</span></div><section className="grid">{metrics.map(([label,value,detail])=><article className="card" key={label}><div className="muted">{label}</div><div className="metric">{value}</div><div className="muted">{detail}</div></article>)}</section><section className="section card"><div className="eyebrow">Núcleo operativo</div><h2>Cliente ↔ Admin ↔ Dispositivo</h2><div className="list"><div className="row"><strong>Clientes y perfiles</strong><span>RLS</span></div><div className="row"><strong>Inventario y dispositivos</strong><span>V2</span></div><div className="row"><strong>Escaneos y alertas</strong><span>EVENTOS</span></div><div className="row"><strong>Auditoría</strong><span>REGISTRADA</span></div></div></section></main>;
}
