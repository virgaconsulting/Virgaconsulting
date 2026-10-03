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
patch --batch --forward -p1 -d "$OUT" < /tmp/virga-runtime.patch\npatch --batch --forward -p1 -d "$OUT" < .deploy/polish.patch

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

/acquista.html
  Cache-Control: no-cache, no-store, must-revalidate

/vfiscal-admin.html
  Cache-Control: no-cache, no-store, must-revalidate

/delete-account.html
  Cache-Control: no-cache, no-store, must-revalidate

/src/pwa.js
  Cache-Control: no-cache, must-revalidate

/sw.js
  Cache-Control: no-cache, must-revalidate

/
  Cache-Control: no-cache, must-revalidate

/index.html
  Cache-Control: no-cache, must-revalidate

/vfiscal.html
  Cache-Control: no-cache, must-revalidate
EOF

# Host-level redirect virgaconsulting.it -> www.virgaconsulting.it is managed outside Pages _redirects.

grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/index.html"
grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/vfiscal.html"
grep -q 'VIRGA_BUILD: 2026-10-03-final-cloudflare' "$OUT/vfiscal-app.html"

echo "Virga Consulting build completed successfully."
