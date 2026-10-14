#!/usr/bin/env sh
# What the container that serves the shell must do (Annex H, rule 4 and the checklist). Run INSIDE the test network by
# scripts/test.sh, against the real image: sh tests/serve.sh http://shell:4200
set -u
BASE="${1:-http://shell:4200}"
PORTAL_ORIGIN='Origin: http://localhost:4201'
fail=0

check() {  # description, expected status, curl arguments...
  desc="$1"; want="$2"; shift 2
  got=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  if [ "$got" = "$want" ]; then echo "  ok    $desc ($got)"; else echo "  FAIL  $desc: want $want, got $got"; fail=1; fi
}
contains() {  # description, expected text, curl arguments...
  desc="$1"; want="$2"; shift 2
  if curl -s -i "$@" | grep -qi -- "$want"; then echo "  ok    $desc"; else echo "  FAIL  $desc: missing $want"; fail=1; fi
}
absent() {  # description, forbidden text, curl arguments...
  desc="$1"; bad="$2"; shift 2
  if curl -s -i "$@" | grep -qi -- "$bad"; then echo "  FAIL  $desc: found $bad"; fail=1; else echo "  ok    $desc"; fi
}

echo "the application"
check    "the root answers"                                         200 "$BASE/"
contains "...with the page of the shell"                            '<div id="root">' "$BASE/"
check    "a route of the client answers with the page, not a 404"   200 "$BASE/catalog/products/7f3a"
contains "...and it is the page of the shell"                       '<div id="root">' "$BASE/catalog/products/7f3a"
check    "the health probe answers"                                 200 "$BASE/health"

echo "what must never be cached (Annex H, rule 4)"
contains "remoteEntry.js is never cached"                           'Cache-Control: no-store' "$BASE/remoteEntry.js"
contains "the page is revalidated every time"                       'Cache-Control: no-cache' "$BASE/index.html"
contains "a route of the client is revalidated too"                 'Cache-Control: no-cache' "$BASE/catalog"
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/mf-manifest.json")" = 200 ]; then
  contains "the federation manifest is never cached"                'Cache-Control: no-store' "$BASE/mf-manifest.json"
else
  echo "  ok    this build has no federation manifest to cache"
fi

echo "what can be cached for good"
asset=$(curl -s "$BASE/" | grep -oE '/assets/[^"]+\.js' | head -1)
if [ -z "$asset" ]; then echo "  FAIL  the page names no script under /assets/"; fail=1; else
  check    "a hashed file answers"                                  200 "$BASE$asset"
  contains "...and is cached for a year, immutable"                 'Cache-Control: public, max-age=31536000, immutable' "$BASE$asset"
fi
check    "a file that does not exist is a 404, not the page"        404 "$BASE/assets/does-not-exist.js"

echo "who may load the shell's files from another origin (the portals take shell/apiClient)"
contains "a portal origin may read remoteEntry.js"                  'Access-Control-Allow-Origin: http://localhost:4201' -H "$PORTAL_ORIGIN" "$BASE/remoteEntry.js"
absent   "an unknown origin may not"                                'Access-Control-Allow-Origin: http' -H 'Origin: http://evil.example' "$BASE/remoteEntry.js"
if [ -n "$asset" ]; then
  contains "a portal origin may read the shared chunks too"         'Access-Control-Allow-Origin: http://localhost:4201' -H "$PORTAL_ORIGIN" "$BASE$asset"
fi

echo "headers"
contains "responses are not sniffed"                                'X-Content-Type-Options: nosniff' "$BASE/"
contains "the page cannot be framed"                                'X-Frame-Options: DENY' "$BASE/"
contains "the referrer is not leaked"                               'Referrer-Policy: strict-origin-when-cross-origin' "$BASE/"
absent   "the server does not say which nginx it is"                'nginx/' "$BASE/"

exit $fail
