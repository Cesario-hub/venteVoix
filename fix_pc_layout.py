f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Fix maxWidth for PC - make it responsive
old = 'maxWidth:480,margin:"0 auto"'
new = 'maxWidth:900,margin:"0 auto",width:"100%",boxSizing:"border-box"'

if old in c:
    c = c.replace(old, new)
    print("OK maxWidth updated to 900px")
else:
    print("NOT FOUND - searching...")
    idx = c.find('maxWidth:')
    while idx > 0:
        snippet = c[idx:idx+50]
        if '480' in snippet:
            print(f"Found at pos {idx}: {repr(snippet)}")
        idx = c.find('maxWidth:', idx+1)
        if idx > 200000:
            break

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
