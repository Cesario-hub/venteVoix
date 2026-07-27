f = open('src/App.jsx', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Fix line 1160 (index 1159)
correct_line = '  const stockFiltre=(!searchStock&&triCategorie==="tous")?stock:stock.filter(a=>(triCategorie==="tous"||(a.categorie||"General")===triCategorie)&&(!searchStock||a.nom.toLowerCase().includes(searchStock.toLowerCase())||(a.code||"").toLowerCase().includes(searchStock.toLowerCase())));\n'

print("Old line:", repr(lines[1159][:80]))
lines[1159] = correct_line
print("New line:", repr(lines[1159][:80]))

f = open('src/App.jsx', 'w', encoding='utf-8')
f.writelines(lines)
f.close()
print("Done")
