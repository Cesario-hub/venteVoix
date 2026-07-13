import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG — modifiable dans les Paramètres
// ══════════════════════════════════════════════════════════════════════════════
const CONFIG_DEFAULT = {
  ADMIN_PIN:       "123456",
  WAVE_QR_URL:     "",
  ORANGE_QR_URL:   "",
  WAVE_NUMBER:     "+225 XX XX XX XX XX",
  ORANGE_NUMBER:   "+225 XX XX XX XX XX",
  WHATSAPP_NUMBER: "225XXXXXXXXXX",
  APP_URL:         "https://venteVoix.vercel.app",
  RAPPORT_HEURE:   18,
  RAPPORT_MINUTE:  0,
  RAPPORT_ACTIF:   true,
};

function getConfig(){
  try{ return {...CONFIG_DEFAULT,...JSON.parse(localStorage.getItem("vv_config")||"{}")}; }
  catch{ return CONFIG_DEFAULT; }
}
function saveConfig(c){ localStorage.setItem("vv_config",JSON.stringify(c)); }

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  bg:"#FAF6F0", surface:"#FFFFFF",
  primary:"#1B4332", primaryMid:"#2D6A4F", primaryLight:"#52B788",
  accent:"#D4A017", accentLight:"#F6E27F",
  danger:"#B91C1C", text:"#111827", muted:"#6B7280", border:"#E8E0D5",
  mic:"#DC2626", wave:"#1A6BFF", orange:"#FF6600",
};

const PLANS = [
  { id:"starter", name:"Démarrage", price:"2 000", xof:2000, color:C.primaryLight, badge:null,
    features:["Enregistrement vocal illimité","Tableau de bord","Rapport audio journalier","Export Excel","1 utilisateur"] },
  { id:"pro", name:"Pro", price:"5 000", xof:5000, color:C.primary, badge:"⭐ Populaire",
    features:["Tout Démarrage inclus","Gestion de stock","Export PDF","Rapports toutes périodes","WhatsApp automatique","3 utilisateurs"] },
  { id:"business", name:"Business", price:"12 000", xof:12000, color:C.accent, badge:"🏆 Complet",
    features:["Tout Pro inclus","Multi-boutiques","Rapport mensuel","Utilisateurs illimités","Support prioritaire"] },
];

// ══════════════════════════════════════════════════════════════════════════════
// STOCKAGE LOCAL — toutes les données dans localStorage
// ══════════════════════════════════════════════════════════════════════════════
function lsGet(key){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):null; }catch{ return null; } }
function lsSet(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch{} }

// ══════════════════════════════════════════════════════════════════════════════
// CODES D'ACTIVATION
// ══════════════════════════════════════════════════════════════════════════════
function generateCode(){ return Math.floor(100000+Math.random()*900000).toString(); }
function getCodes(){ return lsGet("vv_codes")||{}; }
function saveCodes(c){ lsSet("vv_codes",c); }

function createCode(planId,note=""){
  const codes=getCodes();
  const code=generateCode();
  codes[code]={planId,note,used:false,createdAt:new Date().toISOString(),usedAt:null,usedBy:null};
  saveCodes(codes);
  return code;
}

function useActivationCode(code,userInfo){
  // Code de test permanent
  if(code==="TEST01") return {ok:true,planId:"pro"};
  const codes=getCodes();
  if(!codes[code]) return {ok:false,error:"Code invalide."};
  if(codes[code].used) return {ok:false,error:"Code déjà utilisé."};
  codes[code].used=true;
  codes[code].usedAt=new Date().toISOString();
  codes[code].usedBy=userInfo;
  saveCodes(codes);
  return {ok:true,planId:codes[code].planId};
}

// ══════════════════════════════════════════════════════════════════════════════
// CLAUDE API — interprétation vocale
// ══════════════════════════════════════════════════════════════════════════════
async function interpreterVoix(texte,stockItems){
  const sys=`Tu es assistant comptable secteur informel africain. Articles stock: ${stockItems.map(s=>s.nom).join(",")||"aucun"}.
Calcule toujours montantTotal = quantite * prixUnitaire (ex: 3 savons a 500F = 1500). Reponds UNIQUEMENT en JSON: {"type":"vente"|"depense"|"stock_entree"|"inconnu","description":"...","quantite":n|null,"prixUnitaire":n|null,"montantTotal":n,"articleStock":"nom"|null,"confirmation":"phrase naturelle courte"}
JSON pur seulement.`;
  try{
    const r=await fetch("/.netlify/functions/claude",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:400,system:sys,messages:[{role:"user",content:texte}]})});
    const d=await r.json();
    return JSON.parse(d.content?.[0]?.text?.replace(/```json|```/g,"").trim()||"{}");
  }catch{
    return {type:"inconnu",confirmation:"Je n'ai pas compris. Répétez."};
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RAPPORT AUDIO
// ══════════════════════════════════════════════════════════════════════════════
function fmtN(n){ return new Intl.NumberFormat("fr-FR").format(n); }

async function genererRapportTexte(transactions,stock,nomPer){
  const ventes=transactions.filter(t=>t.type==="vente");
  const depenses=transactions.filter(t=>t.type==="depense");
  const tv=ventes.reduce((s,t)=>s+t.montant,0);
  const td=depenses.reduce((s,t)=>s+t.montant,0);
  const benefice=tv-td;
  const meilleureVente=ventes.length>0?ventes.reduce((a,b)=>a.montant>b.montant?a:b,ventes[0]):null;
  const stockFaible=stock.filter(a=>(a.quantite??0)<=(a.seuil??5));

  const sys=`Tu es un assistant comptable africain qui fait des rapports oraux courts et chaleureux pour des vendeurs de marché. Génère un rapport audio de 5 à 7 phrases maximum, en français simple et encourageant. Commence par Bonjour ou Bonsoir selon l'heure. Parle avec "vous". Inclus: ventes, chiffre d'affaires, dépenses, bénéfice. Si positif: encourage. Si négatif: console. Mentionne meilleure vente et stock faible si ils existent. Termine par une phrase motivante.`;
  const ctx=`Rapport ${nomPer}: ${ventes.length} ventes pour ${fmtN(tv)} F, ${depenses.length} dépenses pour ${fmtN(td)} F, bénéfice ${fmtN(benefice)} F. Meilleure vente: ${meilleureVente?meilleureVente.description+" "+fmtN(meilleureVente.montant)+" F":"aucune"}. Stock faible: ${stockFaible.length>0?stockFaible.map(a=>a.nom).join(", "):"aucun"}. Heure: ${new Date().getHours()}h.`;

  try{
    const r=await fetch("/.netlify/functions/claude",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:350,system:sys,messages:[{role:"user",content:ctx}]})});
    const d=await r.json();
    const txt=d.content?.[0]?.text;
    if(txt) return txt;
  }catch{}

  // Fallback si Claude pas disponible
  const h=new Date().getHours();
  const salut=h<12?"Bonjour":h<18?"Bon après-midi":"Bonsoir";
  let txt=`${salut} ! Voici votre bilan ${nomPer}. `;
  txt+=`Vous avez réalisé ${ventes.length} vente${ventes.length>1?"s":""} pour ${fmtN(tv)} francs. `;
  txt+=`Vos dépenses s'élèvent à ${fmtN(td)} francs. `;
  txt+=`Votre bénéfice net est de ${fmtN(Math.abs(benefice))} francs ${benefice>=0?"positif":"négatif"}. `;
  if(meilleureVente) txt+=`Meilleure vente : ${meilleureVente.description} à ${fmtN(meilleureVente.montant)} francs. `;
  if(stockFaible.length>0) txt+=`Stock faible : ${stockFaible.map(a=>a.nom).join(", ")}. `;
  txt+=benefice>=0?"Excellent travail, continuez !":"Courage, demain sera meilleur !";
  return txt;
}

function creerLienAudio(rapport,config){
  const encoded=btoa(encodeURIComponent(rapport));
  return `${config.APP_URL}?audio=${encoded}`;
}

function creerMessageWhatsApp(rapport,lienAudio,stats,nomPer){
  return encodeURIComponent(
`🛒 *VenteVoix — Bilan ${nomPer}*

📈 Chiffre d'affaires : *${fmtN(stats.tv)} F*
💸 Dépenses : *${fmtN(stats.td)} F*
💰 Bénéfice net : *${fmtN(stats.tv-stats.td)} F*
📦 ${stats.nv} ventes · ${stats.nd} dépenses

🎙️ *Écoutez votre rapport audio :*
${lienAudio}

_(Cliquez le lien → l'audio démarre automatiquement)_`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTRES PÉRIODES
// ══════════════════════════════════════════════════════════════════════════════
function filtrerParPeriode(transactions,periode,debut=null,fin=null){
  const now=new Date();
  const dJour=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const dHier=new Date(dJour); dHier.setDate(dHier.getDate()-1);
  const fHier=new Date(dJour);
  const dSemaine=new Date(dJour); dSemaine.setDate(dSemaine.getDate()-dSemaine.getDay());
  const dMois=new Date(now.getFullYear(),now.getMonth(),1);
  return transactions.filter(t=>{
    const dt=new Date(t.date);
    if(periode==="aujourd'hui") return dt>=dJour;
    if(periode==="hier") return dt>=dHier&&dt<fHier;
    if(periode==="semaine") return dt>=dSemaine;
    if(periode==="mois") return dt>=dMois;
    if(periode==="personnalisee"&&debut&&fin){
      const d=new Date(debut),f=new Date(fin); f.setHours(23,59,59); return dt>=d&&dt<=f;
    }
    return true;
  });
}
function nomPeriode(p){ return {["aujourd'hui"]:"d'aujourd'hui",hier:"d'hier",semaine:"de cette semaine",mois:"de ce mois"}[p]||"de la période"; }

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
const fmt=n=>fmtN(n)+" F";

function exportExcel(tx,stk,stats,titre="Rapport"){
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
    [`VenteVoix — ${titre}`],[new Date().toLocaleString("fr-FR")],[],
    ["Indicateur","Montant","Opérations"],
    ["Ventes",stats.tv,stats.nv],["Dépenses",stats.td,stats.nd],["Bénéfice",stats.tv-stats.td,""],
  ]),"Résumé");
  const tr=[["Date","Type","Description","Qté","PU","Montant","Texte vocal"]];
  tx.forEach(t=>tr.push([t.date?new Date(t.date).toLocaleString("fr-FR"):"",t.type==="vente"?"VENTE":"DÉPENSE",t.description??"",t.quantite??"",t.prixUnitaire??"",t.montant,t.texteOriginal??""]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(tr),"Transactions");
  if(stk.length>0){
    const sr=[["Article","Qté","Prix","Valeur","Statut"]];
    stk.forEach(a=>{const q=a.quantite??0;sr.push([a.nom,q,a.prixVente??0,q*(a.prixVente??0),q<=(a.seuil??5)?"⚠️ Faible":"✅ OK"]);});
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sr),"Stock");
  }
  XLSX.writeFile(wb,`VenteVoix_${titre.replace(/ /g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportPDF(tx,stk,stats,titre="Rapport"){
  const txR=tx.slice(0,100).map(t=>`<tr class="${t.type}"><td>${t.date?new Date(t.date).toLocaleDateString("fr-FR"):""}</td><td><b>${t.type==="vente"?"VENTE":"DÉPENSE"}</b></td><td>${t.description??""}</td><td style="text-align:right;font-weight:700">${fmt(t.montant)}</td></tr>`).join("");
  const sR=stk.map(a=>{const q=a.quantite??0,f=q<=(a.seuil??5);return`<tr><td>${a.nom}</td><td>${q}</td><td>${fmt(a.prixVente??0)}</td><td>${fmt(q*(a.prixVente??0))}</td><td>${f?"⚠️":"✅"}</td></tr>`;}).join("");
  const w=window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>VenteVoix ${titre}</title><style>body{font-family:Arial;padding:24px;max-width:900px;margin:auto}h1{color:#1B4332}h2{color:#1B4332;border-bottom:2px solid #D1FAE5;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px}th{background:#1B4332;color:#fff;padding:7px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #E8E0D5}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.sbox{border:1px solid #E8E0D5;border-radius:8px;padding:12px}.sl{font-size:10px;color:#6B7280;text-transform:uppercase}.sv{font-size:18px;font-weight:800}.green{color:#1B4332}.red{color:#B91C1C}tr.vente td{background:#F0FDF4}tr.depense td{background:#FEF2F2}</style></head><body><h1>🛒 VenteVoix — ${titre}</h1><p style="color:#6B7280;font-size:11px">Généré le ${new Date().toLocaleString("fr-FR")}</p><h2>Résumé</h2><div class="stats"><div class="sbox"><div class="sl">Ventes (${stats.nv})</div><div class="sv green">${fmt(stats.tv)}</div></div><div class="sbox"><div class="sl">Dépenses (${stats.nd})</div><div class="sv red">${fmt(stats.td)}</div></div><div class="sbox"><div class="sl">Bénéfice</div><div class="sv ${stats.tv-stats.td>=0?"green":"red"}">${fmt(stats.tv-stats.td)}</div></div></div><h2>Transactions</h2><table><tr><th>Date</th><th>Type</th><th>Description</th><th>Montant</th></tr>${txR}</table>${stk.length?`<h2>Stock</h2><table><tr><th>Article</th><th>Qté</th><th>Prix</th><th>Valeur</th><th>Statut</th></tr>${sR}</table>`:""}</body></html>`);
  w.document.close();setTimeout(()=>w.print(),400);
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS UI
// ══════════════════════════════════════════════════════════════════════════════
function Badge({type}){
  const m={vente:["#D1FAE5",C.primary,"VENTE"],depense:["#FEE2E2",C.danger,"DÉPENSE"],stock_entree:["#DBEAFE","#1D4ED8","STOCK"]};
  const[bg,color,label]=m[type]??["#F3F4F6",C.muted,"?"];
  return<span style={{background:bg,color,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,letterSpacing:1,whiteSpace:"nowrap"}}>{label}</span>;
}
function Row({l,v,bold}){return<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.muted}}>{l}</span><span style={{fontSize:12,fontWeight:bold?800:500}}>{v}</span></div>;}
function StatCard({label,value,color,sub}){return<div style={{background:C.surface,borderRadius:14,padding:"13px 15px",boxShadow:"0 2px 8px rgba(0,0,0,.07)",flex:1,minWidth:90}}><div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>{label}</div><div style={{fontSize:19,fontWeight:800,color:color??C.text}}>{value}</div>{sub&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{sub}</div>}</div>;}
function btnS(bg,color,x={}){return{flex:1,padding:"11px 0",borderRadius:12,border:"none",background:bg,color,fontWeight:700,fontSize:14,cursor:"pointer",...x};}
function Input({label,k,type="text",placeholder,value,onChange}){return<div style={{marginBottom:14}}><div style={{fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>{label}</div><input type={type} placeholder={placeholder} value={value??""} onChange={onChange} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:14,boxSizing:"border-box",outline:"none"}}/></div>;}

// ══════════════════════════════════════════════════════════════════════════════
// LECTEUR AUDIO — s'active si ?audio= dans l'URL
// ══════════════════════════════════════════════════════════════════════════════
function LecteurAudio(){
  const[texte,setTexte]=useState("");
  const[lecture,setLecture]=useState(false);
  const[termine,setTermine]=useState(false);
  const synth=useRef(window.speechSynthesis);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search).get("audio");
    if(!p) return;
    try{
      const decoded=decodeURIComponent(atob(p));
      setTexte(decoded);
      setTimeout(()=>{
        const u=new SpeechSynthesisUtterance(decoded);
        u.lang="fr-FR"; u.rate=0.9; u.pitch=1.05;
        u.onstart=()=>setLecture(true);
        u.onend=()=>{setLecture(false);setTermine(true);};
        synth.current?.speak(u);
      },1000);
    }catch(e){console.error(e);}
  },[]);

  const relire=()=>{
    synth.current?.cancel();
    const u=new SpeechSynthesisUtterance(texte);
    u.lang="fr-FR"; u.rate=0.9;
    u.onstart=()=>setLecture(true);
    u.onend=()=>setLecture(false);
    synth.current?.speak(u);
  };

  if(!texte) return null;
  return(
    <div style={{minHeight:"100vh",background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:C.surface,borderRadius:24,padding:28,maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 16px 48px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:48,marginBottom:12}}>{lecture?"🔊":termine?"✅":"🎙️"}</div>
        <div style={{fontSize:18,fontWeight:800,color:C.primary,marginBottom:6}}>{lecture?"Lecture en cours…":termine?"Terminée":"Rapport VenteVoix"}</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:20}}>{lecture?"Écoutez votre bilan":termine?"Vous pouvez réécouter":"Démarrage automatique…"}</div>
        {lecture&&<div style={{display:"flex",gap:4,justifyContent:"center",height:40,marginBottom:20}}>
          {[1,2,3,4,5,6,7].map(i=><div key={i} style={{width:4,borderRadius:2,background:C.primary,animation:`wave${i} .8s ease-in-out infinite`,animationDelay:`${i*0.1}s`}}/>)}
        </div>}
        <div style={{background:"#F0FDF4",borderRadius:12,padding:16,marginBottom:20,textAlign:"left"}}>
          <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>{texte}</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {lecture
            ?<button onClick={()=>{synth.current?.cancel();setLecture(false);}} style={{...btnS(C.danger,"#FFF"),flex:1}}>⏹ Arrêter</button>
            :<button onClick={relire} style={{...btnS(C.primary,"#FFF"),flex:1}}>🔊 Réécouter</button>
          }
          <button onClick={()=>window.location.href=window.location.origin} style={{...btnS("#F3F4F6",C.primary),flex:1}}>🏠 Ouvrir l'app</button>
        </div>
        <div style={{marginTop:16,fontSize:11,color:C.muted}}>🛒 VenteVoix · Rapport journalier</div>
      </div>
      <style>{`@keyframes wave1{0%,100%{height:8px}50%{height:28px}}@keyframes wave2{0%,100%{height:14px}50%{height:36px}}@keyframes wave3{0%,100%{height:20px}50%{height:40px}}@keyframes wave4{0%,100%{height:24px}50%{height:36px}}@keyframes wave5{0%,100%{height:18px}50%{height:32px}}@keyframes wave6{0%,100%{height:12px}50%{height:26px}}@keyframes wave7{0%,100%{height:6px}50%{height:20px}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ÉCRAN RAPPORT
// ══════════════════════════════════════════════════════════════════════════════
function EcranRapport({transactions,stock,onClose}){
  const[periode,setPeriode]=useState("aujourd'hui");
  const[debut,setDebut]=useState("");
  const[fin,setFin]=useState("");
  const[rapport,setRapport]=useState("");
  const[lienAudio,setLienAudio]=useState("");
  const[loading,setLoading]=useState(false);
  const[lecture,setLecture]=useState(false);
  const synth=useRef(window.speechSynthesis);
  const config=getConfig();

  const tx=filtrerParPeriode(transactions,periode,debut,fin);
  const ventes=tx.filter(t=>t.type==="vente");
  const depenses=tx.filter(t=>t.type==="depense");
  const tv=ventes.reduce((s,t)=>s+t.montant,0);
  const td=depenses.reduce((s,t)=>s+t.montant,0);
  const stats={tv,td,nv:ventes.length,nd:depenses.length};
  const np=nomPeriode(periode);

  const generer=async()=>{
    setLoading(true);
    const texte=await genererRapportTexte(tx,stock,np);
    setRapport(texte);
    setLienAudio(creerLienAudio(texte,config));
    setLoading(false);
  };

  const lireAVoix=()=>{
    synth.current?.cancel();
    const u=new SpeechSynthesisUtterance(rapport);
    u.lang="fr-FR"; u.rate=0.9;
    u.onstart=()=>setLecture(true);
    u.onend=()=>setLecture(false);
    synth.current?.speak(u);
  };

  const PERIODES=[
    {id:"aujourd'hui",label:"Aujourd'hui"},
    {id:"hier",label:"Hier"},
    {id:"semaine",label:"Semaine"},
    {id:"mois",label:"Mois"},
    {id:"personnalisee",label:"Période"},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:C.bg,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{background:C.primary,borderRadius:"20px 20px 0 0",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <div><div style={{fontSize:17,fontWeight:800,color:"#FFF"}}>📊 Rapport & Bilan</div><div style={{fontSize:11,color:C.primaryLight}}>Audio · WhatsApp · PDF · Excel</div></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"6px 12px",color:"#FFF",cursor:"pointer",fontSize:13}}>✕</button>
        </div>
        <div style={{padding:"16px"}}>
          {/* Sélecteur période */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase"}}>Période</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {PERIODES.map(p=>(
                <button key={p.id} onClick={()=>setPeriode(p.id)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${periode===p.id?C.primary:C.border}`,background:periode===p.id?C.primary:"transparent",color:periode===p.id?"#FFF":C.muted,fontSize:12,fontWeight:periode===p.id?700:400,cursor:"pointer"}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {periode==="personnalisee"&&(
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1}}><div style={{fontSize:11,color:C.muted,marginBottom:4}}>Du</div><input type="date" value={debut} onChange={e=>setDebut(e.target.value)} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
              <div style={{flex:1}}><div style={{fontSize:11,color:C.muted,marginBottom:4}}>Au</div><input type="date" value={fin} onChange={e=>setFin(e.target.value)} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
            </div>
          )}
          {/* Stats rapides */}
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <StatCard label="Ventes" value={fmt(tv)} color={C.primary} sub={`${stats.nv} op.`}/>
            <StatCard label="Dépenses" value={fmt(td)} color={C.danger} sub={`${stats.nd} op.`}/>
            <StatCard label="Bénéfice" value={fmt(tv-td)} color={(tv-td)>=0?C.primary:C.danger}/>
          </div>
          <button onClick={generer} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:loading?"#9CA3AF":C.primaryMid,color:"#FFF",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",marginBottom:12}}>
            {loading?"⏳ Génération par Claude…":"🤖 Générer le rapport audio"}
          </button>
          {rapport&&(
            <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
              <div style={{fontSize:12,color:C.primary,fontWeight:700,marginBottom:10}}>🎙️ Rapport {np}</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:14,background:"#F0FDF4",borderRadius:10,padding:12}}>{rapport}</div>
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,padding:"10px 12px",marginBottom:14}}>
                <div style={{fontSize:11,color:"#1D4ED8",fontWeight:700,marginBottom:4}}>🔗 Lien audio pour WhatsApp</div>
                <div style={{fontSize:10,color:"#3B82F6",wordBreak:"break-all",lineHeight:1.5}}>{lienAudio.slice(0,80)}…</div>
                <button onClick={()=>navigator.clipboard.writeText(lienAudio)} style={{marginTop:6,background:"#3B82F6",border:"none",borderRadius:6,padding:"4px 10px",color:"#FFF",fontSize:10,cursor:"pointer",fontWeight:600}}>📋 Copier le lien</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onClick={lecture?()=>{synth.current?.cancel();setLecture(false);}:lireAVoix} style={{padding:"11px 8px",borderRadius:10,border:"none",background:lecture?C.danger:C.primary,color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  {lecture?"⏹ Arrêter":"🔊 Écouter"}
                </button>
                <button onClick={()=>window.open(`https://wa.me/${config.WHATSAPP_NUMBER}?text=${creerMessageWhatsApp(rapport,lienAudio,stats,np)}`,"_blank")} style={{padding:"11px 8px",borderRadius:10,border:"none",background:"#25D366",color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  📲 WhatsApp
                </button>
                <button onClick={()=>exportPDF(tx,stock,stats,`Bilan ${np}`)} style={{padding:"11px 8px",borderRadius:10,border:"none",background:C.accent,color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>📄 PDF</button>
                <button onClick={()=>exportExcel(tx,stock,stats,`Bilan ${np}`)} style={{padding:"11px 8px",borderRadius:10,border:"none",background:C.primaryLight,color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>📊 Excel</button>
              </div>
              <div style={{marginTop:12,fontSize:11,color:C.muted,background:"#F9FAFB",borderRadius:8,padding:"8px 12px",lineHeight:1.6}}>
                📲 WhatsApp envoie le résumé + lien. Le destinataire clique → l'app lit le rapport à voix haute.
              </div>
            </div>
          )}
          {/* Clôturer journée */}
          <div style={{background:"#F0FDF4",border:`1.5px solid ${C.primaryLight}`,borderRadius:12,padding:14}}>
            <div style={{fontWeight:700,fontSize:13,color:C.primary,marginBottom:4}}>🌙 Clôturer ma journée</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Génère le bilan, le lit à voix haute et prépare le WhatsApp.</div>
            <button onClick={async()=>{
              setPeriode("aujourd'hui");
              setLoading(true);
              const txJ=filtrerParPeriode(transactions,"aujourd'hui");
              const texte=await genererRapportTexte(txJ,stock,"d'aujourd'hui");
              const lien=creerLienAudio(texte,config);
              setRapport(texte); setLienAudio(lien);
              setLoading(false);
              setTimeout(()=>{
                const u=new SpeechSynthesisUtterance(texte);
                u.lang="fr-FR"; u.rate=0.9;
                u.onstart=()=>setLecture(true);
                u.onend=()=>setLecture(false);
                synth.current?.speak(u);
              },300);
            }} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:C.primary,color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              🌙 Clôturer et écouter le bilan
            </button>
          </div>
        </div>
      </div>
      <style>{`input:focus{border-color:#1B4332!important;}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PARAMÈTRES
// ══════════════════════════════════════════════════════════════════════════════
function EcranParametres({onClose}){
  const[cfg,setCfg]=useState(getConfig());
  const[saved,setSaved]=useState(false);
  const save=()=>{ saveConfig(cfg); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  const F=({label,k,type="text",placeholder})=>(
    <Input label={label} k={k} type={type} placeholder={placeholder} value={cfg[k]}
      onChange={e=>setCfg(p=>({...p,[k]:e.target.value}))}/>
  );
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:C.bg,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{background:C.primary,borderRadius:"20px 20px 0 0",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <div><div style={{fontSize:17,fontWeight:800,color:"#FFF"}}>⚙️ Paramètres</div><div style={{fontSize:11,color:C.primaryLight}}>Configuration de l'application</div></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"6px 12px",color:"#FFF",cursor:"pointer",fontSize:13}}>✕</button>
        </div>
        <div style={{padding:"16px"}}>
          {/* Rapport auto */}
          <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:14}}>🕐 Rapport de fin de journée</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>Rapport automatique</div>
                <div style={{fontSize:11,color:C.muted}}>Lecture vocale + WhatsApp à l'heure choisie</div>
              </div>
              <button onClick={()=>setCfg(p=>({...p,RAPPORT_ACTIF:!p.RAPPORT_ACTIF}))} style={{width:48,height:26,borderRadius:13,border:"none",cursor:"pointer",background:cfg.RAPPORT_ACTIF?C.primary:"#D1D5DB",position:"relative",transition:"background .2s"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#FFF",position:"absolute",top:3,left:cfg.RAPPORT_ACTIF?25:3,transition:"left .2s"}}/>
              </button>
            </div>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>Heure</div>
                <select value={cfg.RAPPORT_HEURE} onChange={e=>setCfg(p=>({...p,RAPPORT_HEURE:Number(e.target.value)}))} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",fontSize:14,outline:"none",background:"#FFF"}}>
                  {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}h00</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>Minutes</div>
                <select value={cfg.RAPPORT_MINUTE} onChange={e=>setCfg(p=>({...p,RAPPORT_MINUTE:Number(e.target.value)}))} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 14px",fontSize:14,outline:"none",background:"#FFF"}}>
                  {[0,15,30,45].map(m=><option key={m} value={m}>:{String(m).padStart(2,"0")}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginTop:10,fontSize:12,color:C.muted,background:"#F9FAFB",borderRadius:8,padding:"8px 12px"}}>
              ⏰ Rapport prévu à <strong>{String(cfg.RAPPORT_HEURE).padStart(2,"0")}h{String(cfg.RAPPORT_MINUTE).padStart(2,"0")}</strong> chaque jour
            </div>
          </div>
          {/* WhatsApp */}
          <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:14}}>📲 WhatsApp & Numéros</div>
            <F label="Votre numéro WhatsApp (sans +)" k="WHATSAPP_NUMBER" placeholder="22507XXXXXXXX"/>
            <F label="Votre numéro Wave" k="WAVE_NUMBER" placeholder="+225 07 XX XX XX XX"/>
            <F label="Votre numéro Orange Money" k="ORANGE_NUMBER" placeholder="+225 07 XX XX XX XX"/>
          </div>
          {/* QR Codes */}
          <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:14}}>📷 QR Codes paiement</div>
            <F label="URL image QR Wave" k="WAVE_QR_URL" placeholder="https://i.ibb.co/..."/>
            <F label="URL image QR Orange Money" k="ORANGE_QR_URL" placeholder="https://i.ibb.co/..."/>
          </div>
          {/* App */}
          <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.primary,marginBottom:14}}>🌐 Application</div>
            <F label="URL de votre app Vercel" k="APP_URL" placeholder="https://venteVoix.vercel.app"/>
          </div>
          <button onClick={save} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:saved?"#10B981":C.primary,color:"#FFF",fontWeight:800,fontSize:15,cursor:"pointer",transition:"background .3s"}}>
            {saved?"✅ Paramètres sauvegardés !":"💾 Sauvegarder les paramètres"}
          </button>
        </div>
      </div>
      <style>{`input:focus,select:focus{border-color:#1B4332!important;box-shadow:0 0 0 3px rgba(27,67,50,.12);}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LandingPage({onSignup,onLogin}){
  const[hov,setHov]=useState(null);
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text}}>
      <div style={{background:`linear-gradient(160deg,${C.primary} 0%,${C.primaryMid} 60%,#1a5c3a 100%)`,padding:"0 20px 48px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:180,height:180,borderRadius:"0 0 0 100%",background:"rgba(212,160,23,.12)"}}/>
        <div style={{paddingTop:40,position:"relative"}}>
          <div style={{display:"inline-block",background:"rgba(212,160,23,.2)",border:"1px solid rgba(212,160,23,.4)",borderRadius:20,padding:"5px 16px",fontSize:12,color:C.accentLight,fontWeight:600,marginBottom:20}}>🇨🇮 🇸🇳 🇨🇲 Fait pour l'Afrique</div>
          <div style={{fontSize:48,marginBottom:8}}>🛒</div>
          <h1 style={{margin:"0 0 10px",fontSize:32,fontWeight:900,color:"#FFF",letterSpacing:-1,lineHeight:1.15}}>Vente<span style={{color:C.accentLight}}>Voix</span></h1>
          <p style={{color:"rgba(255,255,255,.75)",fontSize:15,margin:"0 0 28px",lineHeight:1.6,maxWidth:320,marginLeft:"auto",marginRight:"auto"}}>
            Gérez ventes, stock et dépenses<br/><strong style={{color:"#FFF"}}>en parlant simplement.</strong><br/>Rapport audio quotidien par WhatsApp
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>onSignup("pro")} style={{background:C.accent,color:"#1B1B1B",border:"none",borderRadius:12,padding:"14px 28px",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 4px 16px rgba(212,160,23,.5)"}}>Essayer 7 jours gratuit →</button>
            <button onClick={onLogin} style={{background:"rgba(255,255,255,.15)",color:"#FFF",border:"1px solid rgba(255,255,255,.3)",borderRadius:12,padding:"14px 22px",fontWeight:600,fontSize:14,cursor:"pointer"}}>Se connecter</button>
          </div>
          <div style={{marginTop:20,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            <span style={{background:"#1A6BFF",color:"#FFF",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:800}}>Wave</span>
            <span style={{background:"#FF6600",color:"#FFF",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:800}}>Orange Money</span>
            <span style={{background:"rgba(255,255,255,.2)",color:"#FFF",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:800}}>🎙️ Rapport Audio</span>
            <span style={{background:"rgba(255,255,255,.2)",color:"#FFF",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:800}}>📲 WhatsApp</span>
          </div>
        </div>
      </div>
      <div style={{padding:"28px 20px 20px",maxWidth:480,margin:"0 auto"}}>
        {[["🎤","Parlez","Dites 'Vendu 3 savons à 500 francs' — enregistré en 5 secondes"],
          ["📊","Suivez","Ventes, dépenses, bénéfice en temps réel"],
          ["🎙️","Écoutez","Bilan audio généré par Claude, lu à voix haute"],
          ["📲","WhatsApp","Lien audio dans le message — cliquer pour écouter"],
        ].map(([ic,t,d],i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:10,background:C.surface,borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:24,minWidth:36}}>{ic}</div>
            <div><div style={{fontWeight:700,fontSize:14,marginBottom:2,color:C.primary}}>{t}</div><div style={{fontSize:13,color:C.muted}}>{d}</div></div>
          </div>
        ))}
      </div>
      <div style={{padding:"8px 20px 48px",maxWidth:480,margin:"0 auto"}}>
        <h2 style={{textAlign:"center",margin:"0 0 18px",fontSize:20,fontWeight:800,color:C.primary}}>Choisissez votre formule</h2>
        {PLANS.map(plan=>(
          <div key={plan.id} onMouseEnter={()=>setHov(plan.id)} onMouseLeave={()=>setHov(null)}
            style={{background:C.surface,borderRadius:16,padding:"18px 18px 14px",marginBottom:12,border:`2px solid ${hov===plan.id||plan.id==="pro"?plan.color:C.border}`,boxShadow:plan.id==="pro"?"0 6px 24px rgba(45,106,79,.15)":"0 2px 8px rgba(0,0,0,.06)",transition:"all .2s",position:"relative"}}>
            {plan.badge&&<div style={{position:"absolute",top:-11,right:14,background:plan.id==="pro"?C.primary:C.accent,color:"#FFF",fontSize:11,fontWeight:700,padding:"3px 12px",borderRadius:20}}>{plan.badge}</div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{fontSize:16,fontWeight:800,color:plan.color}}>{plan.name}</div>
              <div><span style={{fontSize:22,fontWeight:900}}>{plan.price}</span><span style={{fontSize:11,color:C.muted}}> F/mois</span></div>
            </div>
            <div style={{marginBottom:12}}>{plan.features.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{color:plan.color,fontSize:12}}>✓</span><span style={{fontSize:12}}>{f}</span></div>)}</div>
            <button onClick={()=>onSignup(plan.id)} style={{width:"100%",padding:"11px 0",borderRadius:10,border:plan.id==="starter"?`2px solid ${plan.color}`:"none",background:plan.id==="pro"?C.primary:plan.id==="business"?C.accent:"transparent",color:plan.id==="starter"?plan.color:"#FFF",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              Choisir {plan.name} →
            </button>
          </div>
        ))}
        <p style={{textAlign:"center",fontSize:11,color:C.muted}}>✅ 7 jours gratuit · Wave · Orange Money</p>
      </div>
      <div style={{background:C.primary,padding:"20px",textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#FFF",marginBottom:4}}>🛒 VenteVoix</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>© 2026 · Fait pour les marchés africains</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PAIEMENT QR
// ══════════════════════════════════════════════════════════════════════════════
function PaymentPage({planId,onHaveCode,onBack}){
  const[method,setMethod]=useState(null);
  const plan=PLANS.find(p=>p.id===planId)??PLANS[1];
  const config=getConfig();
  const msg=encodeURIComponent(`Bonjour ! Je viens de payer le plan ${plan.name} VenteVoix (${plan.price} F). Merci de m'envoyer mon code d'activation. 🙏`);
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:440,margin:"0 auto"}}>
      <div style={{background:C.primary,padding:"20px 20px 22px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:13,marginBottom:14,padding:0}}>← Retour</button>
        <div style={{fontSize:20,fontWeight:900,color:"#FFF"}}>🛒 VenteVoix</div>
        <div style={{marginTop:10,background:"rgba(212,160,23,.2)",border:"1px solid rgba(212,160,23,.4)",borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontSize:11,color:C.accentLight,marginBottom:3}}>Formule choisie</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:800,color:"#FFF",fontSize:16}}>{plan.name}</span>
            <span style={{fontWeight:800,color:C.accentLight,fontSize:18}}>{plan.price} F<span style={{fontSize:11,fontWeight:400}}>/mois</span></span>
          </div>
        </div>
      </div>
      <div style={{padding:"20px 18px"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:14,color:C.primary}}>Choisissez votre mode de paiement</div>
        {[["wave","🔵","Wave",C.wave,config.WAVE_NUMBER],["orange","🟠","Orange Money",C.orange,config.ORANGE_NUMBER]].map(([id,icon,label,color,num])=>(
          <button key={id} onClick={()=>setMethod(id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px 16px",borderRadius:12,cursor:"pointer",marginBottom:10,border:`2px solid ${method===id?color:C.border}`,background:method===id?`${color}15`:C.surface}}>
            <span style={{fontSize:26}}>{icon}</span>
            <div style={{textAlign:"left",flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:method===id?color:C.text}}>{label}</div>
              <div style={{fontSize:11,color:C.muted}}>{num}</div>
            </div>
            <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${method===id?color:C.border}`,background:method===id?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {method===id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#FFF"}}/>}
            </div>
          </button>
        ))}
        {method&&(
          <div style={{background:C.surface,borderRadius:14,padding:18,textAlign:"center",boxShadow:"0 4px 14px rgba(0,0,0,.08)",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:method==="wave"?C.wave:C.orange}}>
              {method==="wave"?"Scannez avec Wave":"Scannez avec Orange Money"}
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Montant exact : <strong>{plan.price} F</strong></div>
            {(method==="wave"?config.WAVE_QR_URL:config.ORANGE_QR_URL)?(
              <img src={method==="wave"?config.WAVE_QR_URL:config.ORANGE_QR_URL} alt="QR" style={{width:200,height:200,borderRadius:12,border:`3px solid ${method==="wave"?C.wave:C.orange}`}}/>
            ):(
              <div style={{width:200,height:200,background:"#F3F4F6",borderRadius:12,border:`3px dashed ${method==="wave"?C.wave:C.orange}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                <div style={{fontSize:36,marginBottom:8}}>{method==="wave"?"🔵":"🟠"}</div>
                <div style={{fontSize:11,color:C.muted,textAlign:"center",padding:"0 10px"}}>Ajoutez votre QR dans Paramètres ⚙️</div>
              </div>
            )}
            <div style={{marginTop:12,fontSize:12,color:C.muted}}>Après paiement, envoyez la preuve par WhatsApp</div>
          </div>
        )}
        <a href={`https://wa.me/${config.WHATSAPP_NUMBER}?text=${msg}`} target="_blank" rel="noopener noreferrer"
          style={{display:"block",width:"100%",padding:"13px",borderRadius:12,border:"none",background:"#25D366",color:"#FFF",fontWeight:800,fontSize:14,cursor:"pointer",textAlign:"center",textDecoration:"none",marginBottom:10,boxSizing:"border-box"}}>
          📲 J'ai payé — Envoyer la preuve sur WhatsApp
        </a>
        <button onClick={onHaveCode} style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px solid ${C.primary}`,background:"transparent",color:C.primary,fontWeight:700,fontSize:13,cursor:"pointer"}}>
          J'ai déjà un code d'activation →
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
function AuthPage({mode,onAuth,onBack,onNeedPayment}){
  const[tab,setTab]=useState(mode);
  const[form,setForm]=useState({nom:"",tel:"",pin:"",pin2:"",code:""});
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);

  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const submit=async()=>{
    setErr(""); setLoading(true);
    await new Promise(r=>setTimeout(r,500));
    if(tab==="signup"){
      if(!form.nom.trim()||!form.tel.trim()||!form.pin||!form.code){setErr("Remplissez tous les champs.");setLoading(false);return;}
      if(form.pin.length<4){setErr("PIN minimum 4 chiffres.");setLoading(false);return;}
      if(form.pin!==form.pin2){setErr("Les PIN ne correspondent pas.");setLoading(false);return;}
      const users=lsGet("vv_users")||{};
      if(users[form.tel]){setErr("Ce numéro est déjà inscrit.");setLoading(false);return;}
      const result=useActivationCode(form.code.trim(),{nom:form.nom,tel:form.tel});
      if(!result.ok){setErr(result.error);setLoading(false);return;}
      const user={id:Date.now(),nom:form.nom,tel:form.tel,plan:result.planId,subscribed:true,createdAt:new Date().toISOString()};
      users[form.tel]=user;
      lsSet("vv_users",users);
      const pins=lsGet("vv_pins")||{};
      pins[form.tel]=form.pin;
      lsSet("vv_pins",pins);
      onAuth(user);
    }else{
      if(!form.tel||!form.pin){setErr("Entrez votre numéro et PIN.");setLoading(false);return;}
      const users=lsGet("vv_users")||{};
      const pins=lsGet("vv_pins")||{};
      const user=users[form.tel];
      if(!user){setErr("Numéro non trouvé.");setLoading(false);return;}
      if(pins[form.tel]!==form.pin){setErr("PIN incorrect.");setLoading(false);return;}
      onAuth(user);
    }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:440,margin:"0 auto"}}>
      <div style={{background:C.primary,padding:"20px 20px 24px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:13,marginBottom:16,padding:0}}>← Retour</button>
        <div style={{fontSize:24,fontWeight:900,color:"#FFF"}}>🛒 VenteVoix</div>
      </div>
      <div style={{display:"flex",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        {[["signup","Créer un compte"],["login","Se connecter"]].map(([k,l])=>(
          <button key={k} onClick={()=>{setTab(k);setErr("");}} style={{flex:1,padding:"13px 0",border:"none",cursor:"pointer",background:tab===k?C.bg:C.surface,fontWeight:tab===k?700:400,color:tab===k?C.primary:C.muted,borderBottom:tab===k?`3px solid ${C.primary}`:"3px solid transparent",fontSize:14}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"20px"}}>
        {tab==="signup"&&<div style={{background:"#F0FDF4",border:`1px solid ${C.primaryLight}`,borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.primary}}>✅ Entrez le code reçu par WhatsApp après paiement</div>}
        {[
          tab==="signup"?["Nom complet *","nom","text","Jean Kouamé"]:null,
          ["Numéro téléphone *","tel","tel","+225 07 00 00 00"],
          tab==="signup"?["Code d'activation *","code","text","ex: TEST01"]:null,
          ["Code PIN (4+ chiffres) *","pin","password","••••"],
          tab==="signup"?["Confirmer PIN *","pin2","password","••••"]:null,
        ].filter(Boolean).map(([lbl,key,type,ph])=>(
          <div key={key} style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>{lbl}</div>
            <input type={type} placeholder={ph} value={form[key]} onChange={set(key)} onKeyDown={e=>e.key==="Enter"&&submit()}
              style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        {err&&<div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,padding:"10px 14px",color:C.danger,fontSize:13,marginBottom:14}}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?"#9CA3AF":C.primary,color:"#FFF",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer"}}>
          {loading?"...":(tab==="signup"?"Activer mon compte →":"Se connecter →")}
        </button>
        {tab==="signup"&&<button onClick={onNeedPayment} style={{width:"100%",padding:"12px",borderRadius:12,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontWeight:600,fontSize:13,cursor:"pointer",marginTop:10}}>Je n'ai pas encore payé → QR codes</button>}
      </div>
      <style>{`input:focus{border-color:#1B4332!important;box-shadow:0 0 0 3px rgba(27,67,50,.12);}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════════════════════
function AdminPanel({onClose}){
  const[pin,setPin]=useState("");
  const[auth,setAuth]=useState(false);
  const[codes,setCodes]=useState({});
  const[plan,setPlan]=useState("pro");
  const[note,setNote]=useState("");
  const[newCode,setNewCode]=useState(null);
  const[copied,setCopied]=useState(null);
  const config=getConfig();

  const login=()=>{
    if(pin===config.ADMIN_PIN){setAuth(true);setCodes(getCodes());}
    else alert("PIN incorrect");
  };
  const generate=()=>{
    const c=createCode(plan,note);
    setNewCode(c); setNote(""); setCodes(getCodes());
  };
  const copyMsg=code=>{
    const p=PLANS.find(x=>x.id===codes[code]?.planId);
    const msg=`🛒 *VenteVoix — Accès activé !*\n\nBonjour !\n\n🔑 Code : *${code}*\n📦 Plan : *${p?.name}*\n🔗 Lien : ${config.APP_URL}\n\n1️⃣ Ouvrez le lien\n2️⃣ Créez un compte\n3️⃣ Entrez le code *${code}*\n\nBienvenue sur VenteVoix ! 🎉`;
    navigator.clipboard.writeText(msg).then(()=>{setCopied(code);setTimeout(()=>setCopied(null),2000);});
  };

  const all=Object.entries(codes);
  const unused=all.filter(([,v])=>!v.used);
  const used=all.filter(([,v])=>v.used);

  if(!auth) return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,padding:28,maxWidth:320,width:"100%",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.12)"}}>
        <div style={{fontSize:40,marginBottom:12}}>🔐</div>
        <div style={{fontWeight:800,fontSize:18,marginBottom:20,color:C.primary}}>Panneau Admin</div>
        <input type="password" placeholder="Code PIN admin" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
          style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:16,boxSizing:"border-box",outline:"none",textAlign:"center",letterSpacing:4,marginBottom:14}}/>
        <button onClick={login} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:C.primary,color:"#FFF",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:10}}>Entrer</button>
        <button onClick={onClose} style={{width:"100%",padding:"11px",borderRadius:12,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontWeight:600,fontSize:13,cursor:"pointer"}}>Annuler</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:480,margin:"0 auto"}}>
      <div style={{background:C.primary,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:17,fontWeight:800,color:"#FFF"}}>🔐 Admin VenteVoix</div><div style={{fontSize:11,color:C.primaryLight}}>Gestion codes d'activation</div></div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"6px 12px",color:"#FFF",fontSize:12,cursor:"pointer"}}>Fermer</button>
      </div>
      <div style={{padding:"16px"}}>
        <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.primary}}>➕ Générer un code</div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {PLANS.map(p=><button key={p.id} onClick={()=>setPlan(p.id)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`2px solid ${plan===p.id?p.color:C.border}`,background:plan===p.id?`${p.color}20`:"transparent",color:plan===p.id?p.color:C.muted,fontWeight:plan===p.id?700:400,fontSize:11,cursor:"pointer"}}>{p.name}</button>)}
          </div>
          <input type="text" placeholder="Note (nom client)" value={note} onChange={e=>setNote(e.target.value)}
            style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none",marginBottom:10}}/>
          <button onClick={generate} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:C.primary,color:"#FFF",fontWeight:700,fontSize:14,cursor:"pointer"}}>🎲 Générer</button>
          {newCode&&(
            <div style={{marginTop:12,background:"#D1FAE5",border:`2px solid ${C.primary}`,borderRadius:12,padding:14,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.primary,marginBottom:4}}>✅ Code généré</div>
              <div style={{fontSize:34,fontWeight:900,color:C.primary,letterSpacing:4,marginBottom:8}}>{newCode}</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>{PLANS.find(p=>p.id===plan)?.name}</div>
              <button onClick={()=>copyMsg(newCode)} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:copied===newCode?"#10B981":C.primary,color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                {copied===newCode?"✅ Copié ! Collez dans WhatsApp":"📋 Copier le message WhatsApp"}
              </button>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[[unused.length,"Disponibles"],[used.length,"Utilisés"],[all.length,"Total"]].map(([n,l])=>(
            <div key={l} style={{flex:1,background:C.surface,borderRadius:12,padding:"12px",textAlign:"center",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:22,fontWeight:800,color:C.primary}}>{n}</div>
              <div style={{fontSize:10,color:C.muted}}>{l}</div>
            </div>
          ))}
        </div>
        {unused.length>0&&(
          <div style={{background:C.surface,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:C.primary}}>🟢 Disponibles ({unused.length})</div>
            {unused.map(([code,info])=>(
              <div key={code} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontWeight:800,fontSize:16,letterSpacing:2,color:C.primary}}>{code}</div>
                  <div style={{fontSize:10,color:C.muted}}>{PLANS.find(p=>p.id===info.planId)?.name} · {info.note||"Sans note"}</div>
                </div>
                <button onClick={()=>copyMsg(code)} style={{background:copied===code?"#10B981":C.primaryMid,border:"none",borderRadius:8,padding:"6px 12px",color:"#FFF",fontSize:11,cursor:"pointer",fontWeight:600}}>
                  {copied===code?"✅":"📋 Copier"}
                </button>
              </div>
            ))}
          </div>
        )}
        {used.length>0&&(
          <div style={{background:C.surface,borderRadius:14,padding:14,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:C.muted}}>⚫ Utilisés ({used.length})</div>
            {used.map(([code,info])=>(
              <div key={code} style={{padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:700,fontSize:13,letterSpacing:2,color:C.muted,textDecoration:"line-through"}}>{code}</span>
                  <span style={{fontSize:10,color:C.primaryLight,fontWeight:600}}>{PLANS.find(p=>p.id===info.planId)?.name}</span>
                </div>
                <div style={{fontSize:10,color:C.muted}}>{info.usedBy?.nom||"?"} · {info.usedAt?new Date(info.usedAt).toLocaleDateString("fr-FR"):""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`input:focus{border-color:#1B4332!important;}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════
function AppVenteVoix({user,onLogout,onAdmin,plan}){
  const[transactions,setTransactions]=useState(()=>lsGet(`vv_tx_${user.id}`)||[]);
  const[stock,setStock]=useState(()=>lsGet(`vv_stk_${user.id}`)||[]);
  const[etat,setEtat]=useState("idle");
  const[transcription,setTranscription]=useState("");
  const[interpretation,setInterpretation]=useState(null);
  const[erreur,setErreur]=useState("");
  const[onglet,setOnglet]=useState("accueil");
  const[showStockForm,setShowStockForm]=useState(false);
  const[newArt,setNewArt]=useState({nom:"",quantite:"",prixVente:"",seuil:"5"});
  const[showRapport,setShowRapport]=useState(false);
  const[showParams,setShowParams]=useState(false);
  const recognRef=useRef(null);
  const synth=useRef(window.speechSynthesis);

  const KEY_TX=`vv_tx_${user.id}`;
  const KEY_STK=`vv_stk_${user.id}`;

  const saveTx=useCallback(l=>{ lsSet(KEY_TX,l); },[KEY_TX]);
  const saveStk=useCallback(l=>{ lsSet(KEY_STK,l); },[KEY_STK]);
  const parler=useCallback(t=>{
    synth.current?.cancel();
    const u=new SpeechSynthesisUtterance(t);
    u.lang="fr-FR"; u.rate=.95;
    synth.current?.speak(u);
  },[]);

  // Rapport automatique
  useEffect(()=>{
    const check=async()=>{
      const cfg=getConfig();
      if(!cfg.RAPPORT_ACTIF) return;
      const now=new Date();
      if(now.getHours()===cfg.RAPPORT_HEURE&&now.getMinutes()===cfg.RAPPORT_MINUTE){
        const today=now.toDateString();
        if(localStorage.getItem("vv_last_rapport")===today) return;
        localStorage.setItem("vv_last_rapport",today);
        const txJ=filtrerParPeriode(transactions,"aujourd'hui");
        const texte=await genererRapportTexte(txJ,stock,"d'aujourd'hui");
        const lienAudio=creerLienAudio(texte,cfg);
        if("Notification" in window&&Notification.permission==="granted"){
          new Notification("🛒 VenteVoix — Bilan du jour",{body:texte.slice(0,80)+"…"});
        }
        const u=new SpeechSynthesisUtterance(texte);
        u.lang="fr-FR"; u.rate=0.9;
        u.onend=()=>{
          const tv=txJ.filter(t=>t.type==="vente").reduce((s,t)=>s+t.montant,0);
          const td=txJ.filter(t=>t.type==="depense").reduce((s,t)=>s+t.montant,0);
          const stats={tv,td,nv:txJ.filter(t=>t.type==="vente").length,nd:txJ.filter(t=>t.type==="depense").length};
          window.open(`https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${creerMessageWhatsApp(texte,lienAudio,stats,"d'aujourd'hui")}`,"_blank");
        };
        synth.current?.speak(u);
      }
    };
    const interval=setInterval(check,60000);
    if("Notification" in window&&Notification.permission==="default") Notification.requestPermission();
    return()=>clearInterval(interval);
  },[transactions,stock]);

  const demarrer=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setErreur("Utilisez Chrome pour la reconnaissance vocale.");setEtat("erreur");return;}
    const rec=new SR();
    rec.lang="fr-FR"; rec.interimResults=false; rec.maxAlternatives=1;
    recognRef.current=rec;
    rec.onstart=()=>setEtat("ecoute");
    rec.onerror=e=>{setEtat("erreur");setErreur("Erreur micro : "+e.error);};
    rec.onresult=async e=>{
      const t=e.results[0][0].transcript;
      setTranscription(t); setEtat("analyse");
      const res=await interpreterVoix(t,stock);
      setInterpretation(res); setEtat("confirmation");
      parler(res.confirmation??"Voici ce que j'ai compris.");
    };
    rec.start();
  },[stock,parler]);

  const valider=useCallback(()=>{
    if(!interpretation||interpretation.type==="inconnu"){annuler();return;}
    const tx={
      id:Date.now(), date:new Date().toISOString(),
      type:interpretation.type, description:interpretation.description??"—",
      quantite:interpretation.quantite, prixUnitaire:interpretation.prixUnitaire,
      montant:interpretation.montantTotal??0, texteOriginal:transcription,
    };
    const nl=[tx,...transactions];
    setTransactions(nl); saveTx(nl);
    if(interpretation.articleStock){
      const art=interpretation.articleStock.toLowerCase();
      const ns=stock.map(s=>{
        if(s.nom.toLowerCase()===art){
          const d=interpretation.type==="vente"?-(interpretation.quantite??1):interpretation.type==="stock_entree"?(interpretation.quantite??1):0;
          return{...s,quantite:Math.max(0,(s.quantite??0)+d)};
        }
        return s;
      });
      setStock(ns); saveStk(ns);
    }
    setEtat("idle"); setInterpretation(null); setTranscription("");
    parler("Enregistré !");
  },[interpretation,transactions,stock,transcription,saveTx,saveStk,parler]);

  const annuler=useCallback(()=>{
    setEtat("idle"); setInterpretation(null); setTranscription("");
    parler("Annulé.");
  },[parler]);

  const tv=transactions.filter(t=>t.type==="vente").reduce((s,t)=>s+t.montant,0);
  const td=transactions.filter(t=>t.type==="depense").reduce((s,t)=>s+t.montant,0);
  const stats={tv,td,nv:transactions.filter(t=>t.type==="vente").length,nd:transactions.filter(t=>t.type==="depense").length};
  const articlesBas=stock.filter(a=>(a.quantite??0)<=(a.seuil??5));
  const canStock=["pro","business"].includes(plan?.id);
  const config=getConfig();

  const ajouterArt=()=>{
    if(!newArt.nom.trim()) return;
    const a={id:Date.now(),nom:newArt.nom.trim(),quantite:parseInt(newArt.quantite)||0,prixVente:parseInt(newArt.prixVente)||0,seuil:parseInt(newArt.seuil)||5};
    const ns=[...stock,a]; setStock(ns); saveStk(ns);
    setNewArt({nom:"",quantite:"",prixVente:"",seuil:"5"}); setShowStockForm(false);
  };
  const suppTx=id=>{ const nl=transactions.filter(t=>t.id!==id); setTransactions(nl); saveTx(nl); };
  const suppArt=id=>{ const ns=stock.filter(a=>a.id!==id); setStock(ns); saveStk(ns); };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:480,margin:"0 auto"}}>
      {showRapport&&<EcranRapport transactions={transactions} stock={stock} onClose={()=>setShowRapport(false)}/>}
      {showParams&&<EcranParametres onClose={()=>setShowParams(false)}/>}

      {/* Header */}
      <div style={{background:C.primary,padding:"13px 13px 9px",position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 12px rgba(0,0,0,.15)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>🛒</span>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:"#FFF",letterSpacing:-.5}}>VenteVoix</div>
              <div style={{fontSize:10,color:C.primaryLight}}>Bonjour {user.nom.split(" ")[0]} · {plan?.name??user.plan}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <button onClick={()=>setShowRapport(true)} style={{background:"rgba(212,160,23,.3)",border:"none",borderRadius:8,padding:"5px 8px",color:"#FFF",fontSize:11,cursor:"pointer",fontWeight:700}}>📊 Bilan</button>
            <button onClick={()=>setShowParams(true)} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"5px 8px",color:"rgba(255,255,255,.8)",fontSize:14,cursor:"pointer"}}>⚙️</button>
            <button onClick={onAdmin} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"5px 8px",color:"rgba(255,255,255,.7)",fontSize:13,cursor:"pointer"}}>🔐</button>
            <button onClick={onLogout} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"5px 8px",color:"rgba(255,255,255,.7)",fontSize:11,cursor:"pointer"}}>⏏</button>
          </div>
        </div>
        {articlesBas.length>0&&canStock&&<div style={{marginTop:6,background:"rgba(212,160,23,.2)",borderRadius:8,padding:"4px 12px",fontSize:11,color:C.accentLight,fontWeight:600}}>⚠️ Stock faible : {articlesBas.map(a=>a.nom).join(", ")}</div>}
        {config.RAPPORT_ACTIF&&<div style={{marginTop:4,fontSize:10,color:"rgba(255,255,255,.4)",textAlign:"right"}}>⏰ Rapport auto à {String(config.RAPPORT_HEURE).padStart(2,"0")}h{String(config.RAPPORT_MINUTE).padStart(2,"0")}</div>}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        {[["accueil","🏠"],["historique","📋"],canStock&&["stock","📦"]].filter(Boolean).map(([k,icon])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 0",border:"none",cursor:"pointer",background:onglet===k?C.bg:C.surface,fontWeight:onglet===k?700:400,color:onglet===k?C.primary:C.muted,borderBottom:onglet===k?`3px solid ${C.primary}`:"3px solid transparent",fontSize:12}}>
            {icon} {k.charAt(0).toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      <div style={{padding:"14px 14px 100px"}}>

        {/* ACCUEIL */}
        {onglet==="accueil"&&<>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <StatCard label="Ventes" value={fmt(tv)} color={C.primary} sub={`${stats.nv} op.`}/>
            <StatCard label="Dépenses" value={fmt(td)} color={C.danger} sub={`${stats.nd} op.`}/>
          </div>
          <div style={{marginBottom:12}}><StatCard label="Bénéfice net" value={fmt(tv-td)} color={(tv-td)>=0?C.primary:C.danger}/></div>
          <button onClick={()=>setShowRapport(true)} style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px solid ${C.primary}`,background:"transparent",color:C.primary,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            🎙️ Rapport audio — Bilan & WhatsApp
          </button>
          <div style={{background:C.surface,borderRadius:18,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,.08)",textAlign:"center"}}>
            {etat==="idle"&&<>
              <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Parlez pour enregistrer une vente, dépense ou entrée de stock</div>
              <div style={{fontSize:11,color:C.muted,background:C.bg,borderRadius:10,padding:"10px 12px",marginBottom:16,textAlign:"left",lineHeight:1.9}}>
                <b style={{color:C.text}}>Exemples :</b><br/>
                🗣 "Vendu 5 savons à 300 francs"<br/>
                🗣 "Reçu 20 pagnes pour le stock"<br/>
                🗣 "Dépensé 5 000 pour le transport"
              </div>
              <button onClick={demarrer} style={{width:84,height:84,borderRadius:"50%",background:`linear-gradient(135deg,${C.mic},#FF8E53)`,border:"none",cursor:"pointer",fontSize:32,boxShadow:"0 6px 20px rgba(220,38,38,.4)"}}>🎤</button>
              <div style={{marginTop:10,fontSize:11,color:C.muted}}>Appuyez pour parler</div>
            </>}
            {etat==="ecoute"&&<>
              <div style={{fontSize:14,fontWeight:700,color:C.mic,marginBottom:14}}>🔴 Je vous écoute…</div>
              <button onClick={()=>recognRef.current?.stop()} style={{width:84,height:84,borderRadius:"50%",background:C.mic,border:"4px solid #FF8E53",cursor:"pointer",fontSize:26,color:"#FFF"}}>⏹</button>
            </>}
            {etat==="analyse"&&<>
              <div style={{fontSize:34,marginBottom:10}}>⚙️</div>
              <div style={{fontWeight:700,marginBottom:6}}>Analyse…</div>
              <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>"{transcription}"</div>
            </>}
            {etat==="confirmation"&&interpretation&&<>
              <div style={{fontSize:12,color:C.muted,fontStyle:"italic",marginBottom:12}}>"{transcription}"</div>
              <div style={{background:interpretation.type==="vente"?"#D1FAE5":interpretation.type==="depense"?"#FEE2E2":"#DBEAFE",borderRadius:12,padding:14,marginBottom:14,textAlign:"left"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}><Badge type={interpretation.type}/></div>
                {interpretation.description&&<Row l="Article" v={interpretation.description}/>}
                {interpretation.quantite&&<Row l="Quantité" v={interpretation.quantite}/>}
                {interpretation.prixUnitaire&&<Row l="Prix unitaire" v={fmt(interpretation.prixUnitaire)}/>}
                <Row l="Montant total" v={fmt(interpretation.montantTotal??0)} bold/>
              </div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>🔊 {interpretation.confirmation}</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={annuler} style={btnS(C.danger,"#FFF")}>✗ Annuler</button>
                <button onClick={valider} style={btnS(C.primary,"#FFF")}>✓ Confirmer</button>
              </div>
            </>}
            {etat==="erreur"&&<>
              <div style={{fontSize:34,marginBottom:10}}>⚠️</div>
              <div style={{color:C.danger,fontWeight:700,marginBottom:14}}>{erreur}</div>
              <button onClick={()=>setEtat("idle")} style={btnS(C.primary,"#FFF")}>Réessayer</button>
            </>}
          </div>
        </>}

        {/* HISTORIQUE */}
        {onglet==="historique"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15}}>Transactions ({transactions.length})</div>
            {transactions.length>0&&<button onClick={()=>{setTransactions([]);saveTx([]);}} style={{fontSize:11,color:C.danger,background:"none",border:`1px solid ${C.danger}`,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Effacer tout</button>}
          </div>
          {transactions.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40}}><div style={{fontSize:36,marginBottom:10}}>📭</div>Aucune transaction.</div>}
          {transactions.map(tx=>(
            <div key={tx.id} style={{background:C.surface,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderLeft:`4px solid ${tx.type==="vente"?C.primary:tx.type==="depense"?C.danger:"#1D4ED8"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}><Badge type={tx.type}/><span style={{fontSize:13,fontWeight:600}}>{tx.description}</span></div>
                  {tx.quantite&&<div style={{fontSize:11,color:C.muted}}>{tx.quantite} × {fmt(tx.prixUnitaire??0)}</div>}
                  <div style={{fontSize:10,color:C.muted,marginTop:2,fontStyle:"italic"}}>"{tx.texteOriginal}"</div>
                  <div style={{fontSize:10,color:C.muted}}>{new Date(tx.date).toLocaleString("fr-FR")}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,fontSize:15,color:tx.type==="vente"?C.primary:tx.type==="depense"?C.danger:"#1D4ED8"}}>{tx.type==="vente"?"+":"−"}{fmt(tx.montant)}</div>
                  <button onClick={()=>suppTx(tx.id)} style={{marginTop:5,border:"none",background:"none",color:C.muted,cursor:"pointer",fontSize:15}}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </>}

        {/* STOCK */}
        {onglet==="stock"&&canStock&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15}}>Stock ({stock.length})</div>
            <button onClick={()=>setShowStockForm(!showStockForm)} style={{background:C.primary,border:"none",borderRadius:10,padding:"7px 14px",color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Ajouter</button>
          </div>
          {showStockForm&&(
            <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 4px 14px rgba(0,0,0,.08)"}}>
              {[["Nom *","nom","text"],["Quantité","quantite","number"],["Prix vente (F)","prixVente","number"],["Seuil alerte","seuil","number"]].map(([l,k,t])=>(
                <div key={k} style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{l}</div>
                  <input type={t} value={newArt[k]} onChange={e=>setNewArt(p=>({...p,[k]:e.target.value}))} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
                </div>
              ))}
              <div style={{display:"flex",gap:10,marginTop:12}}>
                <button onClick={()=>setShowStockForm(false)} style={btnS("#F3F4F6",C.muted)}>Annuler</button>
                <button onClick={ajouterArt} style={btnS(C.primary,"#FFF")}>✓ Ajouter</button>
              </div>
            </div>
          )}
          {stock.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40}}><div style={{fontSize:36,marginBottom:10}}>📦</div>Aucun article.</div>}
          {stock.map(art=>{
            const f=(art.quantite??0)<=(art.seuil??5);
            return(
              <div key={art.id} style={{background:C.surface,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderLeft:`4px solid ${f?C.accent:C.primary}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{art.nom}</div>
                    <div style={{fontSize:12,color:C.muted}}>Prix : {fmt(art.prixVente??0)} · Valeur : {fmt((art.quantite??0)*(art.prixVente??0))}</div>
                    {f&&<div style={{fontSize:11,color:C.accent,fontWeight:700,marginTop:3}}>⚠️ Faible (seuil : {art.seuil})</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:24,fontWeight:800,color:f?C.accent:C.primary}}>{art.quantite??0}</div>
                    <div style={{display:"flex",gap:5,marginTop:5}}>
                      <button onClick={()=>{const ns=stock.map(a=>a.id===art.id?{...a,quantite:(a.quantite??0)+1}:a);setStock(ns);saveStk(ns);}} style={{border:`1px solid ${C.primary}`,background:"none",borderRadius:6,padding:"2px 9px",cursor:"pointer",color:C.primary,fontWeight:700}}>+</button>
                      <button onClick={()=>{const ns=stock.map(a=>a.id===art.id?{...a,quantite:Math.max(0,(a.quantite??0)-1)}:a);setStock(ns);saveStk(ns);}} style={{border:`1px solid ${C.muted}`,background:"none",borderRadius:6,padding:"2px 9px",cursor:"pointer",color:C.muted,fontWeight:700}}>−</button>
                      <button onClick={()=>suppArt(art.id)} style={{border:"none",background:"none",cursor:"pointer",color:C.muted,fontSize:15}}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {stock.length>0&&<div style={{background:C.surface,borderRadius:12,padding:14,marginTop:8}}>
            <div style={{fontWeight:700,marginBottom:6,color:C.primary}}>Valeur totale du stock</div>
            <div style={{fontSize:22,fontWeight:800,color:C.primary}}>{fmt(stock.reduce((s,a)=>s+(a.quantite??0)*(a.prixVente??0),0))}</div>
          </div>}
        </>}
      </div>
      <style>{`input:focus{border-color:#1B4332!important;box-shadow:0 0 0 3px rgba(27,67,50,.12);}button:active{opacity:.85;transform:scale(.97);}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function Root(){
  const[screen,setScreen]=useState("landing");
  const[selectedPlan,setSelectedPlan]=useState("pro");
  const[currentUser,setCurrentUser]=useState(null);
  const[showAdmin,setShowAdmin]=useState(false);

  const isAudioLink=new URLSearchParams(window.location.search).has("audio");

  useEffect(()=>{
    if(isAudioLink) return;
    const u=lsGet("vv_session");
    if(u){setCurrentUser(u);setScreen("app");}
  },[]);

  if(isAudioLink) return <LecteurAudio/>;

  const onSignup=planId=>{setSelectedPlan(planId);setScreen("payment");};
  const onLogin=()=>setScreen("auth_login");
  const onAuth=user=>{setCurrentUser(user);lsSet("vv_session",user);setScreen("app");};
  const onLogout=()=>{localStorage.removeItem("vv_session");setCurrentUser(null);setScreen("landing");};
  const planObj=PLANS.find(p=>p.id===(currentUser?.plan??selectedPlan))??PLANS[1];

  if(showAdmin) return<AdminPanel onClose={()=>setShowAdmin(false)}/>;
  if(screen==="landing")     return<LandingPage onSignup={onSignup} onLogin={onLogin}/>;
  if(screen==="payment")     return<PaymentPage planId={selectedPlan} onHaveCode={()=>setScreen("auth_signup")} onBack={()=>setScreen("landing")}/>;
  if(screen==="auth_signup") return<AuthPage mode="signup" onAuth={onAuth} onBack={()=>setScreen("payment")} onNeedPayment={()=>setScreen("payment")}/>;
  if(screen==="auth_login")  return<AuthPage mode="login"  onAuth={onAuth} onBack={()=>setScreen("landing")} onNeedPayment={()=>setScreen("payment")}/>;
  if(screen==="app"&&currentUser) return<AppVenteVoix user={currentUser} plan={planObj} onLogout={onLogout} onAdmin={()=>setShowAdmin(true)}/>;
  return null;
}
