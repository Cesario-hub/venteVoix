f = open('src/ModuleEcole.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Fix input text color
old = 'background:CE.surface,transition:"border-color .2s"'
new = 'background:CE.surface,transition:"border-color .2s",color:"#111827"'

count = c.count(old)
print(f"Found {count} occurrences")
c = c.replace(old, new)

# Also fix any input with color:white or color:#FFF
c = c.replace('color:"#FFF",fontSize:13,boxSizing:"border-box",outline:"none"', 'color:"#111827",fontSize:13,boxSizing:"border-box",outline:"none"')

f = open('src/ModuleEcole.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
