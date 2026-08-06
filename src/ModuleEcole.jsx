import { useState, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// VENTEVOIX ÉCOLE — Application complète gestion scolaire
// Isolation totale du module Commerce
// ══════════════════════════════════════════════════════════════════════════════

const CE = {
  bg:"#F0F4FF",surface:"#FFFFFF",primary:"#4338CA",primaryMid:"#6366F1",
  primaryLight:"#818CF8",accent:"#F59E0B",danger:"#DC2626",success:"#16A34A",
  warning:"#D97706",text:"#111827",muted:"#6B7280",border:"#E5E7EB",
  purple:"#7C3AED"
};

const fmt = n => new Intl.NumberFormat("fr-FR").format(n||0)+" F";
const fmtN = n => new Intl.NumberFormat("fr-FR").format(n||0);
const fmtDate = d => d?new Date(d).toLocaleDateString("fr-FR"):"—";
const today = () => new Date().toISOString().slice(0,10);

function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch{return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}

function Btn({onClick,bg,color,children,full,sm}){
  return <button onClick={onClick} style={{padding:sm?"6px 12px":"9px 16px",borderRadius:10,border:"none",
    background:bg,color,fontWeight:700,fontSize:sm?11:13,cursor:"pointer",
    width:full?"100%":undefined,display:"inline-flex",alignItems:"center",
    justifyContent:"center",gap:6}}>{children}</button>;
}

function Card({children,style={}}){
  return <div style={{background:CE.surface,borderRadius:14,padding:16,
    boxShadow:"0 2px 8px rgba(0,0,0,.07)",...style}}>{children}</div>;
}

function StatCard({label,value,sub,color,icon}){
  return(
    <div style={{background:CE.surface,borderRadius:14,padding:"14px 16px",
      boxShadow:"0 2px 8px rgba(0,0,0,.07)",borderLeft:`4px solid ${color||CE.primary}`}}>
      {icon&&<div style={{fontSize:22,marginBottom:4}}>{icon}</div>}
      <div style={{fontSize:10,color:CE.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color:color||CE.primary}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:CE.muted,marginTop:3}}>{sub}</div>}
    </div>
  );
}

function Inp({label,k,type="text",ph,val,onChange,req}){
  return(
    <div>
      <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>{label}{req&&" *"}</div>
      <input type={type} placeholder={ph} value={val||""} onChange={e=>onChange(k,e.target.value)}
        style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,
          padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
    </div>
  );
}

function Sel({label,k,options,val,onChange}){
  return(
    <div>
      <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>{label}</div>
      <select value={val||""} onChange={e=>onChange(k,e.target.value)}
        style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,
          padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none",background:"#FFF"}}>
        {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TABLEAU DE BORD
// ══════════════════════════════════════════════════════════════════════
function Dashboard({eleves,paiements,personnel,fournitures,config,parler}){
  const totalFrais = eleves.reduce((s,e)=>s+(e.fraisTotal||0),0);
  const totalEncaisse = eleves.reduce((s,e)=>{
    return s+paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
  },0);
  const totalRestant = totalFrais-totalEncaisse;
  const nRetard = eleves.filter(e=>{
    const p=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    return (e.fraisTotal-p)>0&&e.echeance&&new Date(e.echeance)<new Date();
  }).length;
  const masseSalariale = personnel.reduce((s,p)=>s+(p.salaire||0),0);
  const valFournitures = fournitures.reduce((s,f)=>s+(f.quantite||0)*(f.prixUnitaire||0),0);

  const rapport = () => {
    const txt = `Bonjour. Voici le bilan de l'école. ${eleves.length} élèves inscrits. Frais attendus : ${fmtN(totalFrais)} francs. Encaissé : ${fmtN(totalEncaisse)} francs. Reste à recouvrer : ${fmtN(totalRestant)} francs. ${nRetard>0?`${nRetard} élèves en retard de paiement.`:""} Masse salariale mensuelle : ${fmtN(masseSalariale)} francs. Valeur des fournitures en stock : ${fmtN(valFournitures)} francs.`;
    parler(txt);
    const msg = encodeURIComponent(`📊 *Bilan VenteVoix École*\n\n👥 Élèves : ${eleves.length}\n💰 Frais attendus : ${fmt(totalFrais)}\n✅ Encaissé : ${fmt(totalEncaisse)}\n⚠️ Reste : ${fmt(totalRestant)}\n${nRetard>0?`🔴 ${nRetard} en retard\n`:""}\n📅 ${new Date().toLocaleDateString("fr-FR")}`);
    setTimeout(()=>window.open(`https://wa.me/${(config?.WHATSAPP_NUMBER||"").replace(/\D/g,"")}?text=${msg}`,"_blank"),1500);
  };

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
        <StatCard icon="👥" label="Élèves inscrits" value={fmtN(eleves.length)} color={CE.primary}/>
        <StatCard icon="💰" label="Frais attendus" value={fmt(totalFrais)} color={CE.primary}/>
        <StatCard icon="✅" label="Encaissé" value={fmt(totalEncaisse)} sub={`${eleves.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)>=(e.fraisTotal||0)).length} élèves à jour`} color={CE.success}/>
        <StatCard icon="⏳" label="À recouvrer" value={fmt(totalRestant)} sub={nRetard>0?`⚠️ ${nRetard} en retard`:"✅ Aucun retard"} color={totalRestant>0?CE.danger:CE.success}/>
        <StatCard icon="👨‍🏫" label="Personnel" value={fmtN(personnel.length)} sub={`Masse : ${fmt(masseSalariale)}/mois`} color={CE.purple}/>
        <StatCard icon="📦" label="Fournitures" value={fmt(valFournitures)} sub={`${fournitures.length} articles`} color={CE.accent}/>
      </div>

      {/* Barre progression recouvrement */}
      {totalFrais>0&&(
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontWeight:700,fontSize:13}}>Taux de recouvrement global</span>
            <span style={{fontWeight:800,color:CE.primary,fontSize:15}}>{Math.round((totalEncaisse/totalFrais)*100)}%</span>
          </div>
          <div style={{background:"#F3F4F6",borderRadius:20,height:12}}>
            <div style={{background:`linear-gradient(90deg,${CE.success},${CE.primaryLight})`,borderRadius:20,height:12,width:Math.min(100,Math.round((totalEncaisse/totalFrais)*100))+"%",transition:"width .5s"}}/>
          </div>
        </Card>
      )}

      <Btn onClick={rapport} bg={CE.primary} color="#FFF" full>🎙️ Rapport audio & WhatsApp</Btn>

      {/* Alertes retards */}
      {nRetard>0&&(
        <Card style={{marginTop:14,borderLeft:`4px solid ${CE.danger}`}}>
          <div style={{fontWeight:700,color:CE.danger,marginBottom:8}}>⚠️ {nRetard} élève(s) en retard de paiement</div>
          {eleves.filter(e=>{
            const p=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
            return (e.fraisTotal-p)>0&&e.echeance&&new Date(e.echeance)<new Date();
          }).slice(0,5).map(e=>{
            const p=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
            return(
              <div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${CE.border}`,fontSize:12}}>
                <span><b>{e.nom} {e.prenom||""}</b> · {e.classe}</span>
                <span style={{color:CE.danger,fontWeight:700}}>{fmt(e.fraisTotal-p)}</span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// GESTION ÉLÈVES
// ══════════════════════════════════════════════════════════════════════
function Eleves({eleves,setEleves,paiements,setPaiements,config}){
  const[showForm,setShowForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const[filtre,setFiltre]=useState("tous");
  const[search,setSearch]=useState("");
  const initForm={nom:"",prenom:"",classe:"",dateNaissance:"",nomParent:"",telParent:"",telParent2:"",adresse:"",fraisTotal:"",echeance:"",statut:"inscrit"};
  const[form,setForm]=useState(initForm);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const save=()=>{
    if(!form.nom.trim()||!form.fraisTotal) return;
    if(editId){
      setEleves(prev=>prev.map(e=>e.id===editId?{...e,...form,fraisTotal:parseFloat(form.fraisTotal)||0}:e));
      setEditId(null);
    }else{
      setEleves(prev=>[...prev,{id:Date.now(),...form,fraisTotal:parseFloat(form.fraisTotal)||0,createdAt:new Date().toISOString()}]);
    }
    setForm(initForm);setShowForm(false);
  };

  const del=id=>{
    if(!confirm("Supprimer cet élève et ses paiements ?")) return;
    setEleves(prev=>prev.filter(e=>e.id!==id));
    setPaiements(prev=>prev.filter(p=>p.eleveId!==id));
  };

  const rappel=(e)=>{
    const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    const r=e.fraisTotal-pays;
    const msg=encodeURIComponent(`Bonjour ${e.nomParent} !\n\n📚 *Scolarité de ${e.nom} ${e.prenom||""} — ${e.classe}*\n\n💰 Frais total : *${fmt(e.fraisTotal)}*\n✅ Payé : *${fmt(pays)}*\n⚠️ Reste : *${fmt(r)}*${e.echeance?`\n📅 Échéance : ${fmtDate(e.echeance)}`:""}\n\nMerci de régler le solde :\n📱 Wave : ${config?.WAVE_NUMBER||"—"}\n📱 Orange : ${config?.ORANGE_NUMBER||"—"}\n\nMerci 🙏`);
    window.open(`https://wa.me/${(e.telParent||"").replace(/\D/g,"")}?text=${msg}`,"_blank");
  };

  const filtres=eleves.filter(e=>{
    const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
    const r=e.fraisTotal-pays;
    const retard=r>0&&e.echeance&&new Date(e.echeance)<new Date();
    if(filtre==="payes"&&r>0) return false;
    if(filtre==="impayés"&&r<=0) return false;
    if(filtre==="retard"&&!retard) return false;
    if(search&&!`${e.nom} ${e.prenom} ${e.classe}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return(
    <div>
      {/* Toolbar */}
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input placeholder="🔍 Nom, prénom ou classe..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,border:`1.5px solid ${CE.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
        <Btn onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(initForm);}} bg={CE.primary} color="#FFF">+ Ajouter</Btn>
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        {[["tous","🗂 Tous"],["payes","✅ Payés"],["impayés","💰 Impayés"],["retard","⚠️ Retard"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltre(v)}
            style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${filtre===v?CE.primary:CE.border}`,background:filtre===v?CE.primary:"transparent",color:filtre===v?"#FFF":CE.muted,fontSize:11,fontWeight:filtre===v?700:400,cursor:"pointer"}}>{l}</button>
        ))}
        <span style={{marginLeft:"auto",fontSize:11,color:CE.muted}}>{filtres.length} / {eleves.length} élève(s)</span>
      </div>

      {/* Formulaire */}
      {showForm&&(
        <Card style={{marginBottom:14,background:"#EEF2FF",border:`1px solid ${CE.primaryLight}`}}>
          <div style={{fontWeight:700,fontSize:14,color:CE.primary,marginBottom:12}}>{editId?"✏️ Modifier":"➕ Nouvel élève"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
            <Inp label="Nom" k="nom" val={form.nom} onChange={setF} req/>
            <Inp label="Prénom" k="prenom" val={form.prenom} onChange={setF}/>
            <Inp label="Classe" k="classe" val={form.classe} onChange={setF} req ph="ex: CE2, 3ème..."/>
            <Inp label="Date de naissance" k="dateNaissance" type="date" val={form.dateNaissance} onChange={setF}/>
            <Inp label="Nom parent/tuteur" k="nomParent" val={form.nomParent} onChange={setF} req/>
            <Inp label="Tél parent 1" k="telParent" type="tel" val={form.telParent} onChange={setF} req ph="+225 07 XX XX XX"/>
            <Inp label="Tél parent 2" k="telParent2" type="tel" val={form.telParent2} onChange={setF}/>
            <Inp label="Adresse" k="adresse" val={form.adresse} onChange={setF}/>
            <Inp label="Frais de scolarité (F)" k="fraisTotal" type="number" val={form.fraisTotal} onChange={setF} req ph="ex: 150000"/>
            <Inp label="Échéance paiement" k="echeance" type="date" val={form.echeance} onChange={setF}/>
            <Sel label="Statut" k="statut" val={form.statut} onChange={setF} options={[["inscrit","✅ Inscrit"],["attente","⏳ En attente"],["radie","❌ Radié"]]}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={()=>{setShowForm(false);setEditId(null);}} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.primary} color="#FFF">{editId?"✓ Modifier":"✓ Ajouter"}</Btn>
          </div>
        </Card>
      )}

      {/* Rappels masse */}
      {filtres.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)<e.fraisTotal).length>0&&(
        <Btn onClick={()=>filtres.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)<e.fraisTotal).forEach((e,i)=>setTimeout(()=>rappel(e),i*1000))} bg="#25D366" color="#FFF" full>
          📲 Rappels WhatsApp — tous les impayés
        </Btn>
      )}

      {/* Liste */}
      <div style={{marginTop:10}}>
        {filtres.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:40,fontSize:14}}>🎒 Aucun élève.</div>}
        {filtres.map(e=>{
          const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
          const r=e.fraisTotal-pays;
          const pct=e.fraisTotal>0?Math.min(100,Math.round((pays/e.fraisTotal)*100)):0;
          const retard=r>0&&e.echeance&&new Date(e.echeance)<new Date();
          const sc=r<=0?CE.success:retard?CE.danger:CE.accent;
          return(
            <Card key={e.id} style={{marginBottom:8,borderLeft:`4px solid ${sc}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{e.nom} {e.prenom||""}</div>
                  <div style={{fontSize:12,color:CE.muted}}>{e.classe} · {e.nomParent} · {e.telParent}</div>
                  {e.adresse&&<div style={{fontSize:11,color:CE.muted}}>📍 {e.adresse}</div>}
                  {e.echeance&&<div style={{fontSize:11,color:retard?CE.danger:CE.muted}}>📅 Échéance : {fmtDate(e.echeance)}</div>}
                </div>
                <span style={{background:sc+"15",color:sc,fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap"}}>
                  {r<=0?"✅ Payé":retard?"⚠️ Retard":"⏳ Attente"}
                </span>
              </div>
              <div style={{background:"#F3F4F6",borderRadius:20,height:8,marginBottom:6}}>
                <div style={{background:sc,borderRadius:20,height:8,width:pct+"%"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:CE.muted,marginBottom:10}}>
                <span>Payé : <b style={{color:CE.success}}>{fmt(pays)}</b></span>
                <b>{pct}%</b>
                <span>Reste : <b style={{color:r>0?CE.danger:CE.success}}>{fmt(r)}</b></span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {r>0&&<Btn onClick={()=>rappel(e)} bg="#25D366" color="#FFF" sm>📲 Rappel</Btn>}
                <Btn onClick={()=>{setEditId(e.id);setForm({nom:e.nom,prenom:e.prenom||"",classe:e.classe||"",dateNaissance:e.dateNaissance||"",nomParent:e.nomParent||"",telParent:e.telParent||"",telParent2:e.telParent2||"",adresse:e.adresse||"",fraisTotal:String(e.fraisTotal||0),echeance:e.echeance||"",statut:e.statut||"inscrit"});setShowForm(true);}} bg="#EEF2FF" color={CE.primary} sm>✏️ Modifier</Btn>
                <Btn onClick={()=>del(e.id)} bg="#FEF2F2" color={CE.danger} sm>🗑 Supprimer</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PAIEMENTS
// ══════════════════════════════════════════════════════════════════════
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
  const modeIcon={cash:"💵",wave:"📱 Wave",orange:"🟠 Orange",cheque:"🏦 Chèque"};
  const pFiltres=filtreE?paiements.filter(p=>p.eleveId===Number(filtreE)):paiements;
  const totalPeriode=pFiltres.reduce((s,p)=>s+p.montant,0);

  return(
    <div>
      <Card style={{marginBottom:14,background:"#EEF2FF",border:`1px solid ${CE.primaryLight}`}}>
        <div style={{fontWeight:700,fontSize:14,color:CE.primary,marginBottom:12}}>💰 Enregistrer un paiement</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:CE.muted,marginBottom:3,fontWeight:600}}>Élève *</div>
            <select value={eleveId} onChange={e=>setEleveId(e.target.value)}
              style={{width:"100%",border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none",background:"#FFF"}}>
              <option value="">-- Choisir un élève --</option>
              {eleves.map(e=>{
                const pays=paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0);
                return <option key={e.id} value={e.id}>{e.nom} {e.prenom||""} · {e.classe} (reste: {fmtN(e.fraisTotal-pays)} F)</option>;
              })}
            </select>
          </div>
          <Inp label="Montant (F)" k="montant" type="number" val={form.montant} onChange={setF} req ph="ex: 50000"/>
          <Inp label="Date" k="date" type="date" val={form.date} onChange={setF}/>
          <Inp label="Note" k="note" val={form.note} onChange={setF} ph="ex: 1ère tranche"/>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:CE.muted,marginBottom:5,fontWeight:600}}>Mode de paiement</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["cash","💵 Cash"],["wave","📱 Wave"],["orange","🟠 Orange"],["cheque","🏦 Chèque"]].map(([v,l])=>(
              <button key={v} onClick={()=>setF("mode",v)}
                style={{padding:"7px 14px",borderRadius:8,border:`1.5px solid ${form.mode===v?CE.primary:CE.border}`,background:form.mode===v?CE.primary:"transparent",color:form.mode===v?"#FFF":CE.muted,fontWeight:700,fontSize:12,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
        </div>
        <Btn onClick={ajouter} bg={CE.primary} color="#FFF" full>✓ Enregistrer</Btn>
      </Card>

      {/* Filtre + total */}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
        <select value={filtreE} onChange={e=>setFiltreE(e.target.value)}
          style={{flex:1,border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}>
          <option value="">📋 Tous les paiements</option>
          {eleves.map(e=><option key={e.id} value={e.id}>{e.nom} {e.prenom||""} · {e.classe}</option>)}
        </select>
        <div style={{background:CE.success+"15",color:CE.success,fontWeight:700,fontSize:13,padding:"8px 14px",borderRadius:8,whiteSpace:"nowrap"}}>{fmt(totalPeriode)}</div>
      </div>

      {pFiltres.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:30}}>Aucun paiement.</div>}
      {pFiltres.map(p=>{
        const e=eleves.find(x=>x.id===p.eleveId);
        return(
          <div key={p.id} style={{background:CE.surface,borderRadius:10,padding:"10px 14px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:700,color:CE.success,fontSize:14}}>+{fmt(p.montant)}</div>
              <div style={{fontSize:12,color:CE.text}}>{e?`${e.nom} ${e.prenom||""} — ${e.classe}`:"Élève supprimé"}</div>
              <div style={{fontSize:11,color:CE.muted}}>{modeIcon[p.mode]||"💵"} · {fmtDate(p.date)}{p.note?` · ${p.note}`:""}</div>
            </div>
            <Btn onClick={()=>del(p.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PERSONNEL
// ══════════════════════════════════════════════════════════════════════
function Personnel({personnel,setPersonnel}){
  const[showForm,setShowForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const initF={nom:"",prenom:"",poste:"",tel:"",email:"",salaire:"",dateEmbauche:"",statut:"actif"};
  const[form,setForm]=useState(initF);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const save=()=>{
    if(!form.nom.trim()||!form.poste) return;
    if(editId){
      setPersonnel(prev=>prev.map(p=>p.id===editId?{...p,...form,salaire:parseFloat(form.salaire)||0}:p));
      setEditId(null);
    }else{
      setPersonnel(prev=>[...prev,{id:Date.now(),...form,salaire:parseFloat(form.salaire)||0,createdAt:new Date().toISOString()}]);
    }
    setForm(initF);setShowForm(false);
  };

  const del=id=>{if(confirm("Supprimer ?"))setPersonnel(prev=>prev.filter(p=>p.id!==id));};
  const masseSalariale=personnel.filter(p=>p.statut==="actif").reduce((s,p)=>s+(p.salaire||0),0);

  return(
    <div>
      <Card style={{marginBottom:14,background:"#F5F3FF",border:`1px solid ${CE.purple}30`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:CE.muted}}>Masse salariale mensuelle</div>
            <div style={{fontSize:22,fontWeight:800,color:CE.purple}}>{fmt(masseSalariale)}</div>
            <div style={{fontSize:11,color:CE.muted}}>{personnel.filter(p=>p.statut==="actif").length} actifs / {personnel.length} total</div>
          </div>
          <Btn onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(initF);}} bg={CE.purple} color="#FFF">+ Ajouter</Btn>
        </div>
      </Card>

      {showForm&&(
        <Card style={{marginBottom:14,background:"#F5F3FF",border:`1px solid ${CE.purple}30`}}>
          <div style={{fontWeight:700,fontSize:14,color:CE.purple,marginBottom:12}}>{editId?"✏️ Modifier":"➕ Nouveau membre"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
            <Inp label="Nom" k="nom" val={form.nom} onChange={setF} req/>
            <Inp label="Prénom" k="prenom" val={form.prenom} onChange={setF}/>
            <Inp label="Poste" k="poste" val={form.poste} onChange={setF} req ph="ex: Enseignant CE2"/>
            <Inp label="Téléphone" k="tel" type="tel" val={form.tel} onChange={setF}/>
            <Inp label="Email" k="email" type="email" val={form.email} onChange={setF}/>
            <Inp label="Salaire mensuel (F)" k="salaire" type="number" val={form.salaire} onChange={setF} ph="ex: 150000"/>
            <Inp label="Date embauche" k="dateEmbauche" type="date" val={form.dateEmbauche} onChange={setF}/>
            <Sel label="Statut" k="statut" val={form.statut} onChange={setF} options={[["actif","✅ Actif"],["conge","🏖️ Congé"],["suspendu","⛔ Suspendu"]]}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={()=>{setShowForm(false);setEditId(null);}} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.purple} color="#FFF">{editId?"✓ Modifier":"✓ Ajouter"}</Btn>
          </div>
        </Card>
      )}

      {personnel.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:40}}>👨‍🏫 Aucun membre du personnel.</div>}
      {personnel.map(p=>(
        <Card key={p.id} style={{marginBottom:8,borderLeft:`4px solid ${p.statut==="actif"?CE.purple:CE.muted}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{p.nom} {p.prenom||""}</div>
              <div style={{fontSize:12,color:CE.muted}}>{p.poste}</div>
              <div style={{fontSize:11,color:CE.muted}}>{p.tel}{p.email?` · ${p.email}`:""}</div>
              {p.dateEmbauche&&<div style={{fontSize:11,color:CE.muted}}>Embauché : {fmtDate(p.dateEmbauche)}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:800,fontSize:16,color:CE.purple}}>{fmt(p.salaire)}<span style={{fontSize:10,fontWeight:400}}>/mois</span></div>
              <span style={{background:p.statut==="actif"?CE.purple+"15":CE.muted+"15",color:p.statut==="actif"?CE.purple:CE.muted,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>
                {p.statut==="actif"?"✅ Actif":p.statut==="conge"?"🏖️ Congé":"⛔ Suspendu"}
              </span>
            </div>
          </div>
          <div style={{display:"flex",gap:6,marginTop:10}}>
            <Btn onClick={()=>{setEditId(p.id);setForm({nom:p.nom,prenom:p.prenom||"",poste:p.poste||"",tel:p.tel||"",email:p.email||"",salaire:String(p.salaire||0),dateEmbauche:p.dateEmbauche||"",statut:p.statut||"actif"});setShowForm(true);}} bg="#F5F3FF" color={CE.purple} sm>✏️ Modifier</Btn>
            <Btn onClick={()=>del(p.id)} bg="#FEF2F2" color={CE.danger} sm>🗑 Supprimer</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// FOURNITURES (STOCK ÉCOLE)
// ══════════════════════════════════════════════════════════════════════
function Fournitures({fournitures,setFournitures}){
  const[showForm,setShowForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const initF={nom:"",categorie:"Livres",quantite:"",prixUnitaire:"",seuil:"5"};
  const[form,setForm]=useState(initF);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const save=()=>{
    if(!form.nom.trim()) return;
    if(editId){
      setFournitures(prev=>prev.map(f=>f.id===editId?{...f,...form,quantite:parseFloat(form.quantite)||0,prixUnitaire:parseFloat(form.prixUnitaire)||0,seuil:parseFloat(form.seuil)||5}:f));
      setEditId(null);
    }else{
      setFournitures(prev=>[...prev,{id:Date.now(),...form,quantite:parseFloat(form.quantite)||0,prixUnitaire:parseFloat(form.prixUnitaire)||0,seuil:parseFloat(form.seuil)||5}]);
    }
    setForm(initF);setShowForm(false);
  };

  const del=id=>{if(confirm("Supprimer ?"))setFournitures(prev=>prev.filter(f=>f.id!==id));};
  const ajuster=(id,delta)=>setFournitures(prev=>prev.map(f=>f.id===id?{...f,quantite:Math.max(0,(f.quantite||0)+delta)}:f));
  const valTotal=fournitures.reduce((s,f)=>s+(f.quantite||0)*(f.prixUnitaire||0),0);
  const nAlerte=fournitures.filter(f=>(f.quantite||0)<=(f.seuil||5)).length;

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"stretch"}}>
        <StatCard label="Articles en stock" value={fmtN(fournitures.length)} color={CE.accent}/>
        <StatCard label="Valeur totale" value={fmt(valTotal)} color={CE.accent}/>
        {nAlerte>0&&<StatCard label="Stock faible" value={fmtN(nAlerte)} sub="articles" color={CE.danger}/>}
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <Btn onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(initF);}} bg={CE.accent} color="#FFF">+ Ajouter article</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:14,background:"#FFFBEB",border:`1px solid ${CE.accent}30`}}>
          <div style={{fontWeight:700,fontSize:14,color:CE.accent,marginBottom:12}}>{editId?"✏️ Modifier":"➕ Nouvel article"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
            <Inp label="Nom article" k="nom" val={form.nom} onChange={setF} req ph="ex: Cahier 100 pages"/>
            <Sel label="Catégorie" k="categorie" val={form.categorie} onChange={setF} options={[["Livres","📚 Livres"],["Cahiers","📓 Cahiers"],["Uniformes","👕 Uniformes"],["Matériel","✏️ Matériel"],["Autre","📦 Autre"]]}/>
            <Inp label="Quantité" k="quantite" type="number" val={form.quantite} onChange={setF}/>
            <Inp label="Prix unitaire (F)" k="prixUnitaire" type="number" val={form.prixUnitaire} onChange={setF}/>
            <Inp label="Seuil alerte" k="seuil" type="number" val={form.seuil} onChange={setF}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={()=>{setShowForm(false);setEditId(null);}} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.accent} color="#FFF">{editId?"✓ Modifier":"✓ Ajouter"}</Btn>
          </div>
        </Card>
      )}

      {fournitures.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:40}}>📦 Aucune fourniture.</div>}
      {fournitures.map(f=>{
        const alerte=(f.quantite||0)<=(f.seuil||5);
        return(
          <Card key={f.id} style={{marginBottom:8,borderLeft:`4px solid ${alerte?CE.danger:CE.accent}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{f.nom}</div>
                <div style={{fontSize:11,color:CE.muted}}>{f.categorie} · Prix : {fmt(f.prixUnitaire)} · Valeur : {fmt((f.quantite||0)*(f.prixUnitaire||0))}</div>
                {alerte&&<div style={{fontSize:11,color:CE.danger,fontWeight:600}}>⚠️ Stock faible (seuil : {f.seuil})</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>ajuster(f.id,-1)} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${CE.border}`,background:"#FFF",cursor:"pointer",fontSize:16,fontWeight:700}}>−</button>
                <span style={{fontWeight:800,fontSize:18,minWidth:30,textAlign:"center",color:alerte?CE.danger:CE.text}}>{f.quantite||0}</span>
                <button onClick={()=>ajuster(f.id,1)} style={{width:32,height:32,borderRadius:"50%",border:"none",background:CE.accent,color:"#FFF",cursor:"pointer",fontSize:16,fontWeight:700}}>+</button>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginTop:8}}>
              <Btn onClick={()=>{setEditId(f.id);setForm({nom:f.nom,categorie:f.categorie||"Livres",quantite:String(f.quantite||0),prixUnitaire:String(f.prixUnitaire||0),seuil:String(f.seuil||5)});setShowForm(true);}} bg="#FFFBEB" color={CE.accent} sm>✏️</Btn>
              <Btn onClick={()=>del(f.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// RAPPORTS
// ══════════════════════════════════════════════════════════════════════
function Rapports({eleves,paiements,personnel,fournitures}){
  const classes=[...new Set(eleves.map(e=>e.classe).filter(Boolean))].sort();

  const statsClasse=(classe)=>{
    const es=eleves.filter(e=>e.classe===classe);
    const totalF=es.reduce((s,e)=>s+(e.fraisTotal||0),0);
    const totalP=es.reduce((s,e)=>s+paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0),0);
    const nP=es.filter(e=>paiements.filter(p=>p.eleveId===e.id).reduce((s,p)=>s+p.montant,0)>=(e.fraisTotal||0)).length;
    return{n:es.length,totalF,totalP,restant:totalF-totalP,nP};
  };

  return(
    <div>
      <div style={{fontWeight:700,fontSize:15,color:CE.primary,marginBottom:12}}>📊 Rapport par classe</div>
      {classes.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:30}}>Aucune classe à afficher.</div>}
      {classes.map(cl=>{
        const s=statsClasse(cl);
        const pct=s.totalF>0?Math.min(100,Math.round((s.totalP/s.totalF)*100)):0;
        return(
          <Card key={cl} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:16}}>{cl}</div>
              <span style={{background:CE.primary+"15",color:CE.primary,fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{s.n} élève(s)</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:CE.muted}}>Attendu</div>
                <div style={{fontWeight:700,color:CE.primary}}>{fmt(s.totalF)}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:CE.muted}}>Encaissé</div>
                <div style={{fontWeight:700,color:CE.success}}>{fmt(s.totalP)}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:CE.muted}}>Reste</div>
                <div style={{fontWeight:700,color:s.restant>0?CE.danger:CE.success}}>{fmt(s.restant)}</div>
              </div>
            </div>
            <div style={{background:"#F3F4F6",borderRadius:20,height:8,marginBottom:4}}>
              <div style={{background:pct>=100?CE.success:CE.primary,borderRadius:20,height:8,width:pct+"%"}}/>
            </div>
            <div style={{fontSize:11,color:CE.muted,textAlign:"right"}}>{pct}% · {s.nP}/{s.n} élèves à jour</div>
          </Card>
        );
      })}

      {/* Bilan général */}
      <Card style={{marginTop:14,background:"#EEF2FF",border:`1px solid ${CE.primaryLight}`}}>
        <div style={{fontWeight:700,fontSize:14,color:CE.primary,marginBottom:10}}>📋 Bilan général</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div><span style={{fontSize:12,color:CE.muted}}>Total élèves :</span><span style={{fontWeight:700,marginLeft:8}}>{eleves.length}</span></div>
          <div><span style={{fontSize:12,color:CE.muted}}>Total classes :</span><span style={{fontWeight:700,marginLeft:8}}>{classes.length}</span></div>
          <div><span style={{fontSize:12,color:CE.muted}}>Total personnel :</span><span style={{fontWeight:700,marginLeft:8}}>{personnel.length}</span></div>
          <div><span style={{fontSize:12,color:CE.muted}}>Masse salariale :</span><span style={{fontWeight:700,marginLeft:8}}>{fmt(personnel.reduce((s,p)=>s+(p.salaire||0),0))}</span></div>
          <div><span style={{fontSize:12,color:CE.muted}}>Total frais attendus :</span><span style={{fontWeight:700,marginLeft:8}}>{fmt(eleves.reduce((s,e)=>s+(e.fraisTotal||0),0))}</span></div>
          <div><span style={{fontSize:12,color:CE.muted}}>Total encaissé :</span><span style={{fontWeight:700,color:CE.success,marginLeft:8}}>{fmt(paiements.reduce((s,p)=>s+p.montant,0))}</span></div>
        </div>
      </Card>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════
// DÉPENSES ÉCOLE
// ══════════════════════════════════════════════════════════════════════
function Depenses({depenses,setDepenses}){
  const[showForm,setShowForm]=useState(false);
  const initF={description:"",categorie:"Electricite",montant:"",date:today(),note:""};
  const[form,setForm]=useState(initF);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const[filtreMois,setFiltreMois]=useState("");

  const save=()=>{
    if(!form.description.trim()||!form.montant) return;
    setDepenses(prev=>[{id:Date.now(),...form,montant:parseFloat(form.montant)||0,createdAt:new Date().toISOString()},...prev]);
    setForm(initF);setShowForm(false);
  };

  const del=id=>{if(confirm("Supprimer ?"))setDepenses(prev=>prev.filter(d=>d.id!==id));};

  const mois=[...new Set(depenses.map(d=>d.date?.slice(0,7)))].sort().reverse();
  const depFiltres=filtreMois?depenses.filter(d=>d.date?.startsWith(filtreMois)):depenses;
  const totalPeriode=depFiltres.reduce((s,d)=>s+d.montant,0);

  const catIcon={Electricite:"💡",Eau:"💧",Loyer:"🏠",Salaires:"👨‍🏫",Entretien:"🔧",Transport:"🚗",Materiel:"📚",Administration:"📋",Autre:"📦"};

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <StatCard label="Total dépenses" value={fmt(depenses.reduce((s,d)=>s+d.montant,0))} color={CE.danger}/>
        <StatCard label="Ce mois" value={fmt(depenses.filter(d=>d.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,d)=>s+d.montant,0))} color={CE.warning}/>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <Btn onClick={()=>setShowForm(!showForm)} bg={CE.danger} color="#FFF">+ Ajouter dépense</Btn>
      </div>

      {showForm&&(
        <Card style={{marginBottom:14,background:"#FEF2F2",border:`1px solid ${CE.danger}30`}}>
          <div style={{fontWeight:700,fontSize:14,color:CE.danger,marginBottom:12}}>➕ Nouvelle dépense</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
            <Inp label="Description *" k="description" val={form.description} onChange={setF} ph="ex: Facture électricité"/>
            <Sel label="Catégorie" k="categorie" val={form.categorie} onChange={setF} options={[["Electricite","💡 Électricité"],["Eau","💧 Eau"],["Loyer","🏠 Loyer"],["Salaires","👨‍🏫 Salaires"],["Entretien","🔧 Entretien"],["Transport","🚗 Transport"],["Materiel","📚 Matériel pédagogique"],["Administration","📋 Administration"],["Autre","📦 Autre"]]}/>
            <Inp label="Montant (F) *" k="montant" type="number" val={form.montant} onChange={setF} ph="ex: 50000"/>
            <Inp label="Date" k="date" type="date" val={form.date} onChange={setF}/>
            <Inp label="Note" k="note" val={form.note} onChange={setF} ph="Détails optionnels"/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={()=>setShowForm(false)} bg="#F3F4F6" color={CE.muted}>Annuler</Btn>
            <Btn onClick={save} bg={CE.danger} color="#FFF">✓ Ajouter</Btn>
          </div>
        </Card>
      )}

      {/* Filtre par mois */}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
        <select value={filtreMois} onChange={e=>setFiltreMois(e.target.value)}
          style={{flex:1,border:`1.5px solid ${CE.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"}}>
          <option value="">📅 Toutes les dépenses</option>
          {mois.map(m=><option key={m} value={m}>{new Date(m+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}</option>)}
        </select>
        <div style={{background:CE.danger+"15",color:CE.danger,fontWeight:700,fontSize:13,padding:"8px 14px",borderRadius:8,whiteSpace:"nowrap"}}>{fmt(totalPeriode)}</div>
      </div>

      {depFiltres.length===0&&<div style={{textAlign:"center",color:CE.muted,padding:30}}>💸 Aucune dépense.</div>}
      {depFiltres.map(d=>(
        <div key={d.id} style={{background:CE.surface,borderRadius:10,padding:"10px 14px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",justifyContent:"space-between",alignItems:"center",borderLeft:`3px solid ${CE.danger}`}}>
          <div>
            <div style={{fontWeight:700,color:CE.danger,fontSize:14}}>-{fmt(d.montant)}</div>
            <div style={{fontSize:13,color:CE.text}}>{catIcon[d.categorie]||"📦"} {d.description}</div>
            <div style={{fontSize:11,color:CE.muted}}>{d.categorie} · {fmtDate(d.date)}{d.note?` · ${d.note}`:""}</div>
          </div>
          <Btn onClick={()=>del(d.id)} bg="#FEF2F2" color={CE.danger} sm>🗑</Btn>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MODULE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export default function ModuleEcole({user,config,parler:parlerProp}){
  const KEY_E="vv_ecole_eleves_"+user.id;
  const KEY_P="vv_ecole_paiements_"+user.id;
  const KEY_S="vv_ecole_personnel_"+user.id;
  const KEY_F="vv_ecole_fournitures_"+user.id;
  const KEY_D="vv_ecole_depenses_"+user.id;

  const parler=parlerProp||((t)=>{const u=new SpeechSynthesisUtterance(t);u.lang="fr-FR";window.speechSynthesis.speak(u);});

  const[onglet,setOnglet]=useState("dashboard");
  const[eleves,setElevesR]=useState(()=>lsGet(KEY_E)||[]);
  const[paiements,setPaiementsR]=useState(()=>lsGet(KEY_P)||[]);
  const[personnel,setPersonnelR]=useState(()=>lsGet(KEY_S)||[]);
  const[fournitures,setFournituresR]=useState(()=>lsGet(KEY_F)||[]);
  const[depenses,setDepensesR]=useState(()=>lsGet(KEY_D)||[]);

  const setEleves=useCallback(fn=>{setElevesR(prev=>{const n=typeof fn==="function"?fn(prev):fn;lsSet(KEY_E,n);return n;});},[KEY_E]);
  const setPaiements=useCallback(fn=>{setPaiementsR(prev=>{const n=typeof fn==="function"?fn(prev):fn;lsSet(KEY_P,n);return n;});},[KEY_P]);
  const setPersonnel=useCallback(fn=>{setPersonnelR(prev=>{const n=typeof fn==="function"?fn(prev):fn;lsSet(KEY_S,n);return n;});},[KEY_S]);
  const setFournitures=useCallback(fn=>{setFournituresR(prev=>{const n=typeof fn==="function"?fn(prev):fn;lsSet(KEY_F,n);return n;});},[KEY_F]);
  const setDepenses=useCallback(fn=>{setDepensesR(prev=>{const n=typeof fn==="function"?fn(prev):fn;lsSet(KEY_D,n);return n;});},[KEY_D]);

  const onglets=[
    ["dashboard","🏠","Tableau de bord"],
    ["eleves","🎒","Élèves"],
    ["paiements","💰","Paiements"],
    ["personnel","👨‍🏫","Personnel"],
    ["fournitures","📦","Fournitures"],
    ["depenses","💸","Dépenses"],
    ["rapports","📊","Rapports"],
  ];

  return(
    <div style={{background:CE.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${CE.primary},${CE.primaryMid})`,padding:"14px 20px",color:"#FFF"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:800,fontSize:20}}>🏫 VenteVoix École</div>
            <div style={{fontSize:12,opacity:.75}}>{user.nom} · Gestion scolaire & recouvrement</div>
          </div>
          {/* Nav PC */}
          <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {onglets.map(([k,icon,label])=>(
              <button key={k} onClick={()=>setOnglet(k)}
                style={{padding:"7px 14px",borderRadius:10,border:"none",background:onglet===k?"rgba(255,255,255,.25)":"transparent",color:"#FFF",fontWeight:onglet===k?700:400,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                <span>{icon}</span><span style={{display:"none"}}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Titre onglet courant */}
      <div style={{background:CE.surface,borderBottom:`1px solid ${CE.border}`,padding:"10px 20px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",fontWeight:700,fontSize:14,color:CE.primary}}>
          {onglets.find(([k])=>k===onglet)?.[0]==="dashboard"&&"🏠 Tableau de bord"}
          {onglet==="eleves"&&"🎒 Gestion des élèves"}
          {onglet==="paiements"&&"💰 Paiements & Recouvrement"}
          {onglet==="personnel"&&"👨‍🏫 Personnel & Salaires"}
          {onglet==="fournitures"&&"📦 Fournitures & Stock"}
          {onglet==="depenses"&&"💸 Dépenses de l'école"}
          {onglet==="rapports"&&"📊 Rapports & Statistiques"}
        </div>
      </div>

      {/* Contenu */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"16px 16px 100px"}}>
        {onglet==="dashboard"&&<Dashboard eleves={eleves} paiements={paiements} personnel={personnel} fournitures={fournitures} config={config} parler={parler}/>}
        {onglet==="eleves"&&<Eleves eleves={eleves} setEleves={setEleves} paiements={paiements} setPaiements={setPaiements} config={config}/>}
        {onglet==="paiements"&&<Paiements eleves={eleves} paiements={paiements} setPaiements={setPaiements}/>}
        {onglet==="personnel"&&<Personnel personnel={personnel} setPersonnel={setPersonnel}/>}
        {onglet==="fournitures"&&<Fournitures fournitures={fournitures} setFournitures={setFournitures}/>}
        {onglet==="depenses"&&<Depenses depenses={depenses} setDepenses={setDepenses}/>}
        {onglet==="rapports"&&<Rapports eleves={eleves} paiements={paiements} personnel={personnel} fournitures={fournitures}/>}
      </div>

      {/* Nav mobile */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:CE.surface,borderTop:`1px solid ${CE.border}`,display:"flex",zIndex:100,overflowX:"auto"}}>
        {onglets.map(([k,icon,label])=>(
          <button key={k} onClick={()=>setOnglet(k)}
            style={{flex:1,minWidth:50,padding:"8px 0 5px",border:"none",background:"transparent",cursor:"pointer",color:onglet===k?CE.primary:CE.muted,fontWeight:onglet===k?700:400}}>
            <div style={{fontSize:18}}>{icon}</div>
            <div style={{fontSize:8}}>{label.split(" ")[0]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
