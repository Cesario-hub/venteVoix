f = open('src/App.jsx', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

correct_def = '  const stockFiltre=(!searchStock&&triCategorie==="tous")?stock:stock.filter(a=>(triCategorie==="tous"||(a.categorie||"General")===triCategorie)&&(!searchStock||a.nom.toLowerCase().includes(searchStock.toLowerCase())||(a.code||"").toLowerCase().includes(searchStock.toLowerCase())));\n'

for i, line in enumerate(lines):
    if 'stockFiltr' in line:
        print(f"Line {i+1}: {repr(line[:80])}")
        # Fix definition line
        if 'const stockFiltr' in line:
            lines[i] = correct_def
            print(f"  -> FIXED definition at line {i+1}")
        # Fix usage lines - replace stockFiltré with stockFiltre
        elif 'stockFiltré' in line:
            lines[i] = line.replace('stockFiltré', 'stockFiltre')
            print(f"  -> FIXED usage at line {i+1}")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.writelines(lines)
f.close()
print("Done")
