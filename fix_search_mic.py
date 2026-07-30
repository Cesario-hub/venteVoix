f = open('src/App.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# Find and fix the search MicButton
old = '''              <MicButton
                onStart={()=>{
                  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
                  if(!SR) return;
                  const rec=new SR();rec.lang="fr-FR";rec.interimResults=false;
                  window._searchRec=rec;
                  rec.onresult=e=>setSearchAccueil(e.results[0][0].transcript);
                  rec.start();
                }}
                onStop={()=>window._searchRec?.stop()}
                label="🎤"
                style={{background:C.primary,border:"none",borderRadius:10,padding:"0 14px",color:"#FFF",fontSize:16,cursor:"pointer",whiteSpace:"nowrap"}}/>'''

new = '''              <button onClick={()=>{
                  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
                  if(!SR) return;
                  const rec=new SR();rec.lang="fr-FR";rec.interimResults=false;rec.maxAlternatives=1;
                  rec.onresult=e=>{setSearchAccueil(e.results[0][0].transcript);};
                  rec.onerror=()=>{};
                  rec.start();
                }} style={{background:C.primary,border:"none",borderRadius:10,padding:"0 14px",color:"#FFF",fontSize:16,cursor:"pointer",whiteSpace:"nowrap"}}>🎤</button>'''

if old in c:
    c = c.replace(old, new)
    print("OK search mic fixed")
else:
    print("NOT FOUND - trying with bad emoji")
    # Try with bad encoding
    bad_emoji = '\u00f0\u0178\u017d\u00a4'
    old2 = old.replace('🎤', bad_emoji)
    if old2 in c:
        c = c.replace(old2, new)
        print("OK fixed with bad emoji")
    else:
        # Find MicButton in search context
        idx = c.find('window._searchRec')
        print(repr(c[idx-200:idx+300]))

f = open('src/App.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
