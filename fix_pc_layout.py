f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Add global CSS for PC wide layout
css_tag = '''
// CSS Global PC responsive
const GlobalStyle = () => (
  <style>{`
    @media (min-width: 768px) {
      body { background: #1a1a2e; }
      .vv-container { max-width: 960px !important; margin: 0 auto !important; }
      .vv-modal { max-width: 700px !important; }
    }
  `}</style>
);

'''

replacements = [
    ('maxWidth:480,margin:"0 auto"', 'maxWidth:"min(960px,100%)",margin:"0 auto",width:"100%",boxSizing:"border-box"'),
    ('maxWidth:480,maxHeight:"92vh",overflowY:"auto"', 'maxWidth:"min(960px,100%)",maxHeight:"92vh",overflowY:"auto"'),
    ('maxWidth:380,width:"100%"', 'maxWidth:"min(500px,100%)",width:"100%"'),
    ('maxWidth:320,width:"100%"', 'maxWidth:"min(500px,100%)",width:"100%"'),
]

count = 0
for old, new in replacements:
    n = c.count(old)
    if n > 0:
        c = c.replace(old, new)
        print(f"OK replaced {n}x: {old[:40]}")
        count += n
    
print(f"Total: {count} replacements")

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
