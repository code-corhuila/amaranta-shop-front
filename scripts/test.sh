#!/usr/bin/env bash
# Everything the shell must pass, with Docker only (nothing is installed):
#
#   bash scripts/test.sh
#
# It builds the `test` stage of deploy/Dockerfile: `npm ci` from the versioned lock file, the strict type check and the
# test suite. The stage is never taken from the cache, so a green run always means the tests ran just now. It is the
# same script the pull request runs.
set -euo pipefail
cd "$(dirname "$0")/.."
# Git Bash on Windows must not rewrite the container paths given to docker.
MSYS_NO_PATHCONV=1 docker build --progress=plain --no-cache-filter test --target test -f deploy/Dockerfile .
echo "OK: the shell passes every check"
