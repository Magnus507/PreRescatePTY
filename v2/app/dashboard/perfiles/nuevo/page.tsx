"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/browser";

export default function NuevoPerfilPage(){
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setSaving(true);setError("");
    const form=new FormData(event.currentTarget);
    const supabase=createSupabaseBrowserClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setSaving(false);setError("Debes iniciar sesión para crear un perfil.");return;}
    const {data:membership,error:membershipError}=await supabase.from("v2_account_members").select("account_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();
    if(membershipError||!membership){setSaving(false);setError("No encontramos una cuenta activa para este usuario.");return;}
    const payload={account_id:membership.account_id,created_by_user_id:user.id,first_name:String(form.get("first_name")||"").trim(),last_name:String(form.get("last_name")||"").trim(),birth_date:form.get("birth_date")||null,blood_type:form.get("blood_type")||null,allergies:String(form.get("allergies")||"").trim()||null,medical_conditions:String(form.get("medical_conditions")||"").trim()||null,medications:String(form.get("medications")||"").trim()||null};
    const {error:insertError}=await supabase.from("v2_profiles").insert(payload);
    setSaving(false);
    if(insertError){setError(insertError.message);return;}
    router.push("/dashboard/perfiles");router.refresh();
  }

  return <main className="main"><div className="eyebrow">Perfiles</div><h1 className="title">Crear perfil protegido</h1><p className="muted">Registra la información esencial. Podrás completar privacidad y más datos después.</p><form onSubmit={submit} className="section card" style={{maxWidth:760}}><div className="formgrid"><label>Nombre<input name="first_name" required /></label><label>Apellido<input name="last_name" required /></label><label>Fecha de nacimiento<input name="birth_date" type="date" /></label><label>Tipo de sangre<select name="blood_type" defaultValue=""><option value="">No especificado</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-","UNKNOWN"].map(v=><option key={v} value={v}>{v}</option>)}</select></label></div><label>Alergias<textarea name="allergies" rows={3}/></label><label>Condiciones médicas<textarea name="medical_conditions" rows={3}/></label><label>Medicamentos<textarea name="medications" rows={3}/></label>{error?<p className="errorText">{error}</p>:null}<div className="actions"><button className="button" type="submit" disabled={saving}>{saving?"Guardando...":"Crear perfil"}</button><button className="button secondary" type="button" onClick={()=>router.back()}>Cancelar</button></div></form></main>;
}
