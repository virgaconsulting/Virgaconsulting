#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://e681a6e8.vfiscal.pages.dev}"
OUT="${OUT:-dist}"

rm -rf "$OUT"
mkdir -p "$OUT/.well-known" "$OUT/icons" "$OUT/src"

files=(
  ".well-known/security.txt"
  "404.html"
  "acquista.html"
  "delete-account.html"
  "icons/icon-180.png"
  "icons/icon-192.png"
  "icons/icon-512.png"
  "icons/icon-maskable-192.png"
  "icons/icon-maskable-512.png"
  "index.html"
  "manifest.webmanifest"
  "offline.html"
  "privacy.html"
  "robots.txt"
  "sitemap.xml"
  "src/install-pwa.js"
  "src/pwa.js"
  "src/studio.js"
  "support.html"
  "sw.js"
  "terms.html"
  "vfiscal-admin.html"
  "vfiscal-app.html"
  "vfiscal.html"
)

for file in "${files[@]}"; do
  mkdir -p "$OUT/$(dirname "$file")"
  curl --fail --silent --show-error --location --retry 3     "$BASE_URL/$file" -o "$OUT/$file"
done

cat .deploy/runtime.patch.gz.b64.* | tr -d '\n\r' | base64 --decode | gzip --decompress > /tmp/virga-runtime.patch
patch --batch --forward -p1 -d "$OUT" < /tmp/virga-runtime.patch
patch --batch --forward -p1 -d "$OUT" < .deploy/polish.patch

# Replace the verbose vFiscal sales page with the concise conversion-first version.
python3 - "$OUT/vfiscal.html" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
html = p.read_text()
css = Path(".deploy/vfiscal-sales.css").read_text()
main = Path(".deploy/vfiscal-sales-main.html").read_text()
if '<style id="vfiscal-sales-redesign">' not in html:
    html = html.replace('</head>', '<style id="vfiscal-sales-redesign">\\n' + css + '\\n</style>\\n</head>')
start = html.find('<main>')
end = html.find('</main>')
if start == -1 or end == -1 or end < start:
    raise SystemExit("vfiscal.html main section not found")
html = html[:start] + main + html[end+7:]
old_nav = '<a href="index.html">Studio</a><a href="#anteprima">Funzioni</a><a href="#esempio-completo">Esempio</a><a href="#come-funziona">Come funziona</a><a href="#acquista">Prezzo</a><a href="acquista.html">Acquista</a>'
new_nav = '<a href="index.html">Studio</a><a href="#vantaggi">Funzioni</a><a href="#faq">FAQ</a><a href="#prezzo">Prezzo</a><a href="acquista.html">Acquista</a>'
html = html.replace(old_nav, new_nav)
p.write_text(html)
PY

for name in dashboard-workspace purchase-experience landing-preview; do
  base64 --decode ".deploy/${name}.patch.gz.b64" | gzip --decompress > "/tmp/${name}.patch"
  patch --batch --forward -p1 -d "$OUT" < "/tmp/${name}.patch"
done
base64 --decode .deploy/home-vfiscal-workspace.patch.gz.b64 | gzip --decompress > /tmp/home-vfiscal-workspace.patch
patch --batch --forward -p1 -d "$OUT" < /tmp/home-vfiscal-workspace.patch
patch --batch --forward -p1 -d "$OUT" < .deploy/pwa-refresh.patch
patch --batch --forward -p1 -d "$OUT" < .deploy/final-polish.patch


# Inject public Supabase client configuration for vFiscal auth.
python3 - "$OUT/vfiscal-app.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()
config='''<script>
window.VFISCAL_SUPABASE_URL="https://kytgwujzjahatblrkhgh.supabase.co";
window.VFISCAL_SUPABASE_ANON_KEY="sb_publishable_YqARTOD7oZD5Rg2vu6salQ_jGoGhHzY";
window.VFISCAL_API_BASE="https://kytgwujzjahatblrkhgh.supabase.co/functions/v1";
window.VFISCAL_AUTH_REDIRECT="https://www.virgaconsulting.it/vfiscal-app.html";
</script>
'''
needle='<script type="module" src="/src/pwa.js"></script>'
if 'window.VFISCAL_SUPABASE_URL=' not in s:
    if '</head>' in s:
        s=s.replace('</head>',config+'</head>',1)
    else:
        s=s.replace(needle,config+needle,1)
p.write_text(s)
PY


# vFiscal robust auth bootstrap: wait for Supabase module and improve registration UX.
python3 - "$OUT/vfiscal-app.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()

old="""async function vfEnsurePublicConfig(){
  return vfConfigReady();
}"""
new="""async function vfEnsurePublicConfig(){
  if(!vfConfigReady()) return false;
  if(window.supabase?.createClient) return true;
  for(let i=0;i<30;i++){
    await new Promise(r=>setTimeout(r,100));
    if(window.supabase?.createClient) return true;
  }
  try{
    const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm');
    if(mod?.createClient) window.supabase={createClient:mod.createClient};
  }catch(err){ console.error('Supabase bootstrap failed',err); }
  return !!window.supabase?.createClient;
}"""
if old in s:
    s=s.replace(old,new,1)

s=s.replace(
'Accesso temporaneamente non configurato. Verifica le variabili Supabase del deploy.',
'Connessione al servizio non riuscita. Ricarica la pagina; se il problema persiste contatta l’assistenza.'
)

s=s.replace(
'<label id="vfRegisterConsentWrap" style="display:flex;gap:8px;align-items:flex-start;font-size:11px;font-weight:600;line-height:1.45;margin:10px 0 14px">',
'<label id="vfRegisterConsentWrap" style="display:none;gap:8px;align-items:flex-start;font-size:11px;font-weight:600;line-height:1.45;margin:10px 0 14px">'
)
s=s.replace(
'<button type="button" onclick="vfRegister()">Crea account</button>',
'<button id="vfRegisterModeBtn" type="button" onclick="vfOpenRegisterMode()">Crea account</button>'
)

anchor="function vfShowLogin(){document.getElementById('vfAuthGate')?.classList.remove('vf-auth-hidden')}"
extra="""function vfOpenRegisterMode(){
  const heading=document.getElementById('vfAuthHeading'),intro=document.getElementById('vfAuthIntro');
  const consent=document.getElementById('vfRegisterConsentWrap'),login=document.getElementById('vfLoginBtn');
  const mode=document.getElementById('vfRegisterModeBtn');
  if(heading)heading.textContent='Crea il tuo account vFiscal';
  if(intro)intro.textContent='Usa l’email collegata al tuo acquisto oppure quella comunicata a Virga Consulting.';
  if(consent)consent.style.display='flex';
  if(login){login.textContent='Crea account';login.setAttribute('onclick','vfRegister()')}
  if(mode){mode.textContent='Hai già un account? Accedi';mode.setAttribute('onclick','vfOpenLoginMode()')}
  vfSetAuthMessage('');
}
function vfOpenLoginMode(){
  const heading=document.getElementById('vfAuthHeading'),intro=document.getElementById('vfAuthIntro');
  const consent=document.getElementById('vfRegisterConsentWrap'),login=document.getElementById('vfLoginBtn');
  const mode=document.getElementById('vfRegisterModeBtn');
  if(heading)heading.textContent='Accedi a vFiscal';
  if(intro)intro.textContent='Hai già acquistato o sei cliente Virga Consulting? Accedi al tuo account.';
  if(consent)consent.style.display='none';
  if(login){login.textContent='Accedi';login.setAttribute('onclick','vfLogin()')}
  if(mode){mode.textContent='Crea account';mode.setAttribute('onclick','vfOpenRegisterMode()')}
  vfSetAuthMessage('');
}
"""
if extra not in s and anchor in s:
    s=s.replace(anchor,anchor+"\n"+extra,1)

# Ensure init waits on actual bootstrap result rather than re-checking too early.
s=s.replace(
"""  await vfEnsurePublicConfig();
  const params=new URLSearchParams(location.search);""",
"""  const publicReady=await vfEnsurePublicConfig();
  const params=new URLSearchParams(location.search);""",
1)
s=s.replace(
"""  if(!vfConfigReady()||!window.supabase){""",
"""  if(!publicReady||!vfConfigReady()||!window.supabase?.createClient){""",
1)

p.write_text(s)
PY


# vFiscal paid-only registration gate: public users can register only after a verified Stripe checkout.
python3 - "$OUT/vfiscal-app.html" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()

s=s.replace(
  'Accedi al tuo account oppure creane uno nuovo per attivare vFiscal.',
  'Accedi al tuo account vFiscal.'
)
s=s.replace(
  '<button id="vfRegisterModeBtn" type="button" onclick="vfOpenRegisterMode()">Crea account</button>',
  '<button id="vfRegisterModeBtn" type="button" onclick="vfOpenRegisterMode()" style="display:none">Crea account</button>'
)

mode_pattern=r"function vfOpenRegisterMode\(\)\{.*?\n\}\nfunction vfOpenLoginMode\(\)\{.*?\n\}"
mode_replacement="""function vfCanRegister(){
  const pending=vfPendingCheckoutSession();
  return !!(pending&&pending.startsWith('cs_'));
}
function vfOpenRegisterMode(){
  if(!vfCanRegister()){
    location.href='acquista.html';
    return;
  }
  const heading=document.getElementById('vfAuthHeading'),intro=document.getElementById('vfAuthIntro');
  const consent=document.getElementById('vfRegisterConsentWrap'),login=document.getElementById('vfLoginBtn');
  const mode=document.getElementById('vfRegisterModeBtn');
  if(heading)heading.textContent='Completa il tuo account vFiscal';
  if(intro)intro.textContent='Pagamento verificato: usa la stessa email dell’acquisto e scegli la tua password.';
  if(consent)consent.style.display='flex';
  if(login){login.textContent='Crea account';login.setAttribute('onclick','vfRegister()')}
  if(mode){mode.style.display='inline';mode.textContent='Hai già un account? Accedi';mode.setAttribute('onclick','vfOpenLoginMode()')}
  vfSetAuthMessage('');
}
function vfOpenLoginMode(){
  const heading=document.getElementById('vfAuthHeading'),intro=document.getElementById('vfAuthIntro');
  const consent=document.getElementById('vfRegisterConsentWrap'),login=document.getElementById('vfLoginBtn');
  const mode=document.getElementById('vfRegisterModeBtn');
  if(heading)heading.textContent='Accedi a vFiscal';
  if(intro)intro.textContent='Accedi con le credenziali del tuo account vFiscal.';
  if(consent)consent.style.display='none';
  if(login){login.textContent='Accedi';login.setAttribute('onclick','vfLogin()')}
  if(mode){
    if(vfCanRegister()){
      mode.style.display='inline';
      mode.textContent='Completa registrazione';
      mode.setAttribute('onclick','vfOpenRegisterMode()');
    }else{
      mode.style.display='none';
    }
  }
  vfSetAuthMessage('');
}"""
s,n=re.subn(mode_pattern,mode_replacement,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit("registration mode functions not found")

old_checkout="""    }else{
      vfShowLogin();
      vfSetAuthMessage('Pagamento ricevuto. Ora accedi oppure crea un account con la stessa email usata su Stripe: collegheremo automaticamente l’acquisto.');
    }"""
new_checkout="""    }else{
      vfShowLogin();
      vfOpenRegisterMode();
      vfSetAuthMessage('Pagamento ricevuto. Completa ora la creazione del tuo account con la stessa email usata su Stripe.');
    }"""
if old_checkout in s:
    s=s.replace(old_checkout,new_checkout,1)

reg_pattern=r"async function vfRegister\(\)\{.*?\n\}\nasync function vfResetPassword\(\)"
reg_replacement="""async function vfRegister(){
  if(!vfSupabase){vfSetAuthMessage('Registrazione non disponibile in questo momento.',true);return}
  const pending=vfPendingCheckoutSession();
  if(!pending||!pending.startsWith('cs_')){
    vfSetAuthMessage('Per creare un account devi prima completare l’acquisto di vFiscal.',true);
    return;
  }
  const email=document.getElementById('vfAuthEmail')?.value.trim(),password=document.getElementById('vfAuthPassword')?.value||'';
  if(!email||password.length<8){vfSetAuthMessage('Inserisci la stessa email usata per il pagamento e una password di almeno 8 caratteri.',true);return}
  if(!document.getElementById('vfRegisterTerms')?.checked){vfSetAuthMessage('Per completare l’account devi accettare i Termini di servizio e prendere visione della Privacy Policy.',true);return}

  vfSetAuthMessage('Verifica pagamento e creazione account…');
  try{
    const res=await fetch(vfApiUrl('/vfiscal-register-paid'),{
      method:'POST',
      headers:{'apikey':window.VFISCAL_SUPABASE_ANON_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password,session_id:pending})
    });
    const out=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(out.error||'Registrazione non disponibile');

    const {data,error}=await vfSupabase.auth.signInWithPassword({email,password});
    if(error||!data?.session)throw new Error('Account creato, ma l’accesso automatico non è riuscito. Prova ad accedere.');
    vfSetAuthMessage('Account creato. vFiscal è attivo.');
    history.replaceState({},'',location.pathname);
    await vfApplySession(data.session,'SIGNED_IN');
  }catch(err){
    console.error(err);
    vfSetAuthMessage(err.message||'Registrazione non riuscita.',true);
  }
}
async function vfResetPassword()"""
s,n=re.subn(reg_pattern,reg_replacement,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit("vfRegister function not found")

# The public app must never expose the direct Supabase sign-up primitive.
if "auth.signUp(" in s:
    raise SystemExit("direct public Supabase signUp still present")

p.write_text(s)
PY

# Admin-only creation of complimentary Virga Consulting accounts.
python3 - "$OUT/vfiscal-admin.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()

s=s.replace(
  '.grant{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;',
  '.grant{display:grid;grid-template-columns:minmax(240px,1fr) auto auto auto;'
)
s=s.replace(
  '<button class="btn" onclick="act(\'grant\')">Attiva incluso</button>',
  '<button class="btn" onclick="act(\'create\')">Crea account incluso</button>\n        <button class="btn secondary" onclick="act(\'grant\')">Attiva incluso</button>'
)

old="""async function act(action){try{const email=$('clientEmail').value.trim();if(!email)throw new Error('Inserisci l’email del cliente.');setMsg('msg','Aggiornamento…');await call({action,email});setMsg('msg',action==='grant'?'Accesso incluso attivato.':'Accesso incluso revocato.');await load()}catch(e){setMsg('msg',e.message,true)}}"""
new="""async function act(action){try{const email=$('clientEmail').value.trim();if(!email)throw new Error('Inserisci l’email del cliente.');setMsg('msg',action==='create'?'Creazione account…':'Aggiornamento…');const out=await call({action,email});if(action==='create'){if(out.temporary_password){setMsg('msg','Account cliente creato e vFiscal incluso. Password temporanea: '+out.temporary_password+' — comunicala solo al cliente.');}else{setMsg('msg','Account già esistente: accesso Virga Consulting incluso attivato.');}}else{setMsg('msg',action==='grant'?'Accesso incluso attivato.':'Accesso incluso revocato.');}await load()}catch(e){setMsg('msg',e.message,true)}}"""
if old not in s:
    raise SystemExit("admin act function not found")
s=s.replace(old,new,1)

p.write_text(s)
PY


# vFiscal simplified studio admin UX.
python3 - "$OUT/vfiscal-admin.html" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()

style=r'''
<style id="vf-admin-simple-ui">
.simple-create{margin:8px 0 18px;padding:20px;border:1px solid #dfe6dc;border-radius:18px;background:#f7faf4}
.simple-create-title{font:700 24px/1.15 Georgia,serif;color:#0b3d70;margin:0 0 5px}
.simple-create-sub{margin:0 0 16px;color:#6f7d89;font-size:13px;line-height:1.5}
.simple-create-row{display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:10px;align-items:end}
.simple-create-row label{margin-top:0}
.simple-create-row .btn{min-height:44px;padding-left:22px;padding-right:22px}
.created-client{display:none;margin:14px 0 0;padding:16px;border-radius:14px;background:#eef7ea;border:1px solid #cedfc7}
.created-client.show{display:block}
.created-client strong{display:block;color:#225d31;margin-bottom:7px}
.credential-line{display:grid;grid-template-columns:115px minmax(0,1fr) auto;gap:8px;align-items:center;margin-top:7px}
.credential-label{font-size:11px;font-weight:800;color:#687783;text-transform:uppercase;letter-spacing:.04em}
.credential-value{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#fff;border:1px solid #d8e1d4;border-radius:9px;padding:9px 10px;overflow:auto}
.copy-btn{border:1px solid #b7c8b2;background:#fff;color:#194d2a;border-radius:9px;padding:9px 11px;font-weight:800;cursor:pointer}
.admin-advanced{margin:12px 0 22px;border:1px solid #e4dfd6;border-radius:14px;background:#fff}
.admin-advanced summary{cursor:pointer;padding:13px 15px;font-weight:800;color:#31516f}
.admin-advanced-body{padding:0 15px 15px}
.admin-advanced-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.admin-advanced-actions .btn{width:auto}
#msg:empty{display:none}
@media(max-width:650px){
  .simple-create-row{grid-template-columns:1fr}
  .simple-create-row .btn{width:100%}
  .credential-line{grid-template-columns:1fr}
  .copy-btn{width:100%}
}
</style>
'''
if 'vf-admin-simple-ui' not in s:
    s=s.replace('</head>',style+'</head>',1)

# Rename the main everyday section.
s=s.replace('Accesso incluso Virga Consulting','Nuovo cliente studio',1)
s=s.replace(
    'Usalo solo per clienti dello studio ai quali vFiscal è incluso senza pagamento separato.',
    'Inserisci l’email del cliente. vFiscal creerà l’account gratuito dello Studio e ti mostrerà una password temporanea da consegnargli.',
    1
)
s=s.replace('Clienti e iscrizioni','I tuoi clienti vFiscal',1)

# Simplify the create area and move technical access actions under an expandable panel.
pattern=r'''<div class="grant">\s*(<input[^>]*id="clientEmail"[^>]*>)\s*<button class="btn" onclick="act\('create'\)">Crea account incluso</button>\s*<button class="btn secondary" onclick="act\('grant'\)">Attiva incluso</button>\s*<button class="btn danger" onclick="act\('revoke'\)">Revoca incluso</button>\s*</div>'''
replacement=r'''<div class="simple-create">
        <h3 class="simple-create-title">Nuovo cliente studio</h3>
        <p class="simple-create-sub">Crea in pochi secondi un account vFiscal incluso nel servizio Virga Consulting.</p>
        <div class="simple-create-row">
          <div><label for="clientEmail">Email cliente</label>\1</div>
          <button class="btn" onclick="act('create')">+ Crea cliente</button>
        </div>
        <div id="createdClientResult" class="created-client">
          <strong>✓ Cliente creato e vFiscal attivato</strong>
          <div class="credential-line">
            <span class="credential-label">Email</span>
            <span id="createdClientEmail" class="credential-value">—</span>
          </div>
          <div id="createdPasswordLine" class="credential-line">
            <span class="credential-label">Password</span>
            <span id="createdClientPassword" class="credential-value">—</span>
            <button type="button" class="copy-btn" onclick="copyTempPassword()">Copia password</button>
          </div>
          <div id="existingClientNote" class="small" style="display:none;margin-top:9px">Account già esistente: ho semplicemente attivato l’accesso incluso.</div>
        </div>
      </div>
      <details class="admin-advanced">
        <summary>Gestione accesso esistente</summary>
        <div class="admin-advanced-body">
          <div class="small">Usa queste azioni solo per un account già presente. L’email è quella inserita sopra.</div>
          <div class="admin-advanced-actions">
            <button class="btn secondary" onclick="act('grant')">Attiva accesso incluso</button>
            <button class="btn danger" onclick="act('revoke')">Revoca accesso incluso</button>
          </div>
        </div>
      </details>'''
s,n=re.subn(pattern,replacement,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit("simple admin create area not found")

old="""async function act(action){try{const email=$('clientEmail').value.trim();if(!email)throw new Error('Inserisci l’email del cliente.');setMsg('msg',action==='create'?'Creazione account…':'Aggiornamento…');const out=await call({action,email});if(action==='create'){if(out.temporary_password){setMsg('msg','Account cliente creato e vFiscal incluso. Password temporanea: '+out.temporary_password+' — comunicala solo al cliente.');}else{setMsg('msg','Account già esistente: accesso Virga Consulting incluso attivato.');}}else{setMsg('msg',action==='grant'?'Accesso incluso attivato.':'Accesso incluso revocato.');}await load()}catch(e){setMsg('msg',e.message,true)}}"""
new="""async function act(action){
  try{
    const email=$('clientEmail').value.trim();
    if(!email)throw new Error('Inserisci l’email del cliente.');
    setMsg('msg',action==='create'?'Creazione cliente…':'Aggiornamento…');
    const out=await call({action,email});

    if(action==='create'){
      const box=$('createdClientResult'),emailEl=$('createdClientEmail'),passEl=$('createdClientPassword');
      const passLine=$('createdPasswordLine'),existingNote=$('existingClientNote');
      if(emailEl)emailEl.textContent=email;
      if(box)box.classList.add('show');

      if(out.temporary_password){
        if(passEl)passEl.textContent=out.temporary_password;
        if(passLine)passLine.style.display='grid';
        if(existingNote)existingNote.style.display='none';
        setMsg('msg','Cliente creato. Copia la password temporanea e comunicala al cliente.');
      }else{
        if(passEl)passEl.textContent='—';
        if(passLine)passLine.style.display='none';
        if(existingNote)existingNote.style.display='block';
        setMsg('msg','Account già esistente: accesso incluso attivato.');
      }
    }else{
      setMsg('msg',action==='grant'?'Accesso incluso attivato.':'Accesso incluso revocato.');
    }
    await load();
  }catch(e){
    setMsg('msg',e.message,true);
  }
}
async function copyTempPassword(){
  const value=$('createdClientPassword')?.textContent?.trim();
  if(!value||value==='—')return;
  try{
    await navigator.clipboard.writeText(value);
    setMsg('msg','Password temporanea copiata.');
  }catch{
    setMsg('msg','Seleziona e copia manualmente la password mostrata.',true);
  }
}"""
if old not in s:
    raise SystemExit("simple admin act function not found")
s=s.replace(old,new,1)

# Make technical outbound tools visually secondary.
script=r'''
<script id="vf-admin-simple-runtime">
document.addEventListener('DOMContentLoaded',()=>{
  const topActions=document.querySelector('.top-actions');
  if(topActions && !topActions.closest('details')){
    const details=document.createElement('details');
    details.className='admin-advanced';
    const summary=document.createElement('summary');
    summary.textContent='Strumenti tecnici';
    const body=document.createElement('div');
    body.className='admin-advanced-body';
    topActions.parentNode.insertBefore(details,topActions);
    details.appendChild(summary);
    details.appendChild(body);
    body.appendChild(topActions);
  }
});
</script>
'''
if 'vf-admin-simple-runtime' not in s:
    s=s.replace('</body>',script+'</body>',1)

p.write_text(s)
PY


# vFiscal admin navigation bridge.
python3 - "$OUT/vfiscal-admin.html" "$OUT/vfiscal-app.html" <<'PY'
from pathlib import Path
import sys, re

admin=Path(sys.argv[1])
app=Path(sys.argv[2])
sa=admin.read_text()
sv=app.read_text()

# Admin page: permanent navigation back to public site / vFiscal.
nav_style=r'''
<style id="vf-admin-nav-style">
.vf-admin-nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.vf-admin-nav a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:10px;padding:9px 12px;font-weight:800;font-size:12px}
.vf-admin-nav .home{background:#fff;color:#0b3d70;border:1px solid #c8d2db}
.vf-admin-nav .app{background:#0b3d70;color:#fff;border:1px solid #0b3d70}
@media(max-width:520px){.vf-admin-nav a{flex:1 1 140px}}
</style>
'''
if 'vf-admin-nav-style' not in sa:
    sa=sa.replace('</head>',nav_style+'</head>',1)

nav_html=r'''
<div class="vf-admin-nav">
  <a class="home" href="/index.html">← Torna al sito</a>
  <a class="app" href="/vfiscal-app.html">Apri vFiscal</a>
</div>
'''
# Put navigation directly under the admin intro/header area.
if '← Torna al sito' not in sa:
    m=re.search(r'(<h1>Gestione clienti</h1>\s*<p>.*?</p>)',sa,re.S)
    if m:
        sa=sa[:m.end()]+nav_html+sa[m.end():]
    else:
        sa=sa.replace('<body>','<body>'+nav_html,1)

admin.write_text(sa)

# vFiscal app: show a management button only when the logged-in account is an admin.
admin_btn=r'''
<a id="vfAdminShortcut" href="/vfiscal-admin.html" style="display:none;text-decoration:none;margin:10px 0 0;padding:10px 13px;border-radius:10px;background:#0b3d70;color:#fff;font-weight:800;font-size:12px;align-items:center;justify-content:center">Gestione clienti →</a>
'''
if 'id="vfAdminShortcut"' not in sv:
    # Attach near the account section if present, otherwise before body end.
    anchors=[
      'ACCOUNT vFISCAL 2.0',
      'Il tuo accesso vFiscal',
      '</body>'
    ]
    inserted=False
    for a in anchors:
        pos=sv.find(a)
        if pos!=-1:
            if a=='</body>':
                sv=sv.replace('</body>',admin_btn+'</body>',1)
            else:
                end=sv.find('</',pos)
                if end!=-1:
                    sv=sv[:end]+admin_btn+sv[end:]
                else:
                    sv=sv[:pos]+admin_btn+sv[pos:]
            inserted=True
            break

probe=r'''
<script id="vf-admin-shortcut-probe">
async function vfRefreshAdminShortcut(){
  const btn=document.getElementById('vfAdminShortcut');
  if(!btn||!window.vfSupabase)return;
  try{
    const {data:{session}}=await vfSupabase.auth.getSession();
    if(!session){btn.style.display='none';return}
    const base=(window.VFISCAL_API_BASE||'').replace(/\/$/,'');
    const res=await fetch(base+'/vfiscal-admin-clients',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+session.access_token,
        apikey:window.VFISCAL_SUPABASE_ANON_KEY,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({action:'list'})
    });
    btn.style.display=res.ok?'inline-flex':'none';
  }catch{
    btn.style.display='none';
  }
}
window.addEventListener('load',()=>setTimeout(vfRefreshAdminShortcut,700));
</script>
'''
if 'vf-admin-shortcut-probe' not in sv:
    sv=sv.replace('</body>',probe+'</body>',1)

# Refresh shortcut after a successful login/session application.
sv=sv.replace(
    "await vfApplySession(data.session,'SIGNED_IN');",
    "await vfApplySession(data.session,'SIGNED_IN'); setTimeout(vfRefreshAdminShortcut,250);"
)

app.write_text(sv)
PY

# vFiscal service worker: never cache auth, checkout or admin routes.
cat > "$OUT/sw.js" <<'EOF'
const CACHE = 'vfiscal-cloudflare-v2.8.2-20261005';
const DYNAMIC_PATHS = new Set([
  '/vfiscal-app','/vfiscal-app.html',
  '/acquista','/acquista.html',
  '/vfiscal-admin','/vfiscal-admin.html',
  '/delete-account','/delete-account.html'
]);
const SHELL = [
  '/','/index.html','/vfiscal.html',
  '/privacy.html','/terms.html','/support.html','/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-180.png','/icons/icon-192.png','/icons/icon-512.png',
  '/icons/icon-maskable-192.png','/icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (DYNAMIC_PATHS.has(url.pathname)) {
    event.respondWith(fetch(req, {cache:'no-store'}).catch(() => caches.match('/offline.html')));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(async () => (await caches.match(req)) || (await caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && ['style','script','image','font','manifest'].includes(req.destination)) {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
      }
      return res;
    }))
  );
});
EOF


cat > "$OUT/_headers" <<'EOF'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://kytgwujzjahatblrkhgh.supabase.co wss://kytgwujzjahatblrkhgh.supabase.co; manifest-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests

/vfiscal-app.html
  Cache-Control: no-cache, no-store, must-revalidate

/vfiscal-app
  Cache-Control: no-cache, no-store, must-revalidate

/acquista.html
  Cache-Control: no-cache, no-store, must-revalidate

/acquista
  Cache-Control: no-cache, no-store, must-revalidate

/vfiscal-admin.html
  Cache-Control: no-cache, no-store, must-revalidate

/vfiscal-admin
  Cache-Control: no-cache, no-store, must-revalidate

/delete-account.html
  Cache-Control: no-cache, no-store, must-revalidate

/delete-account
  Cache-Control: no-cache, no-store, must-revalidate

/src/pwa.js
  Cache-Control: no-cache, must-revalidate

/src/install-pwa.js
  Cache-Control: no-cache, must-revalidate

/manifest.webmanifest
  Cache-Control: no-cache, must-revalidate

/release.txt
  Cache-Control: no-cache, no-store, must-revalidate

/sw.js
  Cache-Control: no-cache, must-revalidate

/
  Cache-Control: no-cache, must-revalidate

/index.html
  Cache-Control: no-cache, must-revalidate

/vfiscal.html
  Cache-Control: no-cache, must-revalidate

/vfiscal
  Cache-Control: no-cache, must-revalidate
EOF

cat > "$OUT/release.txt" <<'EOF'
vfiscal-release-2026-10-05-2.8.2
EOF

# Host-level redirect virgaconsulting.it -> www.virgaconsulting.it is managed outside Pages _redirects.

grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/index.html"
grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/vfiscal.html"
grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/vfiscal-app.html"

echo "Virga Consulting build completed successfully."
