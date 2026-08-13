"use client";

import { useEffect,useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Device={id:string;device_number:number;status:string;created_at:string;device_type_id:string};
type DeviceType={id:string;name:string;code:string};

export default function InventarioPage(){
  const [devices,setDevices]=useState<Device[]>([]);
  const [types,setTypes]=useState<Record<string,DeviceType>>({});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;async function load(){const supabase=createSupabaseBrowserClient();const [d,t]=await Promise.all([supabase.from("v2_devices").select("id,device_number,status,created_at,device_type_id").order("device_number"),supabase.from("v2_device_types").select("id,name,code")]);if(!active)return;setDevices(d.data??[]);setTypes(Object.fromEntries((t.data??[]).map((x:DeviceType)=>[x.id,x])));setLoading(false);}load();return()=>{active=false}},[]);
  return <main className="main"><div className="eyebrow">Administración · Inventario</div><div className="topbar"><div><h1 className="title">Dispositivos</h1><p className="muted">Unidades físicas registradas en PreRescate V2.</p></div><span className="badge">{devices.length} unidades</span></div><section className="card">{loading?<p className="muted">Cargando inventario…</p>:devices.length===0?<p className="muted">No hay dispositivos visibles.</p>:<div className="list">{devices.map(d=><div className="row" key={d.id}><div><strong>{`PRS-${String(d.device_number).padStart(6,"0")}`}</strong><div className="muted">{types[d.device_type_id]?.name??"Dispositivo"}</div></div><span className="badge">{d.status}</span></div>)}</div>}</section></main>;
}
