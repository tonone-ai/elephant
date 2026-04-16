#!/usr/bin/env node
// elephant-recall — SessionStart hook
// Reads local + global memory, injects as context. Brief caveman message.

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

// Local memory = project dir (CWD), not plugin install dir
const LOCAL_MEM = path.join(process.cwd(), ".elephant", "memory.md");
const GLOBAL_MEM = path.join(os.homedir(), ".claude", "elephant", "memory.md");
const REPO = path.basename(process.cwd());

function parseFile(filePath, isGlobal) {
  try {
    const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    return lines.map((line) => {
      const important = line.startsWith("[!!]");
      const body = important ? line.slice(4).trim() : line.trim();
      const tsMatch = body.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
      const tsStr = tsMatch ? tsMatch[1] : null;
      const date = tsStr ? new Date(tsStr) : null;
      const rest = tsStr ? body.slice(tsStr.length).replace(/^\s*:\s*/, "") : body;

      let repo = null;
      let text = rest;
      if (isGlobal) {
        const m = rest.match(/^([^:]+?)\s*:\s*(.+)$/);
        if (m) { repo = m[1].trim(); text = m[2].trim(); }
      }

      return { important, tsStr, date, repo, text };
    });
  } catch {
    return [];
  }
}

// Migrate old tonone-stored memory to project dir (one-time, silent on fail)
function migrate() {
  if (fs.existsSync(LOCAL_MEM)) return null;

  const tononeCacheBase = path.join(
    os.homedir(), ".claude", "plugins", "cache", "tonone-ai", "tonone"
  );

  const candidates = [];
  try {
    for (const v of fs.readdirSync(tononeCacheBase)) {
      const candidate = path.join(tononeCacheBase, v, ".elephant", "memory.md");
      try {
        const stat = fs.statSync(candidate);
        candidates.push({ path: candidate, mtime: stat.mtimeMs });
      } catch {}
    }
  } catch {}

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.mtime - a.mtime);
  const source = candidates[0].path;

  try {
    const content = fs.readFileSync(source, "utf8");
    if (!content.trim()) return null;
    fs.mkdirSync(path.dirname(LOCAL_MEM), { recursive: true });
    fs.writeFileSync(LOCAL_MEM, content);
    return (content.split("\n").filter(Boolean).length);
  } catch {
    return null;
  }
}

function emit(systemMessage, additionalContext) {
  process.stdout.write(JSON.stringify({
    systemMessage,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext,
    },
  }) + "\n");
}

function main() {
  const migrated = migrate();

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const cutoff7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const local = parseFile(LOCAL_MEM, false);
  const global = parseFile(GLOBAL_MEM, true).filter(
    (e) => e.repo && e.repo !== REPO
  );

  if (local.length === 0 && global.length === 0) {
    const msg = "🐘 no memory yet. run /elephant takeover to seed from git history.";
    emit(msg, msg);
    return;
  }

  const lines = [];

  const today = local.filter((e) => e.tsStr?.startsWith(todayStr));
  const week = local.filter((e) => !e.tsStr?.startsWith(todayStr) && e.date && e.date >= cutoff7);
  const older = local.filter((e) => e.date && e.date < cutoff7 && e.important);

  for (const e of today) {
    lines.push(`${e.important ? "[!!] " : ""}${e.tsStr} : ${e.text}`);
  }
  const weekBudget = Math.max(0, 10 - today.length);
  for (const e of week.slice(0, weekBudget)) {
    lines.push(`${e.important ? "[!!] " : ""}${e.tsStr} : ${e.text}`);
  }
  for (const e of older) {
    lines.push(`[!!] ${e.tsStr} : ${e.text}`);
  }

  const roomForOthers = 15 - lines.length;
  if (global.length > 0 && roomForOthers >= 2) {
    lines.push("── other repos ──");
    for (const e of global.slice(0, roomForOthers - 1)) {
      const d = e.tsStr ? e.tsStr.slice(5, 10) : "??-??";
      lines.push(`${e.repo} : ${e.text} (${d})`);
    }
  }

  const capped = lines.slice(0, 15);
  const total = local.length;
  const imp = local.filter((e) => e.important).length;
  const newest = local.length ? (local[0].tsStr?.slice(0, 10) || "?") : "?";

  const body = capped.map((l) => `├ ${l}`).join("\n");
  const header = migrated
    ? `🐘 memory migrated — ${migrated} entries moved to .elephant/memory.md`
    : `🐘 memory loaded — ${total} entries`;
  const ctx = [
    header,
    body,
    `└ ${imp} important · newest: ${newest}`,
  ].join("\n");

  const statusLine = migrated
    ? `🐘 migrated ${migrated} entries → .elephant/memory.md`
    : `🐘 ${total} entries loaded (${imp} important · newest: ${newest})`;

  emit(statusLine, ctx);
}

main();
