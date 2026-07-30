f = open('src/App.jsx', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Find the broken line
for i, line in enumerate(lines):
    if 'stockFiltre' in line:
        print(f"Line {i+1}: {repr(line[:80])}")

# Fix line 1204 (index 1203)
correct = '  const stockFiltre=(!searchStock&&triCategorie==="tous")?stock:stock.filter(a=>(triCategorie==="tous"||(a.categorie||"General")===triCategorie)&&(!searchStock||a.nom.toLowerCase().includes(searchStock.toLowerCase())||(a.code||"").toLowerCase().includes(searchStock.toLowerCase())));\n'

# Also fix trial line that got merged
trial_line = '  const trialEnd=user?.trialEnd?new Date(user.trialEnd):null;\n'

# Find and fix
fixed = False
for i, line in enumerate(lines):
    if 'stockFiltre' in line and 'trialEnd' in line:
        lines[i] = correct
        lines.insert(i+1, trial_line)
        fixed = True
        print(f"Fixed merged line at {i+1}")
        break
    elif 'stockFiltre' in line and 'tous' in line:
        lines[i] = correct
        fixed = True
        print(f"Fixed line {i+1}")
        break

if not fixed:
    print("NOT FOUND - searching...")
    for i, line in enumerate(lines):
        if 'stockFiltre' in line:
            print(f"  Line {i+1}: {repr(line)}")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.writelines(lines)
f.close()
print("Done")
