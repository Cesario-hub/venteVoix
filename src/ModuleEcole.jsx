import { useState, useCallback, useEffect } from "react";
import { supabase } from "./supabase.js";

async function sbFetch(promise,fallback=null){try{const t=new Promise((_,r)=>setTimeout(()=>r(new Error("timeout")),5000));return await Promise.race([promise,t]);}catch{return fallback||{data:null};}}

// ══════════════════════════════════════════════════════════════════════════════
// VENTEVOIX ÉCOLE — Interface professionnelle PC & Mobile
// ══════════════════════════════════════════════════════════════════════════════

const CE = {
  bg:"#F8FAFF",surface:"#FFFFFF",primary:"#4338CA",primaryMid:"#6366F1",
  primaryLight:"#818CF8",accent:"#F59E0B",danger:"#DC2626",success:"#16A34A",
  warning:"#D97706",text:"#111827",muted:"#6B7280",border:"#E5E7EB",purple:"#7C3AED",
  sidebar:"#1E1B4B"
};

const fmt = n => new Intl.NumberFormat("fr-FR").format(n||0)+" F";
const fmtN = n => new Intl.NumberFormat("fr-FR").format(n||0);
const fmtDate = d => d?new Date(d).toLocaleDateString("fr-FR"):"—";
const today = () => new Date().toISOString().slice(0,10);

function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch{return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}

// ── UI Components ─────────────────────────────────────────────────────────────
function Btn({onClick,bg,color,children,full,sm,disabled}){
  return(
    <button onClick={onClick} disabled={disabled}
      style={{padding:sm?"6px 12px":"10px 18px",borderRadius:10,border:"none",
        background:disabled?"#E5E7EB":bg,color:disabled?CE.muted:color,
        fontWeight:700,fontSize:sm?11:13,cursor:disabled?"not-allowed":"pointer",
        width:full?"100%":undefined,display:"inline-flex",alignItems:"center",
        justifyContent:"center",gap:6,opacity:disabled?.6:1}}>
      {children}
    </button>
  );
}

function Card({children,style={}}){
  return(
    <div style={{background:CE.surface,borderRadius:16,padding:20,
      boxShadow:"0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.04)",...style}}>
      {children}
    </div>
  );
}

function KPI({icon,label,value,sub,color,trend}){
  return(
    <div style={{background:CE.surface,borderRadius:16,padding:"18px 20px",
      boxShadow:"0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.04)",
      borderTop:`3px solid ${color||CE.primary}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,color:CE.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{label}</div>
          <div style={{fontSize:26,fontWeight:800,color:color||CE.primary,lineHeight:1}}>{value}</div>
          {sub&&<div style={{fontSize:11,color:CE.muted,marginTop:5}}>{sub}</div>}
        </div>
        <div style={{fontSize:28,opacity:.8}}>{icon}</div>
      </div>
    </div>
  );
}

function Field({label,k,type="text",ph,val,onChange,req,options,half}){
  const s={width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:10,
    padding:"10px 14px",fontSize:13,boxSizing:"border-box",outline:"none",
    background:CE.surface,transition:"border-color .2s",cursor:type==="date"||options?"pointer":"text",
    WebkitAppearance:"none"};
  return(
    <div style={{gridColumn:half?"span 1":undefined}}>
      <label style={{fontSize:11,color:CE.muted,marginBottom:4,fontWeight:600,letterSpacing:.3,display:"block"}}>{label}{req&&<span style={{color:CE.danger}}> *</span>}</label>>
      {options?(
        <select value={val||""} onChange={e=>onChange(k,e.target.value)} style={s}>
          {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      ):(
        <input type={type} placeholder={ph} value={val||""} onChange={e=>onChange(k,e.target.value)} onClick={e=>e.stopPropagation()} onFocus={e=>e.target.style.borderColor=CE.primary} onBlur={e=>e.target.style.borderColor=CE.border} style={s}/>
      )}
    </div>
  );
}

function Badge({label,color,bg}){
  return(
    <span style={{background:bg||color+"18",color:color,fontSize:10,fontWeight:700,
      padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:.3}}>
      {label}
    </span>
  );
}

function Progress({pct,color}){
  const c=pct>=100?CE.success:pct>=50?CE.primary:CE.danger;
  return(
    <div>
      <div style={{background:"#F3F4F6",borderRadius:20,height:8,overflow:"hidden"}}>
        <div style={{background:color||c,borderRadius:20,height:8,width:Math.min(100,pct)+"%",transition:"width .4s ease"}}/>
      </div>
      <div style={{fontSize:10,color:CE.muted,textAlign:"right",marginTop:2}}>{Math.round(pct)}%</div>
    </div>
  );
}

function EmptyState({icon,msg}){
  return(
    <div style={{textAlign:"center",padding:"60px 20px",color:CE.muted}}>
      <div style={{fontSize:48,marginBottom:12,opacity:.4}}>{icon}</div>
      <div style={{fontSize:14}}>{msg}</div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({eleves,paiements,personnel,fournitures,depenses,config,parler}){
  const totalFrais=eleves.reduce((s,e)=>s+(e.fraisTotal||0),0);
  const totalEnc=eleves.reduce((s,e)=>s+paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0),0);
  const totalDep=depenses.reduce((s,d)=>s+d.montant,0);
  const nRetard=eleves.filter(e=>{
    const p=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    return (e.fraisTotal-p)>0&&e.echeance&&new Date(e.echeance)<new Date();
  }).length;
  const masseS=personnel.filter(p=>p.statut==="actif").reduce((s,p)=>s+(p.salaire||0),0);
  const pct=totalFrais>0?Math.round((totalEnc/totalFrais)*100):0;

  const rapport=()=>{
    const t=`Bonjour. Bilan de l'école. ${eleves.length} élèves inscrits. Frais attendus : ${fmtN(totalFrais)} francs. Encaissé : ${fmtN(totalEnc)} francs. Reste à recouvrer : ${fmtN(totalFrais-totalEnc)} francs.${nRetard>0?` Attention : ${nRetard} élèves en retard de paiement.`:""} Dépenses du mois : ${fmtN(totalDep)} francs. Masse salariale : ${fmtN(masseS)} francs par mois.`;
    parler(t);
    const msg=encodeURIComponent(`📊 *Bilan École — ${new Date().toLocaleDateString("fr-FR")}*\n\n👥 Élèves : ${eleves.length}\n💰 Frais attendus : ${fmt(totalFrais)}\n✅ Encaissé : ${fmt(totalEnc)} (${pct}%)\n⚠️ Reste : ${fmt(totalFrais-totalEnc)}\n💸 Dépenses : ${fmt(totalDep)}\n👨‍🏫 Masse salariale : ${fmt(masseS)}/mois${nRetard>0?`\n🔴 ${nRetard} élève(s) en retard`:""}`);
    setTimeout(()=>window.open(`https://wa.me/${(config?.WHATSAPP_NUMBER||"").replace(/\D/g,"")}?text=${msg}`,"_blank"),1500);
  };

  return(
    <div>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI icon="👥" label="Élèves inscrits" value={fmtN(eleves.length)} sub={`${personnel.length} personnel`} color={CE.primary}/>
        <KPI icon="💰" label="Frais attendus" value={fmt(totalFrais)} sub="Total scolarités" color={CE.primary}/>
        <KPI icon="✅" label="Encaissé" value={fmt(totalEnc)} sub={`${eleves.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)>=(e.fraisTotal||0)).length} élèves à jour`} color={CE.success}/>
        <KPI icon="⏳" label="À recouvrer" value={fmt(totalFrais-totalEnc)} sub={nRetard>0?`⚠️ ${nRetard} en retard`:"Aucun retard"} color={totalFrais-totalEnc>0?CE.danger:CE.success}/>
        <KPI icon="💸" label="Dépenses" value={fmt(totalDep)} sub="Total cumulé" color={CE.danger}/>
        <KPI icon="👨‍🏫" label="Masse salariale" value={fmt(masseS)} sub="Par mois" color={CE.purple}/>
      </div>

      {/* Taux recouvrement */}
      <Card style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>Taux de recouvrement global</div>
            <div style={{fontSize:12,color:CE.muted}}>Frais de scolarité collectés</div>
          </div>
          <div style={{fontSize:36,fontWeight:800,color:pct>=80?CE.success:pct>=50?CE.warning:CE.danger}}>{pct}%</div>
        </div>
        <div style={{background:"#F3F4F6",borderRadius:20,height:16,overflow:"hidden"}}>
          <div style={{background:pct>=80?CE.success:pct>=50?CE.warning:CE.danger,borderRadius:20,height:16,width:pct+"%",transition:"width .6s ease",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
            {pct>15&&<span style={{fontSize:10,color:"#FFF",fontWeight:700}}>{fmt(totalEnc)}</span>}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:CE.muted,marginTop:6}}>
          <span>0 F</span><span>{fmt(totalFrais)}</span>
        </div>
      </Card>

      {/* Bouton rapport */}
      <Btn onClick={rapport} bg={CE.primary} color="#FFF" full>🎙️ Rapport audio & Envoyer sur WhatsApp</Btn>

      {/* Alertes */}
      {nRetard>0&&(
        <Card style={{marginTop:16,borderLeft:`4px solid ${CE.danger}`}}>
          <div style={{fontWeight:700,color:CE.danger,fontSize:14,marginBottom:12}}>⚠️ Élèves en retard de paiement ({nRetard})</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:8}}>
            {eleves.filter(e=>{
              const p=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
              return (e.fraisTotal-p)>0&&e.echeance&&new Date(e.echeance)<new Date();
            }).map(e=>{
              const p=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
              return(
                <div key={e.id} style={{background:"#FEF2F2",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{e.nom} {e.prenom||""}</div>
                    <div style={{fontSize:11,color:CE.muted}}>{e.classe}</div>
                  </div>
                  <div style={{fontWeight:800,color:CE.danger}}>{fmt(e.fraisTotal-p)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── ÉLÈVES ────────────────────────────────────────────────────────────────────
function Eleves({eleves,setEleves,paiements,setPaiements,config}){
  const[showForm,setShowForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const[filtre,setFiltre]=useState("tous");
  const[search,setSearch]=useState("");
  const initF={nom:"",prenom:"",classe:"",dateNaissance:"",nomParent:"",telParent:"",telParent2:"",adresse:"",fraisTotal:"",echeance:"",statut:"inscrit"};
  const[form,setForm]=useState(initF);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const save=()=>{
    if(!form.nom.trim()||!form.fraisTotal) return;
    if(editId){
      setEleves(p=>p.map(e=>e.id===editId?{...e,...form,fraisTotal:parseFloat(form.fraisTotal)||0}:e));
      setEditId(null);
    }else{
      setEleves(p=>[...p,{id:Date.now(),...form,fraisTotal:parseFloat(form.fraisTotal)||0,createdAt:new Date().toISOString()}]);
    }
    setForm(initF);setShowForm(false);
  };

  const del=id=>{
    if(!confirm("Supprimer ?")) return;
    setEleves(p=>p.filter(e=>e.id!==id));
    setPaiements(p=>p.filter(x=>x.eleveId!==id));
  };

  const rappel=(e)=>{
    const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    const r=e.fraisTotal-pays;
    const msg=encodeURIComponent(`Bonjour ${e.nomParent} !\n\n📚 *Scolarité de ${e.nom} ${e.prenom||""} — ${e.classe}*\n\n💰 Total : *${fmt(e.fraisTotal)}*\n✅ Payé : *${fmt(pays)}*\n⚠️ Reste : *${fmt(r)}*${e.echeance?`\n📅 Échéance : ${fmtDate(e.echeance)}`:""}\n\nPayez par :\n📱 Wave : ${config?.WAVE_NUMBER||"—"}\n📱 Orange : ${config?.ORANGE_NUMBER||"—"}\n\nMerci 🙏`);
    window.open(`https://wa.me/${(e.telParent||"").replace(/\D/g,"")}?text=${msg}`,"_blank");
  };

  const filtres=eleves.filter(e=>{
    const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    const r=e.fraisTotal-pays;
    const retard=r>0&&e.echeance&&new Date(e.echeance)<new Date();
    if(filtre==="payes"&&r>0) return false;
    if(filtre==="impayés"&&r<=0) return false;
    if(filtre==="retard"&&!retard) return false;
    if(search&&!`${e.nom} ${e.prenom||""} ${e.classe||""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return(
    <div>
      {/* Toolbar */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input placeholder="🔍 Rechercher par nom, prénom ou classe..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:"1 1 200px",border:`1.5px solid ${CE.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,outline:"none"}}/>
        <Btn onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(initF);}} bg={CE.primary} color="#FFF">+ Ajouter élève</Btn>
        {filtres.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)<e.fraisTotal).length>0&&(
          <Btn onClick={()=>filtres.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)<e.fraisTotal).forEach((e,i)=>setTimeout(()=>rappel(e),i*1000))} bg="#25D366" color="#FFF">
            📲 Rappels en masse
          </Btn>
        )}
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        {[["tous","🗂 Tous"],["payes","✅ Payés"],["impayés","💰 Impayés"],["retard","⚠️ Retard"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltre(v)}
            style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${filtre===v?CE.primary:CE.border}`,background:filtre===v?CE.primary:"transparent",color:filtre===v?"#FFF":CE.muted,fontSize:12,fontWeight:filtre===v?700:400,cursor:"pointer"}}>
            {l}
          </button>
        ))}
        <span style={{marginLeft:"auto",fontSize:12,color:CE.muted,fontWeight:600}}>{filtres.length} / {eleves.length} élève(s)</span>
      </div>

      {/* Formulaire */}
      {showForm&&(
        <Card style={{marginBottom:20,border:`1.5px solid ${CE.primaryLight}`}}>
          <div style={{fontWeight:700,fontSize:15,color:CE.primary,marginBottom:16}}>{editId?"✏️ Modifier élève":"➕ Nouvel élève"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:16}}>
            <Field label="Nom" k="nom" val={form.nom} onChange={setF} req/>
            <Field label="Prénom" k="prenom" val={form.prenom} onChange={setF}/>
            <Field label="Classe" k="classe" val={form.classe} onChange={setF} req ph="ex: CE2, 3ème, Terminale..."/>
            <Field label="Date de naissance" k="dateNaissance" type="date" val={form.dateNaissance} onChange={setF}/>
            <Field label="Nom parent / tuteur" k="nomParent" val={form.nomParent} onChange={setF} req/>
            <Field label="Téléphone parent 1" k="telParent" type="tel" val={form.telParent} onChange={setF} req ph="+225 07 XX XX XX"/>
            <Field label="Téléphone parent 2" k="telParent2" type="tel" val={form.telParent2} onChange={setF}/>
            <Field label="Adresse" k="adresse" val={form.adresse} onChange={setF}/>
            <Field label="Frais de scolarité (F)" k="fraisTotal" type="number" val={form.fraisTotal} onChange={setF} req ph="ex: 150000"/>
            <Field label="Date d'échéance" k="echeance" type="date" val={form.echeance} onChange={setF}/>
            <Field label="Statut" k="statut" val={form.statut} onChange={setF} options={[["inscrit","✅ Inscrit"],["attente","⏳ En attente"],["radie","❌ Radié"]]}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>{setShowForm(false);setEditId(null);}} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.primary} color="#FFF">{editId?"✓ Modifier":"✓ Enregistrer"}</Btn>
          </div>
        </Card>
      )}

      {/* Liste élèves — grille sur PC */}
      {filtres.length===0&&<EmptyState icon="🎒" msg="Aucun élève trouvé."/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
        {filtres.map(e=>{
          const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
          const r=e.fraisTotal-pays;
          const pct=e.fraisTotal>0?Math.min(100,Math.round((pays/e.fraisTotal)*100)):0;
          const retard=r>0&&e.echeance&&new Date(e.echeance)<new Date();
          const sc=r<=0?CE.success:retard?CE.danger:CE.accent;
          return(
            <Card key={e.id} style={{borderTop:`3px solid ${sc}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{e.nom} {e.prenom||""}</div>
                  <div style={{fontSize:12,color:CE.muted,marginTop:2}}>{e.classe}</div>
                  <div style={{fontSize:11,color:CE.muted}}>👤 {e.nomParent} · 📱 {e.telParent}</div>
                  {e.adresse&&<div style={{fontSize:11,color:CE.muted}}>📍 {e.adresse}</div>}
                  {e.echeance&&<div style={{fontSize:11,color:retard?CE.danger:CE.muted,marginTop:2}}>📅 Échéance : {fmtDate(e.echeance)}</div>}
                </div>
                <Badge label={r<=0?"✅ Payé":retard?"⚠️ Retard":"⏳ Attente"} color={sc}/>
              </div>
              <Progress pct={pct} color={sc}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:6,marginBottom:12}}>
                <span style={{color:CE.success,fontWeight:600}}>✅ {fmt(pays)}</span>
                <span style={{color:r>0?CE.danger:CE.success,fontWeight:600}}>Reste: {fmt(r)}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {r>0&&<Btn onClick={()=>rappel(e)} bg="#25D366" color="#FFF" sm>📲 Rappel</Btn>}
                <Btn onClick={()=>{setEditId(e.id);setForm({nom:e.nom,prenom:e.prenom||"",classe:e.classe||"",dateNaissance:e.dateNaissance||"",nomParent:e.nomParent||"",telParent:e.telParent||"",telParent2:e.telParent2||"",adresse:e.adresse||"",fraisTotal:String(e.fraisTotal||0),echeance:e.echeance||"",statut:e.statut||"inscrit"});setShowForm(true);}} bg="#EEF2FF" color={CE.primary} sm>✏️</Btn>
                <Btn onClick={()=>del(e.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── PAIEMENTS ─────────────────────────────────────────────────────────────────
function Paiements({eleves,paiements,setPaiements}){
  const[eleveId,setEleveId]=useState("");
  const[form,setForm]=useState({montant:"",mode:"cash",note:"",date:today()});
  const[filtreE,setFiltreE]=useState("");
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const ajouter=()=>{
    if(!eleveId||!form.montant) return;
    setPaiements(prev=>[{id:Date.now(),eleveId:Number(eleveId),montant:parseFloat(form.montant)||0,mode:form.mode,note:form.note,date:form.date,createdAt:new Date().toISOString()},...prev]);
    setForm({montant:"",mode:"cash",note:"",date:today()});
    setEleveId("");
  };

  const del=id=>{if(confirm("Supprimer ?"))setPaiements(prev=>prev.filter(p=>p.id!==id));};
  const modeIcon={cash:"💵 Cash",wave:"📱 Wave",orange:"🟠 Orange",cheque:"🏦 Chèque"};
  const pFiltres=filtreE?paiements.filter(p=>p.eleveId===Number(filtreE)):paiements;
  const totalPeriode=pFiltres.reduce((s,p)=>s+p.montant,0);

  return(
    <div style={{display:"grid",gridTemplateColumns:"minmax(300px,420px) 1fr",gap:20,alignItems:"start"}}>
      {/* Colonne gauche — Formulaire */}
      <div>
        <Card style={{marginBottom:0,border:`1px solid ${CE.primaryLight}`}}>
          <div style={{fontWeight:700,fontSize:15,color:CE.primary,marginBottom:14}}>💰 Enregistrer un paiement</div>
          
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:CE.muted,marginBottom:4,fontWeight:600}}>Élève *</div>
            <select value={eleveId} onChange={e=>setEleveId(e.target.value)}
              style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none",background:"#FFF"}}>
              <option value="">-- Choisir un élève --</option>
              {eleves.map(e=>{
                const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
                const r=e.fraisTotal-pays;
                return <option key={e.id} value={e.id}>{e.nom} {e.prenom||""} — {e.classe} (reste: {fmtN(r)} F)</option>;
              })}
            </select>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:11,color:CE.muted,marginBottom:4,fontWeight:600}}>Montant (F) *</div>
              <input type="number" placeholder="50000" value={form.montant} onChange={e=>setF("montant",e.target.value)}
                style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:CE.muted,marginBottom:4,fontWeight:600}}>Date</div>
              <input type="date" value={form.date} onChange={e=>setF("date",e.target.value)}
                style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:CE.muted,marginBottom:5,fontWeight:600}}>Mode de paiement</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["cash","💵"],["wave","📱 Wave"],["orange","🟠 Orange"],["cheque","🏦"]].map(([v,l])=>(
                <button key={v} onClick={()=>setF("mode",v)}
                  style={{padding:"7px 12px",borderRadius:8,border:`1.5px solid ${form.mode===v?CE.primary:CE.border}`,background:form.mode===v?CE.primary:"transparent",color:form.mode===v?"#FFF":CE.muted,fontWeight:700,fontSize:12,cursor:"pointer"}}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:CE.muted,marginBottom:4,fontWeight:600}}>Note (optionnel)</div>
            <input placeholder="ex: 1ère tranche" value={form.note} onChange={e=>setF("note",e.target.value)}
              style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
          </div>

          <Btn onClick={ajouter} bg={CE.primary} color="#FFF" full>✓ Enregistrer le paiement</Btn>
        </Card>
      </div>

      {/* Colonne droite — Historique */}
      <div>
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
          <select value={filtreE} onChange={e=>setFiltreE(e.target.value)}
            style={{flex:1,border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}>
            <option value="">📋 Tous les paiements ({paiements.length})</option>
            {eleves.map(e=><option key={e.id} value={e.id}>{e.nom} {e.prenom||""} — {e.classe}</option>)}
          </select>
          <div style={{background:CE.success+"15",color:CE.success,fontWeight:700,fontSize:14,padding:"9px 16px",borderRadius:8,whiteSpace:"nowrap"}}>{fmt(totalPeriode)}</div>
        </div>

        {pFiltres.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:40,background:CE.surface,borderRadius:14}}>Aucun paiement enregistré.</div>}
        <div style={{maxHeight:"calc(100vh - 220px)",overflowY:"auto"}}>
          {pFiltres.map(p=>{
            const e=eleves.find(x=>x.id===p.eleveId);
            return(
              <div key={p.id} style={{background:CE.surface,borderRadius:10,padding:"12px 16px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",justifyContent:"space-between",alignItems:"center",borderLeft:`3px solid ${CE.success}`}}>
                <div>
                  <div style={{fontWeight:700,color:CE.success,fontSize:16}}>+{fmt(p.montant)}</div>
                  <div style={{fontSize:13,color:CE.text,fontWeight:600}}>{e?`${e.nom} ${e.prenom||""} — ${e.classe}`:"Élève supprimé"}</div>
                  <div style={{fontSize:11,color:CE.muted}}>{modeIcon[p.mode]||"💵"} · {fmtDate(p.date)}{p.note?` · ${p.note}`:""}</div>
                </div>
                <Btn onClick={()=>del(p.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function Personnel({personnel,setPersonnel}){
  const[showForm,setShowForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const initF={nom:"",prenom:"",poste:"",tel:"",email:"",salaire:"",dateEmbauche:"",statut:"actif"};
  const[form,setForm]=useState(initF);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const save=()=>{
    if(!form.nom.trim()||!form.poste) return;
    if(editId){setPersonnel(p=>p.map(x=>x.id===editId?{...x,...form,salaire:parseFloat(form.salaire)||0}:x));setEditId(null);}
    else setPersonnel(p=>[...p,{id:Date.now(),...form,salaire:parseFloat(form.salaire)||0,createdAt:new Date().toISOString()}]);
    setForm(initF);setShowForm(false);
  };

  const del=id=>{if(confirm("Supprimer ?"))setPersonnel(p=>p.filter(x=>x.id!==id));};
  const masseS=personnel.filter(p=>p.statut==="actif").reduce((s,p)=>s+(p.salaire||0),0);

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
        <KPI icon="👥" label="Total personnel" value={fmtN(personnel.length)} sub={`${personnel.filter(p=>p.statut==="actif").length} actifs`} color={CE.purple}/>
        <KPI icon="💰" label="Masse salariale" value={fmt(masseS)} sub="Par mois (actifs)" color={CE.purple}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <Btn onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(initF);}} bg={CE.purple} color="#FFF">+ Ajouter membre</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:20,border:`1.5px solid ${CE.purple}40`}}>
          <div style={{fontWeight:700,fontSize:15,color:CE.purple,marginBottom:16}}>{editId?"✏️ Modifier":"➕ Nouveau membre"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:16}}>
            <Field label="Nom" k="nom" val={form.nom} onChange={setF} req/>
            <Field label="Prénom" k="prenom" val={form.prenom} onChange={setF}/>
            <Field label="Poste / Fonction" k="poste" val={form.poste} onChange={setF} req ph="ex: Enseignant CE2, Directeur..."/>
            <Field label="Téléphone" k="tel" type="tel" val={form.tel} onChange={setF}/>
            <Field label="Email" k="email" type="email" val={form.email} onChange={setF}/>
            <Field label="Salaire mensuel (F)" k="salaire" type="number" val={form.salaire} onChange={setF} ph="ex: 150000"/>
            <Field label="Date d'embauche" k="dateEmbauche" type="date" val={form.dateEmbauche} onChange={setF}/>
            <Field label="Statut" k="statut" val={form.statut} onChange={setF} options={[["actif","✅ Actif"],["conge","🏖️ Congé"],["suspendu","⛔ Suspendu"]]}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>{setShowForm(false);setEditId(null);}} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.purple} color="#FFF">{editId?"✓ Modifier":"✓ Ajouter"}</Btn>
          </div>
        </Card>
      )}
      {personnel.length===0&&<EmptyState icon="👨‍🏫" msg="Aucun membre du personnel."/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {personnel.map(p=>(
          <Card key={p.id} style={{borderTop:`3px solid ${p.statut==="actif"?CE.purple:CE.muted}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{p.nom} {p.prenom||""}</div>
                <div style={{fontSize:13,color:CE.primary,fontWeight:600}}>{p.poste}</div>
                <div style={{fontSize:11,color:CE.muted,marginTop:2}}>{p.tel}{p.email?` · ${p.email}`:""}</div>
                {p.dateEmbauche&&<div style={{fontSize:11,color:CE.muted}}>Depuis : {fmtDate(p.dateEmbauche)}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,fontSize:18,color:CE.purple}}>{fmt(p.salaire)}</div>
                <div style={{fontSize:10,color:CE.muted}}>/ mois</div>
                <Badge label={p.statut==="actif"?"✅ Actif":p.statut==="conge"?"🏖️ Congé":"⛔ Suspendu"} color={p.statut==="actif"?CE.purple:CE.muted}/>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={()=>{setEditId(p.id);setForm({nom:p.nom,prenom:p.prenom||"",poste:p.poste||"",tel:p.tel||"",email:p.email||"",salaire:String(p.salaire||0),dateEmbauche:p.dateEmbauche||"",statut:p.statut||"actif"});setShowForm(true);}} bg="#F5F3FF" color={CE.purple} sm>✏️ Modifier</Btn>
              <Btn onClick={()=>del(p.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── FOURNITURES ───────────────────────────────────────────────────────────────
function Fournitures({fournitures,setFournitures}){
  const[showForm,setShowForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const initF={nom:"",categorie:"Livres",quantite:"",prixUnitaire:"",seuil:"5"};
  const[form,setForm]=useState(initF);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const save=()=>{
    if(!form.nom.trim()) return;
    if(editId){setFournitures(p=>p.map(f=>f.id===editId?{...f,...form,quantite:parseFloat(form.quantite)||0,prixUnitaire:parseFloat(form.prixUnitaire)||0,seuil:parseFloat(form.seuil)||5}:f));setEditId(null);}
    else setFournitures(p=>[...p,{id:Date.now(),...form,quantite:parseFloat(form.quantite)||0,prixUnitaire:parseFloat(form.prixUnitaire)||0,seuil:parseFloat(form.seuil)||5}]);
    setForm(initF);setShowForm(false);
  };

  const del=id=>{if(confirm("Supprimer ?"))setFournitures(p=>p.filter(f=>f.id!==id));};
  const adj=(id,d)=>setFournitures(p=>p.map(f=>f.id===id?{...f,quantite:Math.max(0,(f.quantite||0)+d)}:f));
  const valTotal=fournitures.reduce((s,f)=>s+(f.quantite||0)*(f.prixUnitaire||0),0);
  const alertes=fournitures.filter(f=>(f.quantite||0)<=(f.seuil||5));
  const cats=["Livres","Cahiers","Uniformes","Matériel","Autre"];

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
        <KPI icon="📦" label="Articles" value={fmtN(fournitures.length)} color={CE.accent}/>
        <KPI icon="💰" label="Valeur totale" value={fmt(valTotal)} color={CE.accent}/>
        {alertes.length>0&&<KPI icon="⚠️" label="Stock faible" value={fmtN(alertes.length)} sub="articles à réapprovisionner" color={CE.danger}/>}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <Btn onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(initF);}} bg={CE.accent} color="#FFF">+ Ajouter article</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:20,border:`1.5px solid ${CE.accent}60`}}>
          <div style={{fontWeight:700,fontSize:15,color:CE.accent,marginBottom:16}}>{editId?"✏️ Modifier":"➕ Nouvel article"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:16}}>
            <Field label="Nom article" k="nom" val={form.nom} onChange={setF} req ph="ex: Cahier 100 pages"/>
            <Field label="Catégorie" k="categorie" val={form.categorie} onChange={setF} options={cats.map(c=>[c,"📦 "+c])}/>
            <Field label="Quantité en stock" k="quantite" type="number" val={form.quantite} onChange={setF}/>
            <Field label="Prix unitaire (F)" k="prixUnitaire" type="number" val={form.prixUnitaire} onChange={setF}/>
            <Field label="Seuil d'alerte" k="seuil" type="number" val={form.seuil} onChange={setF}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>{setShowForm(false);setEditId(null);}} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.accent} color="#FFF">{editId?"✓ Modifier":"✓ Ajouter"}</Btn>
          </div>
        </Card>
      )}
      {fournitures.length===0&&<EmptyState icon="📦" msg="Aucune fourniture en stock."/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {fournitures.map(f=>{
          const alerte=(f.quantite||0)<=(f.seuil||5);
          return(
            <Card key={f.id} style={{borderTop:`3px solid ${alerte?CE.danger:CE.accent}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{f.nom}</div>
                  <div style={{fontSize:12,color:CE.muted}}>{f.categorie} · {fmt(f.prixUnitaire)} / unité</div>
                  <div style={{fontSize:12,color:CE.muted}}>Valeur stock : {fmt((f.quantite||0)*(f.prixUnitaire||0))}</div>
                  {alerte&&<Badge label="⚠️ Stock faible" color={CE.danger}/>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <button onClick={()=>adj(f.id,1)} style={{width:36,height:36,borderRadius:"50%",border:"none",background:CE.accent,color:"#FFF",cursor:"pointer",fontSize:18,fontWeight:700}}>+</button>
                  <div style={{fontWeight:800,fontSize:22,color:alerte?CE.danger:CE.text,minWidth:40,textAlign:"center"}}>{f.quantite||0}</div>
                  <button onClick={()=>adj(f.id,-1)} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${CE.border}`,background:"#FFF",cursor:"pointer",fontSize:18,fontWeight:700}}>−</button>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Btn onClick={()=>{setEditId(f.id);setForm({nom:f.nom,categorie:f.categorie||"Livres",quantite:String(f.quantite||0),prixUnitaire:String(f.prixUnitaire||0),seuil:String(f.seuil||5)});setShowForm(true);}} bg="#FFFBEB" color={CE.accent} sm>✏️</Btn>
                <Btn onClick={()=>del(f.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── DÉPENSES ──────────────────────────────────────────────────────────────────
function Depenses({depenses,setDepenses}){
  const[showForm,setShowForm]=useState(false);
  const initF={description:"",categorie:"Electricite",montant:"",date:today(),note:""};
  const[form,setForm]=useState(initF);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const[filtreMois,setFiltreMois]=useState("");

  const save=()=>{
    if(!form.description.trim()||!form.montant) return;
    setDepenses(p=>[{id:Date.now(),...form,montant:parseFloat(form.montant)||0,createdAt:new Date().toISOString()},...p]);
    setForm(initF);setShowForm(false);
  };

  const del=id=>{if(confirm("Supprimer ?"))setDepenses(p=>p.filter(d=>d.id!==id));};
  const mois=[...new Set(depenses.map(d=>d.date?.slice(0,7)))].sort().reverse();
  const dFiltres=filtreMois?depenses.filter(d=>d.date?.startsWith(filtreMois)):depenses;
  const total=dFiltres.reduce((s,d)=>s+d.montant,0);
  const thisMois=depenses.filter(d=>d.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,d)=>s+d.montant,0);
  const catIcon={Electricite:"💡",Eau:"💧",Loyer:"🏠",Salaires:"👨‍🏫",Entretien:"🔧",Transport:"🚗",Materiel:"📚",Administration:"📋",Autre:"📦"};

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
        <KPI icon="💸" label="Total dépenses" value={fmt(depenses.reduce((s,d)=>s+d.montant,0))} color={CE.danger}/>
        <KPI icon="📅" label="Ce mois-ci" value={fmt(thisMois)} color={CE.warning}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <Btn onClick={()=>setShowForm(!showForm)} bg={CE.danger} color="#FFF">+ Ajouter dépense</Btn>
      </div>
      {showForm&&(
        <Card style={{marginBottom:20,border:`1.5px solid ${CE.danger}40`}}>
          <div style={{fontWeight:700,fontSize:15,color:CE.danger,marginBottom:16}}>➕ Nouvelle dépense</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:16}}>
            <Field label="Description" k="description" val={form.description} onChange={setF} req ph="ex: Facture électricité avril"/>
            <Field label="Catégorie" k="categorie" val={form.categorie} onChange={setF} options={[["Electricite","💡 Électricité"],["Eau","💧 Eau"],["Loyer","🏠 Loyer"],["Salaires","👨‍🏫 Salaires"],["Entretien","🔧 Entretien"],["Transport","🚗 Transport"],["Materiel","📚 Matériel"],["Administration","📋 Administration"],["Autre","📦 Autre"]]}/>
            <Field label="Montant (F)" k="montant" type="number" val={form.montant} onChange={setF} req ph="ex: 45000"/>
            <Field label="Date" k="date" type="date" val={form.date} onChange={setF}/>
            <Field label="Note" k="note" val={form.note} onChange={setF} ph="Détails optionnels"/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>setShowForm(false)} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.danger} color="#FFF">✓ Ajouter</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <select value={filtreMois} onChange={e=>setFiltreMois(e.target.value)}
          style={{flex:1,border:`1.5px solid ${CE.border}`,borderRadius:10,padding:"10px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}>
          <option value="">📅 Toutes les dépenses</option>
          {mois.map(m=><option key={m} value={m}>{new Date(m+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}</option>)}
        </select>
        <div style={{background:CE.danger+"15",color:CE.danger,fontWeight:700,padding:"10px 14px",borderRadius:10,fontSize:13,whiteSpace:"nowrap"}}>{fmt(total)}</div>
      </div>
      {dFiltres.length===0&&<EmptyState icon="💸" msg="Aucune dépense."/>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {dFiltres.map(d=>(
          <Card key={d.id} style={{padding:"12px 16px",borderLeft:`3px solid ${CE.danger}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,color:CE.danger,fontSize:15}}>−{fmt(d.montant)}</div>
                <div style={{fontSize:13,color:CE.text}}>{catIcon[d.categorie]||"📦"} {d.description}</div>
                <div style={{fontSize:11,color:CE.muted}}>{d.categorie} · {fmtDate(d.date)}{d.note?` · ${d.note}`:""}</div>
              </div>
              <Btn onClick={()=>del(d.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── RAPPORTS ──────────────────────────────────────────────────────────────────
function Rapports({eleves,paiements,personnel,fournitures,depenses}){
  const classes=[...new Set(eleves.map(e=>e.classe).filter(Boolean))].sort();
  const totalFrais=eleves.reduce((s,e)=>s+(e.fraisTotal||0),0);
  const totalEnc=paiements.reduce((s,p)=>s+p.montant,0);
  const totalDep=depenses.reduce((s,d)=>s+d.montant,0);
  const masseS=personnel.filter(p=>p.statut==="actif").reduce((s,p)=>s+(p.salaire||0),0);

  return(
    <div>
      {/* Bilan général */}
      <Card style={{marginBottom:20,border:`1.5px solid ${CE.primaryLight}`}}>
        <div style={{fontWeight:700,fontSize:16,color:CE.primary,marginBottom:16}}>📋 Bilan général de l'école</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
          {[["👥 Élèves",fmtN(eleves.length)+" inscrits",CE.primary],["👨‍🏫 Personnel",fmtN(personnel.filter(p=>p.statut==="actif").length)+" actifs",CE.purple],["💰 Frais attendus",fmt(totalFrais),CE.primary],["✅ Encaissé",fmt(totalEnc),CE.success],["⏳ Reste",fmt(totalFrais-totalEnc),totalFrais-totalEnc>0?CE.danger:CE.success],["💸 Dépenses",fmt(totalDep),CE.danger],["👔 Masse salariale",fmt(masseS)+"/mois",CE.purple],["📦 Fournitures",fmt(fournitures.reduce((s,f)=>s+(f.quantite||0)*(f.prixUnitaire||0),0)),CE.accent]].map(([l,v,c])=>(
            <div key={l} style={{background:CE.bg,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,color:CE.muted,marginBottom:3}}>{l}</div>
              <div style={{fontWeight:700,color:c,fontSize:14}}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Par classe */}
      <div style={{fontWeight:700,fontSize:15,color:CE.primary,marginBottom:12}}>📊 Rapport par classe</div>
      {classes.length===0&&<EmptyState icon="📊" msg="Aucune classe à afficher."/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {classes.map(cl=>{
          const es=eleves.filter(e=>e.classe===cl);
          const tF=es.reduce((s,e)=>s+(e.fraisTotal||0),0);
          const tP=es.reduce((s,e)=>s+paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0),0);
          const nP=es.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)>=(e.fraisTotal||0)).length;
          const pct=tF>0?Math.round((tP/tF)*100):0;
          return(
            <Card key={cl}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontWeight:700,fontSize:16}}>{cl}</div>
                <Badge label={`${es.length} élève(s)`} color={CE.primary}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10,textAlign:"center"}}>
                <div><div style={{fontSize:10,color:CE.muted}}>Attendu</div><div style={{fontWeight:700,color:CE.primary,fontSize:13}}>{fmt(tF)}</div></div>
                <div><div style={{fontSize:10,color:CE.muted}}>Encaissé</div><div style={{fontWeight:700,color:CE.success,fontSize:13}}>{fmt(tP)}</div></div>
                <div><div style={{fontSize:10,color:CE.muted}}>Reste</div><div style={{fontWeight:700,color:tF-tP>0?CE.danger:CE.success,fontSize:13}}>{fmt(tF-tP)}</div></div>
              </div>
              <Progress pct={pct}/>
              <div style={{fontSize:11,color:CE.muted,marginTop:6}}>{nP}/{es.length} élèves à jour · {pct}% collecté</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function ModuleEcole({user,config,parler:parlerProp}){
  const parler=parlerProp||((t)=>{const u=new SpeechSynthesisUtterance(t);u.lang="fr-FR";window.speechSynthesis.speak(u);});
  const keys={e:"vv_ecole_eleves_"+user.id,p:"vv_ecole_paiements_"+user.id,s:"vv_ecole_personnel_"+user.id,f:"vv_ecole_fournitures_"+user.id,d:"vv_ecole_depenses_"+user.id};
  const[loading,setLoading]=useState(true);
  const[eleves,setElevesR]=useState(()=>lsGet(keys.e)||[]);
  const[paiements,setPaiementsR]=useState(()=>lsGet(keys.p)||[]);
  const[personnel,setPersonnelR]=useState(()=>lsGet(keys.s)||[]);
  const[fournitures,setFournituresR]=useState(()=>lsGet(keys.f)||[]);
  const[depenses,setDepensesR]=useState(()=>lsGet(keys.d)||[]);

  useEffect(()=>{
    (async()=>{
      try{
        const[eR,pR,sR,fR,dR]=await Promise.all([
          sbFetch(supabase.from("ecole_eleves").select("*").eq("user_id",user.id)),
          sbFetch(supabase.from("ecole_paiements").select("*").eq("user_id",user.id)),
          sbFetch(supabase.from("ecole_personnel").select("*").eq("user_id",user.id)),
          sbFetch(supabase.from("ecole_fournitures").select("*").eq("user_id",user.id)),
          sbFetch(supabase.from("ecole_depenses").select("*").eq("user_id",user.id)),
        ]);
        if(eR?.data?.length){const d=eR.data.map(e=>({id:e.id,nom:e.nom,prenom:e.prenom||"",classe:e.classe||"",dateNaissance:e.date_naissance||"",nomParent:e.nom_parent||"",telParent:e.tel_parent||"",telParent2:e.tel_parent2||"",adresse:e.adresse||"",fraisTotal:parseFloat(e.frais_total)||0,echeance:e.echeance||"",statut:e.statut||"inscrit",createdAt:e.created_at}));setElevesR(d);lsSet(keys.e,d);}
        if(pR?.data?.length){const d=pR.data.map(p=>({id:p.id,eleveId:p.eleve_id,montant:parseFloat(p.montant)||0,mode:p.mode||"cash",note:p.note||"",date:p.date||"",createdAt:p.created_at}));setPaiementsR(d);lsSet(keys.p,d);}
        if(sR?.data?.length){const d=sR.data.map(p=>({id:p.id,nom:p.nom,prenom:p.prenom||"",poste:p.poste||"",tel:p.tel||"",email:p.email||"",salaire:parseFloat(p.salaire)||0,dateEmbauche:p.date_embauche||"",statut:p.statut||"actif"}));setPersonnelR(d);lsSet(keys.s,d);}
        if(fR?.data?.length){const d=fR.data.map(f=>({id:f.id,nom:f.nom,categorie:f.categorie||"",quantite:parseFloat(f.quantite)||0,prixUnitaire:parseFloat(f.prix_unitaire)||0,seuil:parseFloat(f.seuil)||5}));setFournituresR(d);lsSet(keys.f,d);}
        if(dR?.data?.length){const d=dR.data.map(x=>({id:x.id,description:x.description,categorie:x.categorie||"",montant:parseFloat(x.montant)||0,date:x.date||"",note:x.note||""}));setDepensesR(d);lsSet(keys.d,d);}
      }catch(e){console.log("Ecole load error:",e);}
      setLoading(false);
    })();
  },[user.id]);

  const mkSave=(key,setter,toSb)=>fn=>{setter(prev=>{const n=typeof fn==="function"?fn(prev):fn;lsSet(key,n);toSb(n);return n;});};

  const setEleves=mkSave(keys.e,setElevesR,n=>n.forEach(e=>sbFetch(supabase.from("ecole_eleves").upsert({id:String(e.id),user_id:user.id,nom:e.nom,prenom:e.prenom||"",classe:e.classe||"",date_naissance:e.dateNaissance||null,nom_parent:e.nomParent||"",tel_parent:e.telParent||"",tel_parent2:e.telParent2||"",adresse:e.adresse||"",frais_total:e.fraisTotal||0,echeance:e.echeance||null,statut:e.statut||"inscrit"},{onConflict:"id"}))));
  const setPaiements=mkSave(keys.p,setPaiementsR,n=>{if(n[0])sbFetch(supabase.from("ecole_paiements").upsert({id:String(n[0].id),user_id:user.id,eleve_id:String(n[0].eleveId),montant:n[0].montant,mode:n[0].mode,note:n[0].note||"",date:n[0].date||null},{onConflict:"id"}));});
  const setPersonnel=mkSave(keys.s,setPersonnelR,n=>n.forEach(p=>sbFetch(supabase.from("ecole_personnel").upsert({id:String(p.id),user_id:user.id,nom:p.nom,prenom:p.prenom||"",poste:p.poste||"",tel:p.tel||"",email:p.email||"",salaire:p.salaire||0,date_embauche:p.dateEmbauche||null,statut:p.statut||"actif"},{onConflict:"id"}))));
  const setFournitures=mkSave(keys.f,setFournituresR,n=>n.forEach(f=>sbFetch(supabase.from("ecole_fournitures").upsert({id:String(f.id),user_id:user.id,nom:f.nom,categorie:f.categorie||"",quantite:f.quantite||0,prix_unitaire:f.prixUnitaire||0,seuil:f.seuil||5},{onConflict:"id"}))));
  const setDepenses=mkSave(keys.d,setDepensesR,n=>{if(n[0])sbFetch(supabase.from("ecole_depenses").upsert({id:String(n[0].id),user_id:user.id,description:n[0].description,categorie:n[0].categorie||"",montant:n[0].montant,date:n[0].date||null,note:n[0].note||""},{onConflict:"id"}));});
  const[onglet,setOnglet]=useState("dashboard");
  const[sidebarOpen,setSidebarOpen]=useState(false);

  const mk=(set,key)=>useCallback(fn=>{set(p=>{const n=typeof fn==="function"?fn(p):fn;lsSet(key,n);return n;});},[key]);
  const setEleves=mk(setElevesR,keys.e);
  const setPaiements=mk(setPaiementsR,keys.p);
  const setPersonnel=mk(setPersonnelR,keys.s);
  const setFournitures=mk(setFournituresR,keys.f);
  const setDepenses=mk(setDepensesR,keys.d);

  if(loading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:CE.bg,flexDirection:"column",gap:16}}><div style={{width:44,height:44,border:`4px solid ${CE.primaryLight}`,borderTopColor:CE.primary,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style><div style={{color:CE.primary,fontWeight:600,fontSize:14}}>Chargement des données école...</div></div>);

  const nav=[
    {k:"dashboard",icon:"🏠",label:"Tableau de bord"},
    {k:"eleves",icon:"🎒",label:"Élèves"},
    {k:"paiements",icon:"💰",label:"Paiements"},
    {k:"personnel",icon:"👨‍🏫",label:"Personnel"},
    {k:"fournitures",icon:"📦",label:"Fournitures"},
    {k:"depenses",icon:"💸",label:"Dépenses"},
    {k:"rapports",icon:"📊",label:"Rapports"},
  ];

  const cur=nav.find(n=>n.k===onglet);

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden",fontFamily:"system-ui,-apple-system,sans-serif",background:CE.bg}}>

      {/* SIDEBAR PC */}
      <div style={{width:220,background:CE.sidebar,color:"#FFF",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
        <div style={{padding:"20px 16px 16px"}}>
          <div style={{fontWeight:800,fontSize:17,marginBottom:2}}>🏫 VenteVoix</div>
          <div style={{fontSize:11,opacity:.6,fontWeight:600,letterSpacing:.5}}>GESTION SCOLAIRE</div>
          <div style={{fontSize:11,opacity:.5,marginTop:6}}>{user.nom}</div>
        </div>
        <div style={{padding:"0 8px",flex:1}}>
          {nav.map(n=>(
            <button key={n.k} onClick={()=>setOnglet(n.k)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"none",
                background:onglet===n.k?"rgba(255,255,255,.15)":"transparent",
                color:onglet===n.k?"#FFF":"rgba(255,255,255,.6)",
                fontWeight:onglet===n.k?700:400,fontSize:13,cursor:"pointer",
                display:"flex",alignItems:"center",gap:10,marginBottom:2,textAlign:"left"}}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>
        <div style={{padding:"12px 16px",fontSize:10,opacity:.4,borderTop:"1px solid rgba(255,255,255,.1)"}}>
          VenteVoix École v1.0
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:CE.surface,borderBottom:`1px solid ${CE.border}`,padding:"14px 24px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:17}}>{cur?.icon} {cur?.label}</div>
            <div style={{fontSize:11,color:CE.muted}}>Année scolaire {new Date().getFullYear()}-{new Date().getFullYear()+1}</div>
          </div>
          <div style={{fontSize:12,color:CE.muted}}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>

        {/* Zone de contenu scrollable */}
        <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
          {onglet==="dashboard"&&<Dashboard eleves={eleves} paiements={paiements} personnel={personnel} fournitures={fournitures} depenses={depenses} config={config} parler={parler}/>}
          {onglet==="eleves"&&<Eleves eleves={eleves} setEleves={setEleves} paiements={paiements} setPaiements={setPaiements} config={config}/>}
          {onglet==="paiements"&&<Paiements eleves={eleves} paiements={paiements} setPaiements={setPaiements}/>}
          {onglet==="personnel"&&<Personnel personnel={personnel} setPersonnel={setPersonnel}/>}
          {onglet==="fournitures"&&<Fournitures fournitures={fournitures} setFournitures={setFournitures}/>}
          {onglet==="depenses"&&<Depenses depenses={depenses} setDepenses={setDepenses}/>}
          {onglet==="rapports"&&<Rapports eleves={eleves} paiements={paiements} personnel={personnel} fournitures={fournitures} depenses={depenses}/>}
        </div>
      </div>

      {/* NAV MOBILE BAS */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:CE.surface,borderTop:`1px solid ${CE.border}`,display:"flex",zIndex:200,overflowX:"auto"}}>
        {nav.map(n=>(
          <button key={n.k} onClick={()=>setOnglet(n.k)}
            style={{flex:"0 0 auto",minWidth:60,padding:"8px 0 5px",border:"none",background:"transparent",cursor:"pointer",color:onglet===n.k?CE.primary:CE.muted,fontWeight:onglet===n.k?700:400}}>
            <div style={{fontSize:18}}>{n.icon}</div>
            <div style={{fontSize:8,marginTop:1}}>{n.label.split(" ")[0]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
