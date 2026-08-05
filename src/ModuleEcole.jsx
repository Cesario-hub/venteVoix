import { useState } from "react";

const C={bg:"#FAF6F0",surface:"#FFFFFF",primary:"#1B4332",primaryMid:"#2D6A4F",primaryLight:"#52B788",accent:"#D4A017",danger:"#B91C1C",text:"#111827",muted:"#6B7280",border:"#E8E0D5"};
const fmtN=n=>new Intl.NumberFormat("fr-FR").format(n);
const fmt=n=>fmtN(n)+" F";
function btnS(bg,color,x={}){return{flex:1,padding:"11px 0",borderRadius:12,border:"none",background:bg,color,fontWeight:700,fontSize:14,cursor:"pointer",...x};}
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch{return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}

export default function ModuleEcole({user,config}){
  const KEY="vv_eleves_"+user.id;
  const[eleves,setEleves]=useState(()=>lsGet(KEY)||[]);
  const[showForm,setShowForm]=useState(false);
  const[editEleve,setEditEleve]=useState(null);
  const[filtre,setFiltre]=useState("tous");
  const[form,setForm]=useState({nom:"",classe:"",nomParent:"",telParent:"",montantTotal:"",montantPaye:"0",echeance:""});
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const save=l=>{setEleves(l);lsSet(KEY,l);};

  const ajouter=()=>{
    if(!form.nom.trim()||!form.montantTotal) return;
    if(editEleve){
      save(eleves.map(e=>e.id===editEleve.id?{...e,...form,montantTotal:parseFloat(form.montantTotal)||0,montantPaye:parseFloat(form.montantPaye)||0}:e));
      setEditEleve(null);
    }else{
      save([...eleves,{id:Date.now(),nom:form.nom.trim(),classe:form.classe,nomParent:form.nomParent,telParent:form.telParent,montantTotal:parseFloat(form.montantTotal)||0,montantPaye:parseFloat(form.montantPaye)||0,echeance:form.echeance,createdAt:new Date().toISOString()}]);
    }
    setForm({nom:"",classe:"",nomParent:"",telParent:"",montantTotal:"",montantPaye:"0",echeance:""});
    setShowForm(false);
  };

  const marquerPaye=(id,montant)=>save(eleves.map(e=>e.id===id?{...e,montantPaye:Math.min(e.montantTotal,(e.montantPaye||0)+montant)}:e));
  const supprimer=id=>{if(confirm("Supprimer ?"))save(eleves.filter(e=>e.id!==id));};

  const rappel=(e)=>{
    const r=e.montantTotal-(e.montantPaye||0);
    const msg=encodeURIComponent(`Bonjour ${e.nomParent} !\n\n📚 Scolarité de *${e.nom}* - ${e.classe}\n\n💰 Montant total : *${fmtN(e.montantTotal)} F*\n✅ Déjà payé : *${fmtN(e.montantPaye||0)} F*\n⚠️ Reste : *${fmtN(r)} F*${e.echeance?`\n📅 Échéance : ${new Date(e.echeance).toLocaleDateString("fr-FR")}`:""}\n\nPayez par :\n📱 Wave : ${config?.WAVE_NUMBER||""}\n📱 Orange : ${config?.ORANGE_NUMBER||""}\n\nMerci 🙏`);
    window.open(`https://wa.me/${(e.telParent||"").replace(/\D/g,"")}?text=${msg}`,"_blank");
  };

  const filtres=eleves.filter(e=>{
    const r=e.montantTotal-(e.montantPaye||0);
    if(filtre==="payes") return r<=0;
    if(filtre==="attente") return r>0&&(!e.echeance||new Date(e.echeance)>=new Date());
    if(filtre==="retard") return r>0&&e.echeance&&new Date(e.echeance)<new Date();
    return true;
  });

  const totalAttendu=eleves.reduce((s,e)=>s+e.montantTotal,0);
  const totalEncaisse=eleves.reduce((s,e)=>s+(e.montantPaye||0),0);
  const nRetard=eleves.filter(e=>(e.montantTotal-(e.montantPaye||0))>0&&e.echeance&&new Date(e.echeance)<new Date()).length;

  return(
    <div style={{padding:"14px 14px 100px",maxWidth:900,margin:"0 auto"}}>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
        {[["Total attendu",fmt(totalAttendu),C.primary,`${eleves.length} élèves`],["Encaissé",fmt(totalEncaisse),"#10B981",`${eleves.filter(e=>e.montantTotal-(e.montantPaye||0)<=0).length} payés`],["Reste",fmt(totalAttendu-totalEncaisse),totalAttendu-totalEncaisse>0?C.danger:C.primary,nRetard>0?`⚠️ ${nRetard} en retard`:""]].map(([l,v,c,s])=>(
          <div key={l} style={{background:C.surface,borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",marginBottom:3}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
            {s&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{s}</div>}
          </div>
        ))}
      </div>

      {/* Rappels en masse */}
      {eleves.filter(e=>e.montantTotal-(e.montantPaye||0)>0).length>0&&(
        <button onClick={()=>eleves.filter(e=>e.montantTotal-(e.montantPaye||0)>0).forEach((e,i)=>setTimeout(()=>rappel(e),i*800))}
          style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"#25D366",color:"#FFF",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:12}}>
          📲 Rappels WhatsApp — tous les impayés ({eleves.filter(e=>e.montantTotal-(e.montantPaye||0)>0).length})
        </button>
      )}

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","🗂 Tous"],["payes","✅ Payés"],["attente","⏳ En attente"],["retard","⚠️ En retard"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltre(v)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${filtre===v?C.primary:C.border}`,background:filtre===v?C.primary:"transparent",color:filtre===v?"#FFF":C.muted,fontSize:11,fontWeight:filtre===v?700:400,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {/* Header liste */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:15}}>Élèves ({eleves.length})</div>
        <button onClick={()=>{setShowForm(!showForm);setEditEleve(null);setForm({nom:"",classe:"",nomParent:"",telParent:"",montantTotal:"",montantPaye:"0",echeance:""}); }} style={{background:C.primary,border:"none",borderRadius:10,padding:"7px 14px",color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Ajouter</button>
      </div>

      {/* Formulaire */}
      {showForm&&(
        <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 4px 14px rgba(0,0,0,.08)"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:12}}>{editEleve?"✏️ Modifier":"➕ Nouvel élève"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Nom élève *","nom","text","ex: Awa Kouassi"],["Classe *","classe","text","ex: CE2, 3ème"],["Nom parent *","nomParent","text","ex: M. Kouassi"],["Téléphone parent *","telParent","tel","+225 07 XX XX XX"],["Frais total (F) *","montantTotal","number","ex: 150000"],["Déjà payé (F)","montantPaye","number","ex: 50000"]].map(([l,k,t,ph])=>(
              <div key={k}>
                <div style={{fontSize:11,color:C.muted,marginBottom:4,fontWeight:600}}>{l}</div>
                <input type={t} placeholder={ph} value={form[k]} onChange={set(k)}
                  style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:4,fontWeight:600}}>Date échéance</div>
              <input type="date" value={form.echeance} onChange={set("echeance")}
                style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>{setShowForm(false);setEditEleve(null);}} style={btnS("#F3F4F6",C.muted)}>Annuler</button>
            <button onClick={ajouter} style={btnS(C.primary,"#FFF")}>{editEleve?"✓ Modifier":"✓ Ajouter"}</button>
          </div>
        </div>
      )}

      {/* Liste élèves */}
      {filtres.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40}}><div style={{fontSize:40,marginBottom:10}}>🎒</div>Aucun élève.</div>}
      {filtres.map(e=>{
        const r=e.montantTotal-(e.montantPaye||0);
        const pct=Math.min(100,Math.round(((e.montantPaye||0)/e.montantTotal)*100));
        const retard=r>0&&e.echeance&&new Date(e.echeance)<new Date();
        const sc=r<=0?"#10B981":retard?C.danger:C.accent;
        return(
          <div key={e.id} style={{background:C.surface,borderRadius:12,padding:"14px 16px",marginBottom:8,boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderLeft:`4px solid ${sc}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{e.nom}</div>
                <div style={{fontSize:12,color:C.muted}}>{e.classe} · Parent : {e.nomParent} · {e.telParent}</div>
                {e.echeance&&<div style={{fontSize:11,color:retard?C.danger:C.muted}}>Échéance : {new Date(e.echeance).toLocaleDateString("fr-FR")}</div>}
              </div>
              <span style={{background:sc+"20",color:sc,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap"}}>
                {r<=0?"✅ Payé":retard?"⚠️ En retard":"⏳ En attente"}
              </span>
            </div>
            <div style={{background:"#F3F4F6",borderRadius:20,height:8,marginBottom:8}}>
              <div style={{background:sc,borderRadius:20,height:8,width:pct+"%",transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:10}}>
              <span>Payé : <strong style={{color:"#10B981"}}>{fmt(e.montantPaye||0)}</strong></span>
              <span style={{fontWeight:700}}>{pct}%</span>
              <span>Reste : <strong style={{color:r>0?C.danger:"#10B981"}}>{fmt(r)}</strong></span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {r>0&&<button onClick={()=>rappel(e)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:"#25D366",color:"#FFF",fontWeight:600,fontSize:12,cursor:"pointer"}}>📲 Rappel WhatsApp</button>}
              {r>0&&<button onClick={()=>{const m=parseFloat(prompt("Montant reçu (F) :"));if(m&&m>0)marquerPaye(e.id,m);}} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:C.primary,color:"#FFF",fontWeight:600,fontSize:12,cursor:"pointer"}}>💰 Enregistrer paiement</button>}
              <button onClick={()=>{setEditEleve(e);setForm({nom:e.nom,classe:e.classe,nomParent:e.nomParent,telParent:e.telParent,montantTotal:String(e.montantTotal),montantPaye:String(e.montantPaye||0),echeance:e.echeance||""});setShowForm(true);}} style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"none",color:C.muted,fontSize:14,cursor:"pointer"}}>✏️</button>
              <button onClick={()=>supprimer(e.id)} style={{padding:"8px 12px",borderRadius:8,border:"none",background:"none",color:C.muted,fontSize:14,cursor:"pointer"}}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
