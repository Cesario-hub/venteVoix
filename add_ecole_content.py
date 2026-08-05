f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

old = '{onglet==="recouvrement"&&(()=>{'
new = '{onglet==="ecole"&&<ModuleEcole user={user} config={config}/>}\n        {onglet==="recouvrement"&&(()=>{'

if old in c:
    c = c.replace(old, new, 1)
    print("OK ecole content added")
else:
    print("NOT FOUND")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
