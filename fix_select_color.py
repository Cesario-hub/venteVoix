f = open('src/ModuleEcole.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Fix all select elements - add color
old1 = 'outline:"none",background:"#FFF",cursor:"pointer"'
new1 = 'outline:"none",background:"#FFF",cursor:"pointer",color:"#111827"'
count1 = c.count(old1)
c = c.replace(old1, new1)
print(f"Fixed {count1} select colors")

# Fix select in Paiements - eleve dropdown
old2 = 'outline:"none",background:"#FFF"}}'
new2 = 'outline:"none",background:"#FFF",color:"#111827"}}'
count2 = c.count(old2)
c = c.replace(old2, new2)
print(f"Fixed {count2} select backgrounds")

# Fix eleveId comparison - use String consistently
old3 = 'value={e.id}>{e.nom}'
new3 = 'value={String(e.id)}>{e.nom}'
count3 = c.count(old3)
c = c.replace(old3, new3)
print(f"Fixed {count3} option values")

f = open('src/ModuleEcole.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
