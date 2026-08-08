f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Fix main container width
old = 'maxWidth:"min(960px,100%)",margin:"0 auto",width:"100%",boxSizing:"border-box"'
new = 'maxWidth:"min(1100px,100%)",margin:"0 auto",width:"100%",boxSizing:"border-box"'

count = c.count(old)
if count:
    c = c.replace(old, new)
    print(f"OK fixed {count} maxWidth 960->1100")
else:
    # Try other patterns
    old2 = 'maxWidth:900,margin:"0 auto",width:"100%",boxSizing:"border-box"'
    count2 = c.count(old2)
    if count2:
        c = c.replace(old2, 'maxWidth:"min(1100px,100%)",margin:"0 auto",width:"100%",boxSizing:"border-box"')
        print(f"OK fixed {count2} maxWidth 900->1100")
    else:
        # Find current maxWidth in main container
        idx = c.find('minHeight:"100vh"')
        print(repr(c[idx:idx+200]))

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
