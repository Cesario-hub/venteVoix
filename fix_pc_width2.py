f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

old = 'minHeight:"100vh",background:C.bg,fontFamily:"\'Segoe UI\',system-ui,sans-serif",color:C.text,maxWidth:480,margin:"0 auto"'
new = 'minHeight:"100vh",background:C.bg,fontFamily:"\'Segoe UI\',system-ui,sans-serif",color:C.text,maxWidth:"min(1100px,100%)",margin:"0 auto",width:"100%",boxSizing:"border-box"'

count = c.count(old)
print(f"Found {count} occurrences")
c = c.replace(old, new)

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
