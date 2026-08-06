import { useState, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// VENTEVOIX ÉCOLE — Application complète gestion scolaire
// ══════════════════════════════════════════════════════════════════════════════

const CE = {
  bg:"#F0F4FF", surface:"#FFFFFF", primary:"#4338CA", primaryMid:"#6366F1",
  primaryLight:"#818CF8", accent:"#F59E0B", danger:"#DC2626", success:"#16A34A",
  text:"#111827", muted:"#6B7280", border:"#E5E7EB"
};

const fmt = n => new Intl.NumberFormat("fr-FR").format(n||0) + " F";
const fmtN = n => new Intl.NumberFormat("fr-FR").format(n||0);
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch{return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}

function btnE(bg, color, x={}){
  return {padding:"10px 16px",borderRadius:10,border:"none",background:bg,color,
    fontWeight:700,fontSize:13,cursor:"pointer",...x};
}

function StatEcole({label,value,sub,color}){
  return(
    <div style={{background:CE.surface,borderRadius:14,padding:"12px 14px",
      boxShadow:"0 2px 8px rgba(0,0,0,.07)",flex:1}}>
      <div style={{fontSize:10,color:CE.muted,textTransform:"uppercase",marginBottom:2}}>{label}</div>
      <div style={{fontSize:20,fontWeight:800,color:color||CE.primary}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:CE.muted,marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLEAU DE BORD ÉCOLE
// ══════════════════════════════════════════════════════════════════════════════
function DashboardEcole({eleves,paiements,config,parler}){
  const totalAttendu = eleves.reduce((s,e)=>s+(e.fraisTotal||0),0);
  const totalEncaisse = eleves.reduce((s,e)=>{
    const pays = paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    return s+pays;
  },0);
  const totalRestant = totalAttendu - totalEncaisse;
  const nRetard = eleves.filter(e=>{
    const pays = paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    return (e.fraisTotal-pays)>0 && e.echeance && new Date(e.echeance)<new Date();
  }).length;
  const nPayes = eleves.filter(e=>{
    const pays = paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    return pays>=e.fraisTotal;
  }).length;

  const genRapport = () => {
    const txt = `Bonjour ! Voici le bilan de l'école. Total inscrit : ${eleves.length} élèves. Total attendu : ${fmtN(totalAttendu)} francs. Encaissé : ${fmtN(totalEncaisse)} francs. Reste à recouvrer : ${fmtN(totalRestant)} francs. ${nRetard} élèves en retard de paiement.`;
    parler(txt);
  };

  return(
    <div style={{padding:14}}>
      <div style={{fontWeight:800,fontSize:16,color:CE.primary,marginBottom:12}}>
        🏫 Tableau de bord
      </div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <StatEcole label="Total inscrit" value={fmtN(eleves.length)} sub="élèves" color={CE.primary}/>
        <StatEcole label="Frais attendus" value={fmt(totalAttendu)} color={CE.primary}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <StatEcole label="Encaissé" value={fmt(totalEncaisse)} sub={`${nPayes} payés`} color={CE.success}/>
        <StatEcole label="À recouvrer" value={fmt(totalRestant)} sub={nRetard>0?`⚠️ ${nRetard} en retard`:""} color={totalRestant>0?CE.danger:CE.success}/>
      </div>

      {/* Barre progression globale */}
      {totalAttendu>0&&(
        <div style={{background:CE.surface,borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
            <span style={{fontWeight:600}}>Taux de recouvrement</span>
            <span style={{fontWeight:800,color:CE.primary}}>{Math.round((totalEncaisse/totalAttendu)*100)}%</span>
          </div>
          <div style={{background:"#F3F4F6",borderRadius:20,height:10}}>
            <div style={{background:`linear-gradient(90deg,${CE.success},${CE.primaryLight})`,borderRadius:20,height:10,width:Math.min(100,Math.round((totalEncaisse/totalAttendu)*100))+"%",transition:"width .5s"}}/>
          </div>
        </div>
      )}

      {/* Rapport audio */}
      <button onClick={genRapport}
        style={{...btnE(CE.primary,"#FFF"),width:"100%",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        🎙️ Rapport audio — Bilan & WhatsApp
      </button>

      {/* Élèves en retard */}
      {nRetard>0&&(
        <div style={{background:"#FEF2F2",borderRadius:12,padding:12,border:`1px solid ${CE.danger}20`}}>
          <div style={{fontWeight:700,fontSize:13,color:CE.danger,marginBottom:8}}>⚠️ Élèves en retard de paiement ({nRetard})</div>
          {eleves.filter(e=>{
            const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
            return (e.fraisTotal-pays)>0&&e.echeance&&new Date(e.echeance)<new Date();
          }).map(e=>{
            const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
            return(
              <div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${CE.border}`,fontSize:12}}>
                <div><strong>{e.nom}</strong> · {e.classe}</div>
                <div style={{color:CE.danger,fontWeight:700}}>{fmt(e.fraisTotal-pays)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GESTION ÉLÈVES
// ══════════════════════════════════════════════════════════════════════════════
function GestionEleves({eleves,setEleves,paiements,config}){
  const[showForm,setShowForm]=useState(false);
  const[editEleve,setEditEleve]=useState(null);
  const[filtre,setFiltre]=useState("tous");
  const[search,setSearch]=useState("");
  const[form,setForm]=useState({nom:"",prenom:"",classe:"",dateNaissance:"",nomParent:"",telParent:"",telParent2:"",adresse:"",fraisTotal:"",echeance:"",statut:"inscrit"});
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const ajouter=()=>{
    if(!form.nom.trim()||!form.fraisTotal) return;
    if(editEleve){
      setEleves(prev=>prev.map(e=>e.id===editEleve.id?{...e,...form,fraisTotal:parseFloat(form.fraisTotal)||0}:e));
      setEditEleve(null);
    }else{
      setEleves(prev=>[...prev,{id:Date.now(),...form,fraisTotal:parseFloat(form.fraisTotal)||0,createdAt:new Date().toISOString()}]);
    }
    setForm({nom:"",prenom:"",classe:"",dateNaissance:"",nomParent:"",telParent:"",telParent2:"",adresse:"",fraisTotal:"",echeance:"",statut:"inscrit"});
    setShowForm(false);
  };

  const supprimer=id=>{if(confirm("Supprimer cet élève et tous ses paiements ?"))setEleves(prev=>prev.filter(e=>e.id!==id));};

  const rappelWhatsApp=(e)=>{
    const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    const r=e.fraisTotal-pays;
    const msg=encodeURIComponent(`Bonjour ${e.nomParent} !\n\n📚 *Scolarité de ${e.nom} ${e.prenom||""} - ${e.classe}*\n\n💰 Frais total : *${fmtN(e.fraisTotal)} F*\n✅ Déjà payé : *${fmtN(pays)} F*\n⚠️ Reste à payer : *${fmtN(r)} F*${e.echeance?`\n📅 Échéance : ${fmtDate(e.echeance)}`:""}\n\nVeuillez régler le solde restant :\n📱 Wave : ${config?.WAVE_NUMBER||"—"}\n📱 Orange : ${config?.ORANGE_NUMBER||"—"}\n\nMerci de votre confiance 🙏`);
    window.open(`https://wa.me/${(e.telParent||"").replace(/\D/g,"")}?text=${msg}`,"_blank");
  };

  const elevesFiltres=eleves.filter(e=>{
    const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    const r=e.fraisTotal-pays;
    const retard=r>0&&e.echeance&&new Date(e.echeance)<new Date();
    if(filtre==="payes"&&r>0) return false;
    if(filtre==="impayés"&&r<=0) return false;
    if(filtre==="retard"&&!retard) return false;
    if(search&&!e.nom.toLowerCase().includes(search.toLowerCase())&&!e.classe?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return(
    <div style={{padding:14}}>
      {/* Barre recherche + ajout */}
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input placeholder="🔍 Rechercher élève ou classe..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,border:`1.5px solid ${CE.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
        <button onClick={()=>{setShowForm(!showForm);setEditEleve(null);setForm({nom:"",prenom:"",classe:"",dateNaissance:"",nomParent:"",telParent:"",telParent2:"",adresse:"",fraisTotal:"",echeance:"",statut:"inscrit"});}}
          style={btnE(CE.primary,"#FFF")}>+ Ajouter</button>
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","🗂 Tous"],["payes","✅ Payés"],["impayés","💰 Impayés"],["retard","⚠️ En retard"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltre(v)}
            style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${filtre===v?CE.primary:CE.border}`,background:filtre===v?CE.primary:"transparent",color:filtre===v?"#FFF":CE.muted,fontSize:11,fontWeight:filtre===v?700:400,cursor:"pointer"}}>{l}</button>
        ))}
        <span style={{marginLeft:"auto",fontSize:11,color:CE.muted,alignSelf:"center"}}>{elevesFiltres.length} élève(s)</span>
      </div>

      {/* Formulaire */}
      {showForm&&(
        <div style={{background:"#EEF2FF",borderRadius:14,padding:16,marginBottom:14,border:`1px solid ${CE.primaryLight}`}}>
          <div style={{fontWeight:700,fontSize:14,color:CE.primary,marginBottom:12}}>{editEleve?"✏️ Modifier élève":"➕ Nouvel élève"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Nom *","nom","text"],["Prénom","prenom","text"],["Classe *","classe","text"],["Date de naissance","dateNaissance","date"],["Nom parent/tuteur *","nomParent","text"],["Tél parent 1 *","telParent","tel"],["Tél parent 2","telParent2","tel"],["Adresse","adresse","text"],["Frais scolarité (F) *","fraisTotal","number"],["Date échéance","echeance","date"]].map(([l,k,t])=>(
              <div key={k}>
                <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>{l}</div>
                <input type={t} value={form[k]} onChange={set(k)}
                  style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>Statut</div>
              <select value={form.statut} onChange={set("statut")}
                style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,boxSizing:"border-box",outline:"none"}}>
                <option value="inscrit">✅ Inscrit</option>
                <option value="attente">⏳ En attente</option>
                <option value="radie">❌ Radié</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>{setShowForm(false);setEditEleve(null);}} style={btnE("#F3F4F6",CE.muted)}>Annuler</button>
            <button onClick={ajouter} style={btnE(CE.primary,"#FFF")}>{editEleve?"✓ Modifier":"✓ Ajouter"}</button>
          </div>
        </div>
      )}

      {/* Rappels en masse */}
      {eleves.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)<e.fraisTotal).length>0&&(
        <button onClick={()=>eleves.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)<e.fraisTotal).forEach((e,i)=>setTimeout(()=>rappelWhatsApp(e),i*1000))}
          style={{...btnE("#25D366","#FFF"),width:"100%",marginBottom:12}}>
          📲 Envoyer rappels WhatsApp à tous les impayés
        </button>
      )}

      {/* Liste élèves */}
      {elevesFiltres.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:40}}><div style={{fontSize:40}}>🎒</div>Aucun élève.</div>}
      {elevesFiltres.map(e=>{
        const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
        const r=e.fraisTotal-pays;
        const pct=Math.min(100,e.fraisTotal>0?Math.round((pays/e.fraisTotal)*100):0);
        const retard=r>0&&e.echeance&&new Date(e.echeance)<new Date();
        const sc=r<=0?CE.success:retard?CE.danger:CE.accent;
        return(
          <div key={e.id} style={{background:CE.surface,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderLeft:`4px solid ${sc}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{e.nom} {e.prenom||""}</div>
                <div style={{fontSize:11,color:CE.muted}}>{e.classe} · {e.nomParent} · {e.telParent}</div>
                {e.echeance&&<div style={{fontSize:10,color:retard?CE.danger:CE.muted}}>Échéance : {fmtDate(e.echeance)}</div>}
              </div>
              <span style={{background:sc+"20",color:sc,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>
                {r<=0?"✅ Payé":retard?"⚠️ Retard":"⏳ Attente"}
              </span>
            </div>
            <div style={{background:"#F3F4F6",borderRadius:20,height:6,marginBottom:6}}>
              <div style={{background:sc,borderRadius:20,height:6,width:pct+"%"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:CE.muted,marginBottom:8}}>
              <span>Payé : <strong style={{color:CE.success}}>{fmt(pays)}</strong></span>
              <strong>{pct}%</strong>
              <span>Reste : <strong style={{color:r>0?CE.danger:CE.success}}>{fmt(r)}</strong></span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {r>0&&<button onClick={()=>rappelWhatsApp(e)} style={{...btnE("#25D366","#FFF",{flex:1,padding:"7px"}),fontSize:11}}>📲 Rappel</button>}
              <button onClick={()=>{setEditEleve(e);setForm({nom:e.nom,prenom:e.prenom||"",classe:e.classe||"",dateNaissance:e.dateNaissance||"",nomParent:e.nomParent||"",telParent:e.telParent||"",telParent2:e.telParent2||"",adresse:e.adresse||"",fraisTotal:String(e.fraisTotal||0),echeance:e.echeance||"",statut:e.statut||"inscrit"});setShowForm(true);}} style={{...btnE("#EEF2FF",CE.primary,{padding:"7px 10px"})}}>✏️</button>
              <button onClick={()=>supprimer(e.id)} style={{...btnE("#FEF2F2",CE.danger,{padding:"7px 10px"})}}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAIEMENTS & RECOUVREMENT
// ══════════════════════════════════════════════════════════════════════════════
function GestionPaiements({eleves,paiements,setPaiements,config}){
  const[eleveId,setEleveId]=useState("");
  const[form,setForm]=useState({montant:"",mode:"cash",note:"",date:new Date().toISOString().slice(0,10)});
  const[filtreEleve,setFiltreEleve]=useState("");
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const ajouterPaiement=()=>{
    if(!eleveId||!form.montant) return;
    const p={id:Date.now(),eleveId:parseInt(eleveId),montant:parseFloat(form.montant)||0,mode:form.mode,note:form.note,date:form.date||new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()};
    setPaiements(prev=>[p,...prev]);
    setForm({montant:"",mode:"cash",note:"",date:new Date().toISOString().slice(0,10)});
    setEleveId("");
  };

  const supprimerPaiement=id=>{if(confirm("Supprimer ce paiement ?"))setPaiements(prev=>prev.filter(p=>p.id!==id));};

  const paiementsFiltres=filtreEleve?paiements.filter(p=>p.eleveId===parseInt(filtreEleve)):paiements;
  const modeIcon={cash:"💵",wave:"📱",orange:"🟠",cheque:"🏦"};

  return(
    <div style={{padding:14}}>
      {/* Enregistrer paiement */}
      <div style={{background:"#EEF2FF",borderRadius:14,padding:14,marginBottom:14,border:`1px solid ${CE.primaryLight}`}}>
        <div style={{fontWeight:700,fontSize:14,color:CE.primary,marginBottom:10}}>💰 Enregistrer un paiement</div>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>Élève *</div>
          <select value={eleveId} onChange={e=>setEleveId(e.target.value)}
            style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}>
            <option value="">-- Sélectionner un élève --</option>
            {eleves.map(e=>{
              const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
              const r=e.fraisTotal-pays;
              return <option key={e.id} value={e.id}>{e.nom} {e.prenom||""} - {e.classe} (reste: {fmtN(r)} F)</option>;
            })}
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>Montant (F) *</div>
            <input type="number" placeholder="ex: 50000" value={form.montant} onChange={set("montant")}
              style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>Date</div>
            <input type="date" value={form.date} onChange={set("date")}
              style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,color:CE.muted,marginBottom:5,fontWeight:600}}>Mode de paiement</div>
          <div style={{display:"flex",gap:6}}>
            {[["cash","💵 Cash"],["wave","📱 Wave"],["orange","🟠 Orange"],["cheque","🏦 Chèque"]].map(([v,l])=>(
              <button key={v} onClick={()=>setForm(p=>({...p,mode:v}))}
                style={{flex:1,padding:"7px",borderRadius:8,border:`1.5px solid ${form.mode===v?CE.primary:CE.border}`,background:form.mode===v?CE.primary:"transparent",color:form.mode===v?"#FFF":CE.muted,fontWeight:700,fontSize:10,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>Note (optionnel)</div>
          <input placeholder="ex: Paiement 1ère tranche" value={form.note} onChange={set("note")}
            style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
        </div>
        <button onClick={ajouterPaiement} style={btnE(CE.primary,"#FFF",{width:"100%"})}>✓ Enregistrer le paiement</button>
      </div>

      {/* Filtre par élève */}
      <div style={{marginBottom:10}}>
        <select value={filtreEleve} onChange={e=>setFiltreEleve(e.target.value)}
          style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}>
          <option value="">📋 Tous les paiements</option>
          {eleves.map(e=><option key={e.id} value={e.id}>{e.nom} {e.prenom||""} - {e.classe}</option>)}
        </select>
      </div>

      {/* Historique paiements */}
      <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>Historique ({paiementsFiltres.length})</div>
      {paiementsFiltres.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:30}}>Aucun paiement.</div>}
      {paiementsFiltres.map(p=>{
        const eleve=eleves.find(e=>e.id===p.eleveId);
        return(
          <div key={p.id} style={{background:CE.surface,borderRadius:10,padding:"10px 14px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:CE.success}}>+{fmt(p.montant)}</div>
              <div style={{fontSize:11,color:CE.muted}}>{eleve?`${eleve.nom} ${eleve.prenom||""} - ${eleve.classe}`:"Élève supprimé"}</div>
              <div style={{fontSize:10,color:CE.muted}}>{modeIcon[p.mode]||"💵"} {p.mode} · {fmtDate(p.date)} {p.note?`· ${p.note}`:""}</div>
            </div>
            <button onClick={()=>supprimerPaiement(p.id)} style={{background:"none",border:"none",color:CE.muted,cursor:"pointer",fontSize:16}}>🗑</button>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE ÉCOLE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function ModuleEcole({user,config,parler}){
  const KEY_ELEVES = "vv_ecole_eleves_"+user.id;
  const KEY_PAIE = "vv_ecole_paiements_"+user.id;

  const[onglet,setOnglet]=useState("dashboard");
  const[eleves,setElevesRaw]=useState(()=>lsGet(KEY_ELEVES)||[]);
  const[paiements,setPaiementsRaw]=useState(()=>lsGet(KEY_PAIE)||[]);

  const setEleves=useCallback(fn=>{
    setElevesRaw(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      lsSet(KEY_ELEVES,next);
      return next;
    });
  },[KEY_ELEVES]);

  const setPaiements=useCallback(fn=>{
    setPaiementsRaw(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      lsSet(KEY_PAIE,next);
      return next;
    });
  },[KEY_PAIE]);

  const onglets=[
    ["dashboard","🏠","Accueil"],
    ["eleves","🎒","Élèves"],
    ["paiements","💰","Paiements"],
  ];

  return(
    <div style={{background:CE.bg,minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${CE.primary},${CE.primaryMid})`,padding:"14px 16px",color:"#FFF"}}>
        <div style={{fontWeight:800,fontSize:18}}>🏫 VenteVoix École</div>
        <div style={{fontSize:12,opacity:.7,marginTop:2}}>{user.nom} · Gestion scolaire</div>
      </div>

      {/* Contenu */}
      <div style={{paddingBottom:80}}>
        {onglet==="dashboard"&&<DashboardEcole eleves={eleves} paiements={paiements} config={config} parler={parler||((t)=>{const u=new SpeechSynthesisUtterance(t);u.lang="fr-FR";window.speechSynthesis.speak(u);})}/>}
        {onglet==="eleves"&&<GestionEleves eleves={eleves} setEleves={setEleves} paiements={paiements} config={config}/>}
        {onglet==="paiements"&&<GestionPaiements eleves={eleves} paiements={paiements} setPaiements={setPaiements} config={config}/>}
      </div>

      {/* Navigation bottom */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:CE.surface,borderTop:`1px solid ${CE.border}`,display:"flex",zIndex:100}}>
        {onglets.map(([k,icon,label])=>(
          <button key={k} onClick={()=>setOnglet(k)}
            style={{flex:1,padding:"10px 0 6px",border:"none",background:"transparent",cursor:"pointer",color:onglet===k?CE.primary:CE.muted,fontWeight:onglet===k?700:400}}>
            <div style={{fontSize:20}}>{icon}</div>
            <div style={{fontSize:9}}>{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
