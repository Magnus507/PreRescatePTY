"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Device = { id:string; device_number:number; status:string; created_at:string; device_type_id:string };
type DeviceType = { id:string; name:string; code:string };

export default function InventarioPage(){
  const [devices,setDevices]=useState<Device[]>([]);
  const [types,setTypes]=useState<Record<string,DeviceType>>({});
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState<string|null>(null);
  const [claim,setClaim]=useState<{device:number;code:string}|null>(null);
  const [error,setError]=useState("");

  async function load(){
    const supabase=createSupabaseBrowserClient();
    const [d,t]=await Promise.all([
      supabase.from("v2_devices").select("id,device_number,status,created_at,device_type_id").order("device_number"),
      supabase.from("v2_device_types").select("id,name,code")
    ]);
    setDevices(d.data??[]);
    setTypes(Object.fromEntries((t.data??[]).map((x:DeviceType)=>[x.id,x])));
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  async function generate(device:Device){
    setWorking(device.id); setError(""); setClaim(null);
    const supabase=createSupabaseBrowserClient();
    const {data,error}=await supabase.rpc("v2_admin_generate_device_claim_code",{p_device_id:device.id});
    setWorking(null);
    if(error){setError(error.message);return;}
    const row=Array.isArray(data)?data[0]:data;
    if(row){setClaim({device:Number(row.device_number),code:String(row.claim_code)});}
    await load();
  }

  return <main className="main">
    <div className="eyebrow">Administración · Inventario</div>
    <div className="topbar"><div><h1 className="title">Dispositivos</h1><p className="muted">Unidades físicas registradas en PreRescate V2.</p></div><span className="badge">{devices.length} unidades</span></div>
    {claim?<section className="card" style={{marginBottom:18}}><div className="eyebrow">Código de reclamación</div><h2>{claim.code}</h2><p className="muted">PRS-{String(claim.device).padStart(6,"0")}. Entrégalo al cliente una sola vez; en la base solo queda su hash.</p></section>:null}
    {error?<section className="card" style={{marginBottom:18}}><strong>No se pudo generar el código</strong><p className="muted">{error}</p></section>:null}
    <section className="card">{loading?<p className="muted">Cargando inventario…</p>:devices.length===0?<p className="muted">No hay dispositivos visibles.</p>:<div className="list">{devices.map(d=><div className="row" key={d.id}><div><strong>{`PRS-${String(d.device_number).padStart(6,"0")}`}</strong><div className="muted">{types[d.device_type_id]?.name??"Dispositivo"} · {d.status}</div></div><button className="button" onClick={()=>generate(d)} disabled={working===d.id||!["in_stock","reserved","sold"].includes(d.status)}>{working===d.id?"Generando…":d.status==="sold"?"Rotar código":"Generar código"}</button></div>)}</div>}</section>
  </main>;
}
