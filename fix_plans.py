f = open('src/App.jsx', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

print("Line 43:", repr(lines[42]))

# Fix line 43
lines[42] = '  {id:"business", name:"Business", price:"12 000", xof:12000, color:C.accent, badge:"\U0001f3c6 Complet",\n'

print("Fixed:", repr(lines[42]))

f = open('src/App.jsx', 'w', encoding='utf-8')
f.writelines(lines)
f.close()
print("Done")
