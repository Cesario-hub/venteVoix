f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Fix saveStk - use upsert with onConflict to avoid 409
old1 = '''  const saveStk=useCallback(async l=>{
    lsSet(KEY_STK,l);
    try{
      for(const a of l){
        await supabase.from("stock").upsert({id:String(a.id),user_id:user.id,code:a.code,nom:a.nom,categorie:a.categorie,quantite:a.quantite,prix_achat:a.prixAchat,prix_vente:a.prixVente,seuil:a.seuil},{onConflict:"id"});
      }
    }catch{}
  },[KEY_STK,user.id]);'''

new1 = '''  const saveStk=useCallback(async (l,skipSupabase=false)=>{
    lsSet(KEY_STK,l);
    if(skipSupabase) return;
    try{
      for(const a of l){
        await supabase.from("stock").upsert({id:String(a.id),user_id:user.id,code:a.code,nom:a.nom,categorie:a.categorie,quantite:a.quantite,prix_achat:a.prixAchat,prix_vente:a.prixVente,seuil:a.seuil},{onConflict:"id"});
      }
    }catch(e){console.log("saveStk error:",e);}
  },[KEY_STK,user.id]);'''

# Fix saveTx - use upsert with onConflict
old2 = '''  const saveTx=useCallback(async l=>{
    lsSet(KEY_TX,l);
    try{
      if(l.length>0){
        const t=l[0];
        await supabase.from("transactions").insert({id:String(t.id),user_id:user.id,date:t.date,type:t.type,description:t.description,quantite:t.quantite,prix_unitaire:t.prixUnitaire,montant:t.montant,texte_original:t.texteOriginal,article_stock:t.articleStock});
      }
    }catch{}
  },[KEY_TX,user.id]);'''

new2 = '''  const saveTx=useCallback(async (l,skipSupabase=false)=>{
    lsSet(KEY_TX,l);
    if(skipSupabase) return;
    try{
      if(l.length>0){
        const t=l[0];
        await supabase.from("transactions").upsert({id:String(t.id),user_id:user.id,date:t.date,type:t.type,description:t.description,quantite:t.quantite,prix_unitaire:t.prixUnitaire,montant:t.montant,texte_original:t.texteOriginal,article_stock:t.articleStock},{onConflict:"id"});
      }
    }catch(e){console.log("saveTx error:",e);}
  },[KEY_TX,user.id]);'''

# Fix loadFromSupabase to use skipSupabase=true
old3 = '''          setTransactions(tx);lsSet(KEY_TX,tx);
        }
        const {data:stkData}=await supabase.from("stock").select("*").eq("user_id",user.id);
        if(stkData&&stkData.length>0){
          const stk=stkData.map(a=>({id:a.id,code:a.code,nom:a.nom,categorie:a.categorie,quantite:a.quantite,prixAchat:a.prix_achat,prixVente:a.prix_vente,seuil:a.seuil}));
          setStock(stk);lsSet(KEY_STK,stk);'''

new3 = '''          setTransactions(tx);lsSet(KEY_TX,tx);
        }
        const {data:stkData}=await supabase.from("stock").select("*").eq("user_id",user.id);
        if(stkData&&stkData.length>0){
          const stk=stkData.map(a=>({id:a.id,code:a.code,nom:a.nom,categorie:a.categorie,quantite:a.quantite,prixAchat:a.prix_achat,prixVente:a.prix_vente,seuil:a.seuil}));
          setStock(stk);lsSet(KEY_STK,stk);  // skipSupabase handled by direct lsSet'''

for old, new, label in [(old1,new1,"saveStk"),(old2,new2,"saveTx"),(old3,new3,"loadFromSupabase")]:
    if old in c:
        c = c.replace(old, new, 1)
        print(f"OK {label}")
    else:
        print(f"NOT FOUND {label}")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
