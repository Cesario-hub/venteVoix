f = open('src/ModuleEcole.jsx', 'r', encoding='utf-8')
c = f.read()
f.close()

# The prop 'config' conflicts with useState 'config'
# Solution: rename the prop to 'schoolConfig' in the function signature
old = 'export default function ModuleEcole({user,config,parler:parlerProp}){'
new = 'export default function ModuleEcole({user,config:schoolConfig,parler:parlerProp}){'

if old in c:
    c = c.replace(old, new)
    print("OK prop renamed to schoolConfig")
else:
    print("NOT FOUND signature")

# Also remove the useState for config since we'll use the prop directly
old2 = "  const[config,setConfigR]=useState(()=>lsGet(\"vv_ecole_config\")||{nomEcole:\"\",slogan:\"\",tel:\"\",email:\"\",adresse:\"\",logo:\"\"});\n  const setConfig=v=>{setConfigR(v);lsSet(\"vv_ecole_config\",v);};"
new2 = "  const[eConfig,setConfigR]=useState(()=>lsGet(\"vv_ecole_config\")||schoolConfig||{nomEcole:\"\",slogan:\"\",tel:\"\",email:\"\",adresse:\"\",logo:\"\"});\n  const config=eConfig;\n  const setConfig=v=>{setConfigR(v);lsSet(\"vv_ecole_config\",v);};"

if old2 in c:
    c = c.replace(old2, new2)
    print("OK useState renamed")
else:
    # Try to find it
    idx = c.find('const[config,setConfigR]')
    if idx > 0:
        print(f"Found at {idx}: {repr(c[idx:idx+100])}")
    else:
        print("NOT FOUND useState")

f = open('src/ModuleEcole.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
print("Done")
