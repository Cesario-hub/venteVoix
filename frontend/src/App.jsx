import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG — remplacez BACKEND_URL par votre URL déployée
// ══════════════════════════════════════════════════════════════════════════════
const BACKEND_URL = "http://localhost:4000"; // → ex: https://venteVoix.railway.app

// ══════════════════════════════════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  bg:"#FAF6F0", surface:"#FFFFFF",
  primary:"#1B4332", primaryMid:"#2D6A4F", primaryLight:"#52B788",
  accent:"#D4A017", accentLight:"#F6E27F",
  danger:"#B91C1C", text:"#111827", muted:"#6B7280", border:"#E8E0D5",
  mic:"#DC2626",
  mtn:"#FFCC00",   // MTN jaune
  wave:"#1A6BFF",  // Wave bleu
  stripe:"#635BFF",// Stripe violet
};

const PLANS = [
  { id:"starter",  name:"Démarrage", price:"2 000",  period:"/mois", color:C.primaryLight,
    badge:null, usd:"$3",
    features:["Enregistrement vocal illimité","Tableau de bord ventes & dépenses","Export Excel","1 utilisateur"] },
  { id:"pro",      name:"Pro",       price:"5 000",  period:"/mois", color:C.primary,
    badge:"⭐ Populaire", usd:"$8",
    features:["Tout Démarrage inclus","Gestion de stock complète","Export Excel + PDF","Alertes stock faible","3 utilisateurs","Support WhatsApp"] },
  { id:"business", name:"Business",  price:"12 000", period:"/mois", color:C.accent,
    badge:"🏆 Complet", usd:"$18",
    features:["Tout Pro inclus","Multi-boutiques illimité","Rapport mensuel auto","Historique 2 ans","Utilisateurs illimités","Support prioritaire"] },
];

// ══════════════════════════════════════════════════════════════════════════════
// CLAUDE API
// ══════════════════════════════════════════════════════════════════════════════
async function interpreterVoix(texte, stockItems) {
  const sys=`Tu es assistant comptable secteur informel africain. Articles stock: ${stockItems.map(s=>s.nom).join(",")||"aucun"}.
Réponds UNIQUEMENT en JSON: {"type":"vente"|"depense"|"stock_entree"|"inconnu","description":"...","quantite":n|null,"prixUnitaire":n|null,"montantTotal":n,"articleStock":"nom"|null,"confirmation":"phrase naturelle"}
JSON pur seulement.`;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:400,system:sys,messages:[{role:"user",content:texte}]})});
  const d=await r.json();
  try{return JSON.parse(d.content?.[0]?.text?.replace(/```json|```/g,"").trim()??"{}");} catch{return {type:"inconnu",confirmation:"Je n'ai pas compris."};}
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
const fmt=n=>new Intl.NumberFormat("fr-FR").format(n)+" F";
function exportExcel(tx,stk,stats){
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["VenteVoix Rapport"],[new Date().toLocaleString("fr-FR")],[],
    ["Indicateur","Montant","Ops"],["Ventes",stats.tv,stats.nv],["Dépenses",stats.td,stats.nd],["Bénéfice",stats.tv-stats.td,""]]),"Résumé");
  const tr=[["Date","Type","Description","Qté","PU","Montant","Texte vocal"]];
  tx.forEach(t=>tr.push([t.date?new Date(t.date).toLocaleString("fr-FR"):"",t.type==="vente"?"VENTE":"DÉPENSE",t.description??"",t.quantite??"",t.prixUnitaire??"",t.montant,t.texteOriginal??""]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(tr),"Transactions");
  const sr=[["Article","Qté","Prix vente","Valeur","Statut"]];
  stk.forEach(a=>{const q=a.quantite??0;sr.push([a.nom,q,a.prixVente??0,q*(a.prixVente??0),q<=(a.seuil??5)?"⚠️ Faible":"✅ OK"]);});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sr),"Stock");
  XLSX.writeFile(wb,`VenteVoix_${new Date().toISOString().slice(0,10)}.xlsx`);
}
function exportPDF(tx,stk,stats){
  const txR=tx.slice(0,60).map(t=>`<tr class="${t.type}"><td>${t.date?new Date(t.date).toLocaleDateString("fr-FR"):""}</td><td><b>${t.type==="vente"?"VENTE":"DÉPENSE"}</b></td><td>${t.description??""}</td><td style="text-align:right;font-weight:700">${fmt(t.montant)}</td></tr>`).join("");
  const sR=stk.map(a=>{const q=a.quantite??0,f=q<=(a.seuil??5);return`<tr><td>${a.nom}</td><td>${q}</td><td style="text-align:right">${fmt(a.prixVente??0)}</td><td style="text-align:right">${fmt(q*(a.prixVente??0))}</td><td>${f?"⚠️":"✅"}</td></tr>`;}).join("");
  const w=window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport VenteVoix</title><style>body{font-family:Arial;padding:24px;max-width:900px;margin:auto}h1{color:#1B4332}h2{color:#1B4332;border-bottom:2px solid #D1FAE5;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px}th{background:#1B4332;color:#fff;padding:7px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #E8E0D5}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.sbox{border:1px solid #E8E0D5;border-radius:8px;padding:12px}.sl{font-size:10px;color:#6B7280;text-transform:uppercase}.sv{font-size:18px;font-weight:800}.green{color:#1B4332}.red{color:#B91C1C}</style></head><body>
<h1>🛒 VenteVoix — Rapport</h1><p style="color:#6B7280;font-size:11px">Généré le ${new Date().toLocaleString("fr-FR")}</p>
<h2>Résumé</h2><div class="stats"><div class="sbox"><div class="sl">Ventes (${stats.nv})</div><div class="sv green">${fmt(stats.tv)}</div></div><div class="sbox"><div class="sl">Dépenses (${stats.nd})</div><div class="sv red">${fmt(stats.td)}</div></div><div class="sbox"><div class="sl">Bénéfice</div><div class="sv ${stats.tv-stats.td>=0?"green":"red"}">${fmt(stats.tv-stats.td)}</div></div></div>
<h2>Transactions</h2><table><tr><th>Date</th><th>Type</th><th>Description</th><th>Montant</th></tr>${txR}</table>
${stk.length?`<h2>Stock</h2><table><tr><th>Article</th><th>Qté</th><th>Prix</th><th>Valeur</th><th>Statut</th></tr>${sR}</table>`:""}</body></html>`);
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
function Row({l,v,bold}){return<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#6B7280"}}>{l}</span><span style={{fontSize:12,fontWeight:bold?800:500}}>{v}</span></div>;}
function StatCard({label,value,color,sub}){return<div style={{background:C.surface,borderRadius:14,padding:"13px 15px",boxShadow:"0 2px 8px rgba(0,0,0,.07)",flex:1,minWidth:90}}><div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>{label}</div><div style={{fontSize:19,fontWeight:800,color:color??C.text}}>{value}</div>{sub&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{sub}</div>}</div>;}
function btnS(bg,color,x={}){return{flex:1,padding:"11px 0",borderRadius:12,border:"none",background:bg,color,fontWeight:700,fontSize:14,cursor:"pointer",...x};}
function Spinner(){return<div style={{width:22,height:22,border:`3px solid rgba(255,255,255,0.3)`,borderTop:"3px solid #FFF",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>;}

// ══════════════════════════════════════════════════════════════════════════════
// ÉCRAN PAIEMENT — MTN MoMo + Wave + Stripe
// ══════════════════════════════════════════════════════════════════════════════
function PaymentScreen({ plan, user, onSuccess, onBack }) {
  const [method, setMethod]   = useState(null);   // "momo"|"wave"|"stripe"
  const [phone, setPhone]     = useState("");
  const [status, setStatus]   = useState("idle"); // idle|loading|pending|polling|success|error
  const [message, setMessage] = useState("");
  const [refId, setRefId]     = useState(null);
  const pollRef = useRef(null);

  const planInfo = PLANS.find(p=>p.id===plan) ?? PLANS[1];

  const stopPolling = () => { if(pollRef.current) { clearInterval(pollRef.current); pollRef.current=null; } };

  // ── Lancer le paiement ────────────────────────────────────────────────────
  const pay = async () => {
    if (!method) { setMessage("Choisissez un mode de paiement."); return; }
    setStatus("loading"); setMessage("");

    try {
      // ── MTN MoMo ──────────────────────────────────────────────────────────
      if (method === "momo") {
        if (!phone.trim()) { setMessage("Entrez votre numéro MTN MoMo."); setStatus("idle"); return; }
        const r = await fetch(`${BACKEND_URL}/api/momo/request-payment`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ planId: plan, userId: user.id, phoneNumber: phone }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur MoMo");
        setRefId(d.referenceId);
        setStatus("pending");
        setMessage("📱 Une notification a été envoyée sur votre téléphone. Entrez votre PIN MTN MoMo pour confirmer.");
        // Polling toutes les 3s pendant 3 minutes max
        let tries = 0;
        pollRef.current = setInterval(async () => {
          tries++;
          if (tries > 60) { stopPolling(); setStatus("error"); setMessage("Délai expiré. Réessayez."); return; }
          const sr = await fetch(`${BACKEND_URL}/api/momo/status/${d.referenceId}`).then(r=>r.json());
          if (sr.status === "SUCCESSFUL") { stopPolling(); setStatus("success"); onSuccess("momo"); }
          if (sr.status === "FAILED")     { stopPolling(); setStatus("error"); setMessage("Paiement refusé par MTN MoMo."); }
        }, 3000);
      }

      // ── Wave ──────────────────────────────────────────────────────────────
      if (method === "wave") {
        const r = await fetch(`${BACKEND_URL}/api/wave/create-checkout`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ planId: plan, userId: user.id }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur Wave");
        // Ouvre Wave dans un nouvel onglet
        window.open(d.url, "_blank");
        setRefId(d.sessionId);
        setStatus("pending");
        setMessage("🌊 Complétez le paiement dans l'onglet Wave qui vient de s'ouvrir. Cette page se mettra à jour automatiquement.");
        let tries = 0;
        pollRef.current = setInterval(async () => {
          tries++;
          if (tries > 80) { stopPolling(); setStatus("error"); setMessage("Délai expiré. Réessayez."); return; }
          const sr = await fetch(`${BACKEND_URL}/api/wave/status/${d.sessionId}`).then(r=>r.json());
          if (sr.status === "succeeded") { stopPolling(); setStatus("success"); onSuccess("wave"); }
          if (sr.status === "error")     { stopPolling(); setStatus("error"); setMessage("Paiement Wave échoué."); }
        }, 3000);
      }

      // ── Stripe ─────────────────────────────────────────────────────────────
      if (method === "stripe") {
        const r = await fetch(`${BACKEND_URL}/api/stripe/create-checkout`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ planId: plan, userId: user.id, userEmail: user.email }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur Stripe");
        window.location.href = d.url; // Redirect vers Stripe Checkout
      }

    } catch(e) {
      setStatus("error");
      setMessage(e.message || "Erreur réseau. Vérifiez votre connexion.");
    }
  };

  useEffect(() => () => stopPolling(), []);

  const methodBtn = (id, icon, label, color, sub) => (
    <button onClick={()=>setMethod(id)} style={{
      display:"flex", alignItems:"center", gap:12, width:"100%",
      padding:"14px 16px", borderRadius:12, cursor:"pointer", marginBottom:8,
      border:`2px solid ${method===id ? color : C.border}`,
      background: method===id ? `${color}15` : C.surface,
      transition:"all .15s",
    }}>
      <span style={{fontSize:26}}>{icon}</span>
      <div style={{textAlign:"left", flex:1}}>
        <div style={{fontWeight:700, fontSize:14, color: method===id ? color : C.text}}>{label}</div>
        <div style={{fontSize:11, color:C.muted}}>{sub}</div>
      </div>
      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${method===id?color:C.border}`,
        background:method===id?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {method===id && <div style={{width:8,height:8,borderRadius:"50%",background:"#FFF"}}/>}
      </div>
    </button>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:440,margin:"0 auto"}}>
      {/* Header */}
      <div style={{background:C.primary,padding:"20px 20px 22px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:13,marginBottom:14,padding:0}}>← Retour</button>
        <div style={{fontSize:20,fontWeight:900,color:"#FFF"}}>🛒 VenteVoix</div>
        <div style={{marginTop:10,background:"rgba(212,160,23,.2)",border:"1px solid rgba(212,160,23,.4)",borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontSize:11,color:C.accentLight,marginBottom:3}}>Formule choisie</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:800,color:"#FFF",fontSize:16}}>{planInfo.name}</span>
            <span style={{fontWeight:800,color:C.accentLight,fontSize:18}}>{planInfo.price} F<span style={{fontSize:11,fontWeight:400}}>/mois</span></span>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:3}}>≈ {planInfo.usd}/mois · 7 jours gratuit</div>
        </div>
      </div>

      <div style={{padding:"22px 18px"}}>
        {status === "success" ? (
          <div style={{textAlign:"center",padding:"32px 20px"}}>
            <div style={{fontSize:56,marginBottom:16}}>🎉</div>
            <div style={{fontSize:20,fontWeight:800,color:C.primary,marginBottom:8}}>Paiement confirmé !</div>
            <div style={{fontSize:14,color:C.muted,marginBottom:24}}>Votre abonnement {planInfo.name} est maintenant actif.</div>
            <button onClick={()=>onSuccess(method)} style={{...btnS(C.primary,"#FFF"),flex:"none",padding:"14px 32px",borderRadius:12}}>
              Accéder à l'application →
            </button>
          </div>
        ) : (
          <>
            <div style={{fontWeight:700,fontSize:16,marginBottom:16,color:C.primary}}>Choisissez votre mode de paiement</div>

            {methodBtn("momo","🟡","MTN MoMo",C.mtn,"Paiement mobile · Orange Money compatible")}
            {methodBtn("wave","🌊","Wave",C.wave,"Paiement Wave · XOF · Sénégal, CI, Mali…")}
            {methodBtn("stripe","💳","Carte bancaire (Stripe)",C.stripe,"Visa, Mastercard, Apple Pay · International")}

            {/* Champ téléphone pour MoMo */}
            {method === "momo" && (
              <div style={{marginTop:8,marginBottom:8}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>Numéro MTN MoMo *</div>
                <input
                  type="tel" placeholder="Ex: +225 07 00 00 00 00"
                  value={phone} onChange={e=>setPhone(e.target.value)}
                  style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:14,boxSizing:"border-box",outline:"none"}}
                />
              </div>
            )}

            {message && (
              <div style={{
                background: status==="error" ? "#FEF2F2" : "#EFF6FF",
                border: `1px solid ${status==="error"?"#FCA5A5":"#BFDBFE"}`,
                borderRadius:10, padding:"10px 14px",
                color: status==="error" ? C.danger : "#1D4ED8",
                fontSize:13, marginTop:10, lineHeight:1.5,
              }}>
                {status==="pending" && <span style={{marginRight:8}}>⏳</span>}{message}
              </div>
            )}

            {status === "pending" && (
              <div style={{textAlign:"center",marginTop:16,color:C.muted,fontSize:12}}>
                <Spinner/><br/>En attente de confirmation…
              </div>
            )}

            {(status === "idle" || status === "error") && (
              <button onClick={pay} style={{
                width:"100%", padding:"14px", borderRadius:12, border:"none",
                background: !method ? "#9CA3AF" : C.primary,
                color:"#FFF", fontWeight:800, fontSize:15, cursor: !method?"not-allowed":"pointer", marginTop:14,
              }}>
                {status === "error" ? "Réessayer" : `Payer ${planInfo.price} F →`}
              </button>
            )}

            {status === "loading" && (
              <button disabled style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"#9CA3AF",color:"#FFF",fontWeight:800,fontSize:15,cursor:"not-allowed",marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                <Spinner/> Traitement…
              </button>
            )}

            <div style={{marginTop:16,padding:"12px 14px",background:"#F9FAFB",borderRadius:10,fontSize:11,color:C.muted,lineHeight:1.7}}>
              🔒 <strong>Paiement 100% sécurisé</strong><br/>
              MTN MoMo et Wave chiffrent toutes les transactions.<br/>
              Stripe est certifié PCI-DSS niveau 1.
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:#1B4332!important;box-shadow:0 0 0 3px rgba(27,67,50,.12);}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LandingPage({onSignup, onLogin}){
  const[hov,setHov]=useState(null);
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text}}>
      <div style={{background:`linear-gradient(160deg,${C.primary} 0%,${C.primaryMid} 60%,#1a5c3a 100%)`,padding:"0 20px 48px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:180,height:180,borderRadius:"0 0 0 100%",background:"rgba(212,160,23,.12)"}}/>
        <div style={{paddingTop:40,position:"relative"}}>
          <div style={{display:"inline-block",background:"rgba(212,160,23,.2)",border:"1px solid rgba(212,160,23,.4)",borderRadius:20,padding:"5px 16px",fontSize:12,color:C.accentLight,fontWeight:600,marginBottom:20,letterSpacing:.5}}>🇨🇮 🇸🇳 🇨🇲 Fait pour l'Afrique</div>
          <div style={{fontSize:48,marginBottom:8}}>🛒</div>
          <h1 style={{margin:"0 0 10px",fontSize:32,fontWeight:900,color:"#FFF",letterSpacing:-1,lineHeight:1.15}}>Vente<span style={{color:C.accentLight}}>Voix</span></h1>
          <p style={{color:"rgba(255,255,255,.75)",fontSize:15,margin:"0 0 28px",lineHeight:1.6,maxWidth:320,marginLeft:"auto",marginRight:"auto"}}>Gérez vos ventes, dépenses et stock<br/><strong style={{color:"#FFF"}}>en parlant simplement.</strong><br/>Paiement MTN MoMo · Wave · Carte bancaire</p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>onSignup("pro")} style={{background:C.accent,color:"#1B1B1B",border:"none",borderRadius:12,padding:"14px 28px",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 4px 16px rgba(212,160,23,.5)"}}>Essayer 7 jours gratuit →</button>
            <button onClick={onLogin} style={{background:"rgba(255,255,255,.15)",color:"#FFF",border:"1px solid rgba(255,255,255,.3)",borderRadius:12,padding:"14px 22px",fontWeight:600,fontSize:14,cursor:"pointer"}}>Se connecter</button>
          </div>
          {/* Logos paiement */}
          <div style={{marginTop:24,display:"flex",gap:10,justifyContent:"center",alignItems:"center"}}>
            <span style={{background:"#FFCC00",color:"#1B1B1B",padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:800}}>MTN MoMo</span>
            <span style={{background:C.wave,color:"#FFF",padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:800}}>Wave</span>
            <span style={{background:C.stripe,color:"#FFF",padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:800}}>Stripe</span>
          </div>
        </div>
      </div>
      <div style={{padding:"36px 20px 20px",maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:11,color:C.accent,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Comment ça marche</div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.primary}}>3 étapes, c'est tout</h2>
        </div>
        {[["🎤","Parlez","Dites «vendu 3 savons à 500 francs»"],["✅","Confirmez","Le système répète et attend votre accord"],["📊","Consultez","Chiffres en temps réel, export PDF/Excel"]].map(([ic,t,d],i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14,background:C.surface,borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:26,minWidth:40,textAlign:"center"}}>{ic}</div>
            <div><div style={{fontWeight:700,fontSize:15,marginBottom:2,color:C.primary}}>{t}</div><div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>{d}</div></div>
          </div>
        ))}
      </div>
      <div style={{padding:"8px 20px 48px",maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:800,color:C.primary}}>Choisissez votre formule</h2>
          <p style={{margin:0,fontSize:12,color:C.muted}}>Paiement mensuel · MTN MoMo · Wave · Carte</p>
        </div>
        {PLANS.map(plan=>(
          <div key={plan.id} onMouseEnter={()=>setHov(plan.id)} onMouseLeave={()=>setHov(null)}
            style={{background:C.surface,borderRadius:16,padding:"20px 20px 16px",marginBottom:14,border:`2px solid ${hov===plan.id||plan.id==="pro"?plan.color:C.border}`,boxShadow:plan.id==="pro"?"0 6px 24px rgba(45,106,79,.15)":"0 2px 8px rgba(0,0,0,.06)",transition:"all .2s",cursor:"pointer",position:"relative"}}>
            {plan.badge&&<div style={{position:"absolute",top:-11,right:16,background:plan.id==="pro"?C.primary:C.accent,color:"#FFF",fontSize:11,fontWeight:700,padding:"3px 12px",borderRadius:20}}>{plan.badge}</div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div><div style={{fontSize:17,fontWeight:800,color:plan.color}}>{plan.name}</div></div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:24,fontWeight:900,color:C.text}}>{plan.price}</span>
                <span style={{fontSize:11,color:C.muted}}> F{plan.period}</span>
                <div style={{fontSize:10,color:C.muted}}>≈ {plan.usd}/mois</div>
              </div>
            </div>
            <div style={{marginBottom:14}}>{plan.features.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><span style={{color:plan.color,fontSize:13,minWidth:16}}>✓</span><span style={{fontSize:13}}>{f}</span></div>)}</div>
            <button onClick={()=>onSignup(plan.id)} style={{width:"100%",padding:"12px 0",borderRadius:10,border:plan.id==="starter"?`2px solid ${plan.color}`:"none",background:plan.id==="pro"?C.primary:plan.id==="business"?C.accent:"transparent",color:plan.id==="starter"?plan.color:"#FFF",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              {plan.cta??`Choisir ${plan.name}`} →
            </button>
          </div>
        ))}
        <p style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:8}}>✅ 7 jours d'essai gratuit · Aucune carte requise pour commencer</p>
      </div>
      <div style={{background:C.primary,padding:"24px 20px",textAlign:"center"}}>
        <div style={{fontSize:16,fontWeight:800,color:"#FFF",marginBottom:6}}>🛒 VenteVoix</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:8}}>
          <span style={{background:"#FFCC00",color:"#000",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:800}}>MTN MoMo</span>
          <span style={{background:C.wave,color:"#FFF",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:800}}>Wave</span>
          <span style={{background:C.stripe,color:"#FFF",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:800}}>Stripe</span>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>© 2026 · Fait pour les marchés africains</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
function AuthPage({mode,planId,onAuth,onBack}){
  const[tab,setTab]=useState(mode);
  const[form,setForm]=useState({nom:"",tel:"",email:"",pin:"",pin2:""});
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  const planInfo=PLANS.find(p=>p.id===planId)??PLANS[1];

  const submit=async()=>{
    setErr("");setLoading(true);
    await new Promise(r=>setTimeout(r,600));
    if(tab==="signup"){
      if(!form.nom.trim()||!form.tel.trim()||!form.pin){setErr("Remplissez tous les champs obligatoires.");setLoading(false);return;}
      if(form.pin.length<4){setErr("Le code PIN doit avoir au moins 4 chiffres.");setLoading(false);return;}
      if(form.pin!==form.pin2){setErr("Les codes PIN ne correspondent pas.");setLoading(false);return;}
      const users=JSON.parse(localStorage.getItem("vv_users")||"{}");
      if(users[form.tel]){setErr("Ce numéro est déjà inscrit. Connectez-vous.");setLoading(false);return;}
      const trialEnd=new Date();trialEnd.setDate(trialEnd.getDate()+7);
      const user={id:Date.now(),nom:form.nom,tel:form.tel,email:form.email,
        plan:planId,trialEnd:trialEnd.toISOString(),createdAt:new Date().toISOString(),active:true};
      users[form.tel]=user;
      localStorage.setItem("vv_users",JSON.stringify(users));
      localStorage.setItem("vv_pins",JSON.stringify({...JSON.parse(localStorage.getItem("vv_pins")||"{}"),[form.tel]:form.pin}));
      onAuth(user);
    } else {
      if(!form.tel||!form.pin){setErr("Entrez votre numéro et code PIN.");setLoading(false);return;}
      const users=JSON.parse(localStorage.getItem("vv_users")||"{}");
      const pins=JSON.parse(localStorage.getItem("vv_pins")||"{}");
      const user=users[form.tel];
      if(!user){setErr("Numéro non trouvé. Inscrivez-vous d'abord.");setLoading(false);return;}
      if(pins[form.tel]!==form.pin){setErr("Code PIN incorrect.");setLoading(false);return;}
      onAuth(user);
    }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:440,margin:"0 auto"}}>
      <div style={{background:C.primary,padding:"20px 20px 24px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:13,marginBottom:16,padding:0}}>← Retour</button>
        <div style={{fontSize:26,fontWeight:900,color:"#FFF"}}>🛒 VenteVoix</div>
        {tab==="signup"&&<div style={{marginTop:10,background:"rgba(212,160,23,.2)",border:"1px solid rgba(212,160,23,.4)",borderRadius:10,padding:"8px 14px",fontSize:12,color:C.accentLight}}>
          Formule : <strong>{planInfo.name}</strong> — {planInfo.price} F/mois · <strong>7 jours gratuit</strong>
        </div>}
      </div>
      <div style={{display:"flex",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        {[["signup","Créer un compte"],["login","Se connecter"]].map(([k,l])=>(
          <button key={k} onClick={()=>{setTab(k);setErr("");}} style={{flex:1,padding:"13px 0",border:"none",cursor:"pointer",background:tab===k?C.bg:C.surface,fontWeight:tab===k?700:400,color:tab===k?C.primary:C.muted,borderBottom:tab===k?`3px solid ${C.primary}`:"3px solid transparent",fontSize:14}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"22px 20px"}}>
        {tab==="signup"&&<div style={{background:"#F0FDF4",border:`1px solid ${C.primaryLight}`,borderRadius:12,padding:"10px 14px",marginBottom:18,fontSize:12,color:C.primary}}>✅ 7 jours d'essai gratuit — aucune carte bancaire requise</div>}
        {[tab==="signup"?["Nom complet *","nom","text","Jean Kouamé"]:null,["Numéro de téléphone *","tel","tel","+225 07 00 00 00"],tab==="signup"?["Email (optionnel)","email","email","jean@email.com"]:null,["Code PIN (4+ chiffres) *","pin","password","••••"],tab==="signup"?["Confirmer le PIN *","pin2","password","••••"]:null].filter(Boolean).map(([lbl,key,type,ph])=>(
          <div key={key} style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>{lbl}</div>
            <input type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
              style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:14,boxSizing:"border-box",outline:"none"}}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
        ))}
        {err&&<div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,padding:"10px 14px",color:C.danger,fontSize:13,marginBottom:14}}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?"#9CA3AF":C.primary,color:"#FFF",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer"}}>
          {loading?"...":(tab==="signup"?"Créer mon compte →":"Se connecter →")}
        </button>
      </div>
      <style>{`input:focus{border-color:#1B4332!important;box-shadow:0 0 0 3px rgba(27,67,50,.12);}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMBERSHIP GUARD
// ══════════════════════════════════════════════════════════════════════════════
function MembershipGuard({user,onUpgrade,onLogout,children}){
  const trialEnd=user.trialEnd?new Date(user.trialEnd):null;
  const now=new Date();
  const trialActive=trialEnd&&now<trialEnd;
  const daysLeft=trialEnd?Math.max(0,Math.ceil((trialEnd-now)/(1000*60*60*24))):0;
  const isActive=user.active&&(trialActive||user.subscribed);
  if(!isActive)return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,padding:28,maxWidth:380,textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.12)"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <h2 style={{color:C.danger,margin:"0 0 10px",fontSize:20}}>Abonnement expiré</h2>
        <p style={{color:C.muted,fontSize:14,margin:"0 0 20px",lineHeight:1.6}}>Votre période d'essai est terminée. Choisissez une formule pour continuer.</p>
        <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"center"}}>
          <span style={{background:"#FFCC00",color:"#000",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:800}}>MTN MoMo</span>
          <span style={{background:C.wave,color:"#FFF",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:800}}>Wave</span>
          <span style={{background:C.stripe,color:"#FFF",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:800}}>Stripe</span>
        </div>
        <button onClick={onUpgrade} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:C.primary,color:"#FFF",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:10}}>S'abonner maintenant →</button>
        <button onClick={onLogout} style={{width:"100%",padding:"11px",borderRadius:12,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontWeight:600,fontSize:13,cursor:"pointer"}}>Se déconnecter</button>
      </div>
    </div>
  );
  return<>
    {trialActive&&daysLeft<=3&&(
      <div style={{background:"#FEF3C7",padding:"8px 16px",textAlign:"center",fontSize:12,color:"#92400E",fontWeight:600,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>⏳ Essai : {daysLeft} jour{daysLeft>1?"s":""} restant{daysLeft>1?"s":""}</span>
        <button onClick={onUpgrade} style={{background:C.accent,border:"none",borderRadius:8,padding:"4px 12px",color:"#FFF",fontWeight:700,fontSize:11,cursor:"pointer"}}>S'abonner</button>
      </div>
    )}
    {children}
  </>;
}

// ══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════
function AppVenteVoix({user,onLogout,onUpgrade,plan}){
  const[transactions,setTransactions]=useState([]);
  const[stock,setStock]=useState([]);
  const[etat,setEtat]=useState("idle");
  const[transcription,setTranscription]=useState("");
  const[interpretation,setInterpretation]=useState(null);
  const[erreur,setErreur]=useState("");
  const[onglet,setOnglet]=useState("accueil");
  const[showStockForm,setShowStockForm]=useState(false);
  const[newArt,setNewArt]=useState({nom:"",quantite:"",prixVente:"",seuil:"5"});
  const recognRef=useRef(null);
  const synth=useRef(window.speechSynthesis);
  const KEY_TX=`vv_tx_${user.id}`,KEY_STK=`vv_stk_${user.id}`;
  useEffect(()=>{(async()=>{try{const r=await window.storage.get(KEY_TX);if(r?.value)setTransactions(JSON.parse(r.value));}catch{}try{const r=await window.storage.get(KEY_STK);if(r?.value)setStock(JSON.parse(r.value));}catch{}})();},[]);
  const saveTx=useCallback(async l=>{try{await window.storage.set(KEY_TX,JSON.stringify(l));}catch{};},[]);
  const saveStk=useCallback(async l=>{try{await window.storage.set(KEY_STK,JSON.stringify(l));}catch{};},[]);
  const parler=useCallback(t=>{synth.current?.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="fr-FR";u.rate=.95;synth.current?.speak(u);},[]);
  const demarrer=useCallback(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setErreur("Utilisez Chrome.");setEtat("erreur");return;}const rec=new SR();rec.lang="fr-FR";rec.interimResults=false;rec.maxAlternatives=1;recognRef.current=rec;rec.onstart=()=>setEtat("ecoute");rec.onerror=e=>{setEtat("erreur");setErreur("Erreur micro : "+e.error);};rec.onresult=async e=>{const t=e.results[0][0].transcript;setTranscription(t);setEtat("analyse");const res=await interpreterVoix(t,stock);setInterpretation(res);setEtat("confirmation");parler(res.confirmation??"Voici ce que j'ai compris.");};rec.start();},[stock,parler]);
  const valider=useCallback(()=>{if(!interpretation||interpretation.type==="inconnu"){annuler();return;}const tx={id:Date.now(),date:new Date().toISOString(),type:interpretation.type,description:interpretation.description??"—",quantite:interpretation.quantite,prixUnitaire:interpretation.prixUnitaire,montant:interpretation.montantTotal??0,texteOriginal:transcription};const nl=[tx,...transactions];setTransactions(nl);saveTx(nl);if(interpretation.articleStock){const art=interpretation.articleStock.toLowerCase();const ns=stock.map(s=>{if(s.nom.toLowerCase()===art){const delta=interpretation.type==="vente"?-(interpretation.quantite??1):interpretation.type==="stock_entree"?(interpretation.quantite??1):0;return{...s,quantite:Math.max(0,(s.quantite??0)+delta)};}return s;});setStock(ns);saveStk(ns);}setEtat("idle");setInterpretation(null);setTranscription("");parler("Enregistré !");},[interpretation,transactions,stock,transcription,saveTx,saveStk,parler]);
  const annuler=useCallback(()=>{setEtat("idle");setInterpretation(null);setTranscription("");parler("Annulé.");},[parler]);
  const totalVentes=transactions.filter(t=>t.type==="vente").reduce((s,t)=>s+t.montant,0);
  const totalDepenses=transactions.filter(t=>t.type==="depense").reduce((s,t)=>s+t.montant,0);
  const benefice=totalVentes-totalDepenses;
  const stats={tv:totalVentes,td:totalDepenses,nv:transactions.filter(t=>t.type==="vente").length,nd:transactions.filter(t=>t.type==="depense").length};
  const ajouterArt=()=>{if(!newArt.nom.trim())return;const a={id:Date.now(),nom:newArt.nom.trim(),quantite:parseInt(newArt.quantite)||0,prixVente:parseInt(newArt.prixVente)||0,seuil:parseInt(newArt.seuil)||5};const ns=[...stock,a];setStock(ns);saveStk(ns);setNewArt({nom:"",quantite:"",prixVente:"",seuil:"5"});setShowStockForm(false);};
  const suppTx=id=>{const nl=transactions.filter(t=>t.id!==id);setTransactions(nl);saveTx(nl);};
  const suppArt=id=>{const ns=stock.filter(a=>a.id!==id);setStock(ns);saveStk(ns);};
  const articlesBas=stock.filter(a=>(a.quantite??0)<=(a.seuil??5));
  const canExcel=["pro","business"].includes(plan?.id);
  const canStock=["pro","business"].includes(plan?.id);
  const TABS=[["accueil","🏠"],["historique","📋"],canStock&&["stock","📦"]].filter(Boolean);
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:480,margin:"0 auto"}}>
      <div style={{background:C.primary,padding:"15px 15px 11px",position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 12px rgba(0,0,0,.15)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>🛒</span>
            <div><div style={{fontSize:17,fontWeight:800,color:"#FFF",letterSpacing:-.5}}>VenteVoix</div><div style={{fontSize:10,color:C.primaryLight}}>Bonjour {user.nom.split(" ")[0]} · {PLANS.find(p=>p.id===plan?.id)?.name??plan?.id}</div></div>
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            {canExcel&&<><button onClick={()=>exportExcel(transactions,stock,stats)} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"5px 9px",color:"#FFF",fontSize:11,cursor:"pointer",fontWeight:600}}>📊</button><button onClick={()=>exportPDF(transactions,stock,stats)} style={{background:C.accent,border:"none",borderRadius:8,padding:"5px 9px",color:"#FFF",fontSize:11,cursor:"pointer",fontWeight:600}}>📄</button></>}
            <button onClick={onUpgrade} title="Gérer l'abonnement" style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"5px 9px",color:"rgba(255,255,255,.7)",fontSize:11,cursor:"pointer"}}>💳</button>
            <button onClick={onLogout} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"5px 9px",color:"rgba(255,255,255,.7)",fontSize:11,cursor:"pointer"}}>⏏</button>
          </div>
        </div>
        {articlesBas.length>0&&canStock&&<div style={{marginTop:7,background:"rgba(212,160,23,.2)",borderRadius:8,padding:"5px 12px",fontSize:11,color:C.accentLight,fontWeight:600}}>⚠️ Stock faible : {articlesBas.map(a=>a.nom).join(", ")}</div>}
      </div>
      <div style={{display:"flex",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        {TABS.map(([k,icon])=><button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 0",border:"none",cursor:"pointer",background:onglet===k?C.bg:C.surface,fontWeight:onglet===k?700:400,color:onglet===k?C.primary:C.muted,borderBottom:onglet===k?`3px solid ${C.primary}`:"3px solid transparent",fontSize:12}}>{icon} {k.charAt(0).toUpperCase()+k.slice(1)}</button>)}
        {!canStock&&<button onClick={onUpgrade} style={{flex:1,padding:"11px 0",border:"none",cursor:"pointer",background:"#F9F3FF",color:"#7C3AED",fontSize:11,fontWeight:600}}>📦 Stock 🔒</button>}
      </div>
      <div style={{padding:"14px 14px 100px"}}>
        {onglet==="accueil"&&<>
          <div style={{display:"flex",gap:8,marginBottom:10}}><StatCard label="Ventes" value={fmt(totalVentes)} color={C.primary} sub={`${stats.nv} op.`}/><StatCard label="Dépenses" value={fmt(totalDepenses)} color={C.danger} sub={`${stats.nd} op.`}/></div>
          <div style={{marginBottom:16}}><StatCard label="Bénéfice net" value={fmt(benefice)} color={benefice>=0?C.primary:C.danger}/></div>
          <div style={{background:C.surface,borderRadius:18,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,.08)",textAlign:"center"}}>
            {etat==="idle"&&<><div style={{fontSize:13,color:C.muted,marginBottom:14}}>Parlez pour enregistrer une vente, dépense ou entrée de stock</div><div style={{fontSize:11,color:C.muted,background:C.bg,borderRadius:10,padding:"10px 12px",marginBottom:16,textAlign:"left",lineHeight:1.9}}><b style={{color:C.text}}>Exemples :</b><br/>🗣 "Vendu 5 savons à 300 francs"<br/>🗣 "Reçu 20 pagnes pour le stock"<br/>🗣 "Dépensé 5 000 pour le transport"</div><button onClick={demarrer} style={{width:84,height:84,borderRadius:"50%",background:`linear-gradient(135deg,${C.mic},#FF8E53)`,border:"none",cursor:"pointer",fontSize:32,boxShadow:"0 6px 20px rgba(220,38,38,.4)"}}>🎤</button><div style={{marginTop:10,fontSize:11,color:C.muted}}>Appuyez pour parler</div></>}
            {etat==="ecoute"&&<><div style={{fontSize:14,fontWeight:700,color:C.mic,marginBottom:14}}>🔴 Je vous écoute…</div><button onClick={()=>recognRef.current?.stop()} style={{width:84,height:84,borderRadius:"50%",background:C.mic,border:"4px solid #FF8E53",cursor:"pointer",fontSize:26,color:"#FFF",boxShadow:"0 0 0 10px rgba(220,38,38,.15)"}}>⏹</button></>}
            {etat==="analyse"&&<><div style={{fontSize:34,marginBottom:10}}>⚙️</div><div style={{fontWeight:700,marginBottom:6}}>Analyse en cours…</div><div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>"{transcription}"</div></>}
            {etat==="confirmation"&&interpretation&&<><div style={{fontSize:12,color:C.muted,fontStyle:"italic",marginBottom:12}}>"{transcription}"</div><div style={{background:interpretation.type==="vente"?"#D1FAE5":interpretation.type==="depense"?"#FEE2E2":"#DBEAFE",borderRadius:12,padding:14,marginBottom:14,textAlign:"left"}}><div style={{fontWeight:700,fontSize:13,marginBottom:8,display:"flex",gap:8,alignItems:"center"}}><Badge type={interpretation.type}/>{interpretation.type==="vente"?"Vente":interpretation.type==="depense"?"Dépense":"Entrée stock"}</div>{interpretation.description&&<Row l="Article" v={interpretation.description}/>}{interpretation.quantite&&<Row l="Quantité" v={interpretation.quantite}/>}{interpretation.prixUnitaire&&<Row l="Prix unitaire" v={fmt(interpretation.prixUnitaire)}/>}<Row l="Montant total" v={fmt(interpretation.montantTotal??0)} bold/></div><div style={{fontSize:13,fontWeight:600,marginBottom:14}}>🔊 {interpretation.confirmation}</div><div style={{display:"flex",gap:10}}><button onClick={annuler} style={btnS(C.danger,"#FFF")}>✗ Annuler</button><button onClick={valider} style={btnS(C.primary,"#FFF")}>✓ Confirmer</button></div></>}
            {etat==="erreur"&&<><div style={{fontSize:34,marginBottom:10}}>⚠️</div><div style={{color:C.danger,fontWeight:700,marginBottom:14}}>{erreur}</div><button onClick={()=>setEtat("idle")} style={btnS(C.primary,"#FFF")}>Réessayer</button></>}
          </div>
        </>}
        {onglet==="historique"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontWeight:700,fontSize:15}}>Transactions ({transactions.length})</div>{transactions.length>0&&<button onClick={()=>{setTransactions([]);saveTx([]);}} style={{fontSize:11,color:C.danger,background:"none",border:`1px solid ${C.danger}`,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Effacer</button>}</div>
          {transactions.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40,fontSize:13}}><div style={{fontSize:36,marginBottom:10}}>📭</div>Aucune transaction.</div>}
          {transactions.map(tx=><div key={tx.id} style={{background:C.surface,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderLeft:`4px solid ${tx.type==="vente"?C.primary:tx.type==="depense"?C.danger:"#1D4ED8"}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}><Badge type={tx.type}/><span style={{fontSize:13,fontWeight:600}}>{tx.description}</span></div>{tx.quantite&&<div style={{fontSize:11,color:C.muted}}>{tx.quantite} × {fmt(tx.prixUnitaire??0)}</div>}<div style={{fontSize:10,color:C.muted,marginTop:2,fontStyle:"italic"}}>"{tx.texteOriginal}"</div><div style={{fontSize:10,color:C.muted,marginTop:1}}>{new Date(tx.date).toLocaleString("fr-FR")}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:15,color:tx.type==="vente"?C.primary:tx.type==="depense"?C.danger:"#1D4ED8"}}>{tx.type==="vente"?"+":"−"}{fmt(tx.montant)}</div><button onClick={()=>suppTx(tx.id)} style={{marginTop:5,border:"none",background:"none",color:C.muted,cursor:"pointer",fontSize:15}}>🗑</button></div></div></div>)}
        </>}
        {onglet==="stock"&&canStock&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontWeight:700,fontSize:15}}>Stock ({stock.length})</div><button onClick={()=>setShowStockForm(!showStockForm)} style={{background:C.primary,border:"none",borderRadius:10,padding:"7px 14px",color:"#FFF",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Ajouter</button></div>
          {showStockForm&&<div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 4px 14px rgba(0,0,0,.08)"}}><div style={{fontWeight:700,marginBottom:12,color:C.primary}}>Nouvel article</div>{[["Nom *","nom","text"],["Quantité","quantite","number"],["Prix vente (F)","prixVente","number"],["Seuil alerte","seuil","number"]].map(([l,k,t])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:12,color:C.muted,marginBottom:4}}>{l}</div><input type={t} value={newArt[k]} onChange={e=>setNewArt(p=>({...p,[k]:e.target.value}))} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:14,boxSizing:"border-box",outline:"none"}}/></div>)}<div style={{display:"flex",gap:10,marginTop:12}}><button onClick={()=>setShowStockForm(false)} style={btnS("#F3F4F6",C.muted)}>Annuler</button><button onClick={ajouterArt} style={btnS(C.primary,"#FFF")}>✓ Ajouter</button></div></div>}
          {stock.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40,fontSize:13}}><div style={{fontSize:36,marginBottom:10}}>📦</div>Aucun article.</div>}
          {stock.map(art=>{const f=(art.quantite??0)<=(art.seuil??5);return<div key={art.id} style={{background:C.surface,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderLeft:`4px solid ${f?C.accent:C.primary}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{art.nom}</div><div style={{fontSize:12,color:C.muted}}>Prix : {fmt(art.prixVente??0)} · Valeur : {fmt((art.quantite??0)*(art.prixVente??0))}</div>{f&&<div style={{fontSize:11,color:C.accent,fontWeight:700,marginTop:3}}>⚠️ Faible (seuil : {art.seuil})</div>}</div><div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:800,color:f?C.accent:C.primary}}>{art.quantite??0}</div><div style={{display:"flex",gap:5,marginTop:5,justifyContent:"flex-end"}}><button onClick={()=>{const ns=stock.map(a=>a.id===art.id?{...a,quantite:(a.quantite??0)+1}:a);setStock(ns);saveStk(ns);}} style={{border:`1px solid ${C.primary}`,background:"none",borderRadius:6,padding:"2px 9px",cursor:"pointer",color:C.primary,fontWeight:700}}>+</button><button onClick={()=>{const ns=stock.map(a=>a.id===art.id?{...a,quantite:Math.max(0,(a.quantite??0)-1)}:a);setStock(ns);saveStk(ns);}} style={{border:`1px solid ${C.muted}`,background:"none",borderRadius:6,padding:"2px 9px",cursor:"pointer",color:C.muted,fontWeight:700}}>−</button><button onClick={()=>suppArt(art.id)} style={{border:"none",background:"none",cursor:"pointer",color:C.muted,fontSize:15}}>🗑</button></div></div></div></div>;})}
          {stock.length>0&&<div style={{background:C.surface,borderRadius:12,padding:14,marginTop:8}}><div style={{fontWeight:700,marginBottom:6,color:C.primary}}>Valeur totale du stock</div><div style={{fontSize:22,fontWeight:800,color:C.primary}}>{fmt(stock.reduce((s,a)=>s+(a.quantite??0)*(a.prixVente??0),0))}</div></div>}
        </>}
      </div>
      <style>{`input:focus{border-color:#1B4332!important;box-shadow:0 0 0 3px rgba(27,67,50,.12);}button:active{opacity:.85;transform:scale(.97);}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — Orchestrateur
// ══════════════════════════════════════════════════════════════════════════════
export default function Root(){
  const[screen,setScreen]=useState("landing"); // landing|auth|payment|app
  const[authMode,setAuthMode]=useState("signup");
  const[selectedPlan,setSelectedPlan]=useState("pro");
  const[currentUser,setCurrentUser]=useState(null);

  useEffect(()=>{
    const s=localStorage.getItem("vv_session");
    if(s){try{const u=JSON.parse(s);setCurrentUser(u);setScreen("app");}catch{}}
  },[]);

  const onSignup=planId=>{setSelectedPlan(planId);setAuthMode("signup");setScreen("auth");};
  const onLogin=()=>{setAuthMode("login");setScreen("auth");};
  const onAuth=user=>{setCurrentUser(user);localStorage.setItem("vv_session",JSON.stringify(user));setScreen("payment");};
  const onPaySuccess=method=>{
    const updated={...currentUser,subscribed:true,plan:selectedPlan,paymentMethod:method};
    setCurrentUser(updated);localStorage.setItem("vv_session",JSON.stringify(updated));setScreen("app");
  };
  const onLogout=()=>{localStorage.removeItem("vv_session");setCurrentUser(null);setScreen("landing");};
  const onUpgrade=()=>setScreen("payment");
  const planObj=PLANS.find(p=>p.id===(currentUser?.plan??selectedPlan))??PLANS[1];

  if(screen==="landing") return<LandingPage onSignup={onSignup} onLogin={onLogin}/>;
  if(screen==="auth")    return<AuthPage mode={authMode} planId={selectedPlan} onAuth={onAuth} onBack={()=>setScreen("landing")}/>;
  if(screen==="payment"&&currentUser) return<PaymentScreen plan={selectedPlan} user={currentUser} onSuccess={onPaySuccess} onBack={()=>setScreen(currentUser.subscribed?"app":"landing")}/>;
  if(screen==="app"&&currentUser)     return<MembershipGuard user={currentUser} onUpgrade={onUpgrade} onLogout={onLogout}><AppVenteVoix user={currentUser} plan={planObj} onLogout={onLogout} onUpgrade={onUpgrade}/></MembershipGuard>;
  return null;

  // Enregistrement Service Worker PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
}
