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

# Stable vFiscal service worker: rotate cache without deleting the newly installed cache.
python3 - "$OUT/sw.js" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()
s=re.sub(r"^// vFiscal release 2026-10-03-auth-checkout-fix\\nself\\.skipWaiting\\(\\);\\nself\\.addEventListener\\(\"activate\".*?\\n", "", s, count=1)
s=re.sub(r"const CACHE = '[^']+';", "const CACHE = 'vfiscal-cloudflare-v2.6.4-20261003';", s, count=1)
if "const DYNAMIC_PATHS" not in s:
    s=s.replace(
        "const SHELL = [",
        "const DYNAMIC_PATHS = new Set(['/vfiscal-app','/vfiscal-app.html','/acquista','/acquista.html','/vfiscal-admin','/vfiscal-admin.html','/delete-account','/delete-account.html']);\nconst SHELL = [",
        1
    )
    # Never precache sensitive/dynamic pages.
    s=s.replace("'/'"+"acquista.html',\n", "")
    s=s.replace("'/'"+"vfiscal-app.html',\n", "")
    s=s.replace(
        "if (req.mode === 'navigate') {\nevent.respondWith(",
        "if (req.mode === 'navigate') {\nif (DYNAMIC_PATHS.has(url.pathname)) {\n  event.respondWith(fetch(req,{cache:'no-store'}).catch(async () => (await caches.match('/offline.html'))));\n  return;\n}\nevent.respondWith(",
        1
    )
p.write_text(s)
PY

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
vfiscal-release-2026-10-03-2.6.4
EOF

# Host-level redirect virgaconsulting.it -> www.virgaconsulting.it is managed outside Pages _redirects.

grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/index.html"
grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/vfiscal.html"
grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/vfiscal-app.html"

echo "Virga Consulting build completed successfully."
