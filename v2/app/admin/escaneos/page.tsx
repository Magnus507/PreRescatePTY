"use client";

import { useEffect,useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Scan={id:number;scanned_at:string;account_id:string;profile_id:string;city:string|null;country:string|null;emergency_action_taken:boolean};

export default function AdminEscaneosPage(){
  const [scans,setScans]=useState<Scan[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;async function load(){const supabase=createSupabaseBrowserClient();const {data}=await supabase.from("v2_scan_events").select("id,scanned_at,account_id,profile_id,city,country,emergency_action_taken").order("scanned_at",{ascending:false}).limit(50);if(active){setScans(data??[]);setLoading(false);}}load();return()=>{active=false}},[]);
  return <main className="main"><div className="eyebrow">Administración · Actividad</div><div className="topbar"><div><h1 className="title">Escaneos</h1><p className="muted">Eventos registrados por todos los dispositivos visibles al administrador.</p></div><span className="badge">{scans.length} eventos</span></div><section className="card">{loading?<p className="muted">Cargando escaneos…</p>:scans.length===0?<p className="muted">No hay eventos visibles.</p>:<div className="list">{scans.map(s=><div className="row" key={s.id}><div><strong>Escaneo #{s.id}</strong><div className="muted">{new Date(s.scanned_at).toLocaleString("es-PA")}</div></div><span>{s.city||s.country||"Sin ubicación"}</span></div>)}</div>}</section></main>;
}
