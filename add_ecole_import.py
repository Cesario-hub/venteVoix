f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Add import
old = 'import { supabase } from "./supabase.js";'
new = 'import { supabase } from "./supabase.js";\nimport ModuleEcole from "./ModuleEcole.jsx";'

if old in c:
    c = c.replace(old, new, 1)
    print("OK import added")
else:
    print("NOT FOUND import")

# Add canEcole
old2 = '  const canStock=["pro","business"].includes(plan?.id);'
new2 = '  const canStock=["pro","business"].includes(plan?.id);\n  const canEcole=["ecole"].includes(plan?.id);'

if old2 in c:
    c = c.replace(old2, new2, 1)
    print("OK canEcole added")
else:
    print("NOT FOUND canStock")

# Add ecole tab
old3 = '[["accueil","🏠"],["historique","📋"],canStock&&["stock","📦"],["recouvrement","💰"]].filter(Boolean)'
new3 = '[["accueil","🏠"],["historique","📋"],canStock&&["stock","📦"],["recouvrement","💰"],canEcole&&["ecole","🏫"]].filter(Boolean)'

if old3 in c:
    c = c.replace(old3, new3, 1)
    print("OK ecole tab added")
else:
    print("NOT FOUND tab")

# Add ecole content before closing div
old4 = '      {onglet==="recouvrement"&&<EcranRecouvrement'
new4 = '      {onglet==="ecole"&&<ModuleEcole user={user} config={config}/> }\n      {onglet==="recouvrement"&&<EcranRecouvrement'

if old4 in c:
    c = c.replace(old4, new4, 1)
    print("OK ecole content added")
else:
    print("NOT FOUND recouvrement")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
