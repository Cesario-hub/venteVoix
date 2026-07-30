f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

old = '  }catch{}\n  codes[code]={planId'
new = '  }catch(e){console.error("SUPABASE ERROR:",JSON.stringify(e));}\n  codes[code]={planId'

if old in c:
    c = c.replace(old, new)
    print("OK - debug added")
else:
    print("NOT FOUND - searching...")
    idx = c.find('supabase.from("codes").insert')
    print(repr(c[idx:idx+300]))

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
