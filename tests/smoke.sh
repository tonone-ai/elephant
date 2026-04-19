#!/usr/bin/env bash
# Smoke test: autorecord hook should append a caveman-compressed entry to
# ELEPHANT.md when a `git commit -m "feat: ..."` bash command is about to run.
# Runs in an isolated tmp git repo so it can't touch the real repo memory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOOK="${REPO_ROOT}/hooks/elephant-autorecord.js"

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

# Isolate HOME so the hook's global memory write lands in the sandbox.
export HOME="${WORK}/home"
mkdir -p "${HOME}"

cd "${WORK}"
git init -q .
git config user.email "smoke@test.local"
git config user.name "smoke"

echo "seed" >file.txt
git add file.txt
git commit -q -m "chore: seed"

PAYLOAD='{"tool_input":{"command":"git commit -m \"feat: add smoke test\""}}'
echo "${PAYLOAD}" | node "${HOOK}"

if [[ ! -f ELEPHANT.md ]]; then
	echo "::error::ELEPHANT.md was not created"
	exit 1
fi

if ! grep -q "feat: add smoke test" ELEPHANT.md; then
	echo "::error::ELEPHANT.md missing expected entry"
	cat ELEPHANT.md
	exit 1
fi

# Idempotence: running the same payload twice must not duplicate the line.
echo "${PAYLOAD}" | node "${HOOK}"
COUNT=$(grep -c "feat: add smoke test" ELEPHANT.md || true)
if [[ ${COUNT} != "1" ]]; then
	echo "::error::duplicate entry written (count=${COUNT})"
	cat ELEPHANT.md
	exit 1
fi

# Global memory mirror should exist too.
GLOBAL="${HOME}/.claude/elephant/memory.md"
if [[ ! -f ${GLOBAL} ]]; then
	echo "::error::global memory file missing at ${GLOBAL}"
	exit 1
fi

echo "✓ autorecord smoke test passed"
