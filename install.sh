#!/usr/bin/env bash
set -euo pipefail

# Preferred install path is the marketplace:
#   claude plugin marketplace add tonone-ai/elephant
#   claude plugin install elephant@elephant
#
# This script is a fallback for users who want a direct curl install.
# Override REF to pin a specific tag: REF=v1.7.1 bash install.sh

PLUGIN_DIR="${HOME}/.claude/plugins/elephant"
REF="${REF:-main}"
REPO="https://raw.githubusercontent.com/tonone-ai/elephant/${REF}"

HOOKS=(
	elephant-recall.js
	elephant-engrave.js
	elephant-autorecord.js
	elephant-changelog-guard.js
)

echo "🐘 installing elephant (ref: ${REF})..."

mkdir -p "${PLUGIN_DIR}/.claude-plugin"
mkdir -p "${PLUGIN_DIR}/skills/elephant"
mkdir -p "${PLUGIN_DIR}/hooks"

curl -fsSL "${REPO}/.claude-plugin/plugin.json" -o "${PLUGIN_DIR}/.claude-plugin/plugin.json"
curl -fsSL "${REPO}/skills/elephant/SKILL.md" -o "${PLUGIN_DIR}/skills/elephant/SKILL.md"
curl -fsSL "${REPO}/hooks/hooks.json" -o "${PLUGIN_DIR}/hooks/hooks.json"

for h in "${HOOKS[@]}"; do
	curl -fsSL "${REPO}/hooks/${h}" -o "${PLUGIN_DIR}/hooks/${h}"
done

echo "✓ installed to ${PLUGIN_DIR}"
echo ""
echo "restart Claude Code, then try:"
echo "  /elephant takeover"
