#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="${HOME}/.claude/plugins/elephant"
REPO="https://raw.githubusercontent.com/tonone-ai/elephant/main"

echo "🐘 installing elephant..."

mkdir -p "${PLUGIN_DIR}/.claude-plugin"
mkdir -p "${PLUGIN_DIR}/skills/elephant"

curl -fsSL "${REPO}/.claude-plugin/plugin.json" -o "${PLUGIN_DIR}/.claude-plugin/plugin.json"
curl -fsSL "${REPO}/skills/elephant/SKILL.md"   -o "${PLUGIN_DIR}/skills/elephant/SKILL.md"

echo "✓ installed to ${PLUGIN_DIR}"
echo ""
echo "restart Claude Code, then try:"
echo "  /elephant takeover"
