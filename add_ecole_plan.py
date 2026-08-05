f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Find PLANS array end and add ecole
idx = c.find('const PLANS=')
end = c.find('];', idx) + 2
plans_section = c[idx:end]
print("PLANS section:", repr(plans_section[-200:]))

# Add ecole plan before ];
old = plans_section[-3:]  # last '];'
new_plan = '\n  {id:"ecole",name:"\u00c9cole",price:"20 000",xof:20000,color:"#7C3AED",badge:"\U0001f3eb Rentr\u00e9e",features:["Tout Business inclus","Gestion \u00e9l\u00e8ves compl\u00e8te","Recouvrement scolarit\u00e9","Rappels WhatsApp parents","Utilisateurs illimit\u00e9s"]},\n];'

# Replace last ]; in plans section
new_plans = plans_section[:-3] + new_plan
c = c[:idx] + new_plans + c[end:]

if 'id:"ecole"' in c:
    print("OK ecole plan added")
else:
    print("NOT FOUND")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
