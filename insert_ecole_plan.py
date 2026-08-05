f = open('src/App.jsx', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

print("Line 44:", repr(lines[43]))
print("Line 45:", repr(lines[44]))
print("Line 46:", repr(lines[45]))

# Insert ecole plan at line 45 (index 45) before ];
ecole_line1 = '  { id:"ecole", name:"\u00c9cole", price:"20 000", xof:20000, color:"#7C3AED", badge:"\U0001f3eb Rentr\u00e9e",\n'
ecole_line2 = '    features:["Tout Business inclus","Gestion \u00e9l\u00e8ves compl\u00e8te","Recouvrement scolarit\u00e9 automatique","Rappels WhatsApp parents","Utilisateurs illimit\u00e9s"] },\n'

lines.insert(45, ecole_line2)
lines.insert(45, ecole_line1)

print("\nAfter insert:")
print(repr(lines[43:49]))

f = open('src/App.jsx', 'w', encoding='utf-8')
f.writelines(lines)
f.close()
print("Done,", len(lines), "lines")
