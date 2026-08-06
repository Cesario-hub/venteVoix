f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Add timeout to Supabase login query
old = '''        const {data:sbUser}=await supabase.from("users").select("*").eq("tel",form.tel).single();
        if(sbUser){
          if(sbUser.pin!==form.pin){setErr("PIN incorrect.");setLoading(false);return;}
          const user={id:sbUser.id,nom:sbUser.nom,tel:sbUser.tel,email:sbUser.email||"",plan:sbUser.plan,subscribed:true,createdAt:sbUser.created_at,trialEnd:sbUser.trial_end,isTrial:sbUser.is_trial};
          onAuth(user);setLoading(false);return;
        }'''

new = '''        const sbPromise=supabase.from("users").select("*").eq("tel",form.tel).single();
        const sbTimeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),5000));
        const {data:sbUser}=await Promise.race([sbPromise,sbTimeout]).catch(()=>({data:null}));
        if(sbUser){
          if(sbUser.pin!==form.pin){setErr("PIN incorrect.");setLoading(false);return;}
          const user={id:sbUser.id,nom:sbUser.nom,tel:sbUser.tel,email:sbUser.email||"",plan:sbUser.plan,subscribed:true,createdAt:sbUser.created_at,trialEnd:sbUser.trial_end,isTrial:sbUser.is_trial};
          onAuth(user);setLoading(false);return;
        }'''

if old in c:
    c = c.replace(old, new)
    print("OK timeout added to login")
else:
    print("NOT FOUND")

# Add timeout to code validation
old2 = 'const {data,error}=await supabase.from("codes").select("*").eq("code",code).single();'
new2 = 'const codePromise=supabase.from("codes").select("*").eq("code",code).single();\n    const codeTimeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),5000));\n    const {data,error}=await Promise.race([codePromise,codeTimeout]).catch(()=>({data:null,error:true}));'

if old2 in c:
    c = c.replace(old2, new2)
    print("OK timeout added to code validation")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
