f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

old = '''    const loadFromSupabase=async()=>{
      try{
        const {data:txData}=await supabase.from("transactions").select("*").eq("user_id",user.id).order("date",{ascending:false});
        if(txData&&txData.length>0){
          const tx=txData.map(t=>({id:t.id,date:t.date,type:t.type,description:t.description,quantite:t.quantite,prixUnitaire:t.prix_unitaire,montant:t.montant,texteOriginal:t.texte_original,articleStock:t.article_stock}));
          setTransactions(tx);lsSet(KEY_TX,tx);
        }
        const {data:stkData}=await supabase.from("stock").select("*").eq("user_id",user.id);
        if(stkData&&stkData.length>0){
          const stk=stkData.map(a=>({id:a.id,code:a.code,nom:a.nom,categorie:a.categorie,quantite:a.quantite,prixAchat:a.prix_achat,prixVente:a.prix_vente,seuil:a.seuil}));
          setStock(stk);lsSet(KEY_STK,stk);
        }
      }catch(e){console.log("Supabase load error:",e);}
    };
    loadFromSupabase();'''

new = '''    const loadFromSupabase=async()=>{
      try{
        const timeout = new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),4000));
        const txPromise=supabase.from("transactions").select("*").eq("user_id",user.id).order("date",{ascending:false});
        const {data:txData}=await Promise.race([txPromise,timeout]).catch(()=>({data:null}));
        if(txData&&txData.length>0){
          const tx=txData.map(t=>({id:t.id,date:t.date,type:t.type,description:t.description,quantite:t.quantite,prixUnitaire:t.prix_unitaire,montant:t.montant,texteOriginal:t.texte_original,articleStock:t.article_stock}));
          setTransactions(tx);lsSet(KEY_TX,tx);
        }
        const stkPromise=supabase.from("stock").select("*").eq("user_id",user.id);
        const {data:stkData}=await Promise.race([stkPromise,new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),4000))]).catch(()=>({data:null}));
        if(stkData&&stkData.length>0){
          const stk=stkData.map(a=>({id:a.id,code:a.code,nom:a.nom,categorie:a.categorie,quantite:a.quantite,prixAchat:a.prix_achat,prixVente:a.prix_vente,seuil:a.seuil}));
          setStock(stk);lsSet(KEY_STK,stk);
        }
      }catch(e){console.log("Supabase load error:",e);}
    };
    loadFromSupabase();'''

if old in c:
    c = c.replace(old, new)
    print("OK timeout added to loadFromSupabase")
else:
    print("NOT FOUND")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
