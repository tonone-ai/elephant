#!/usr/bin/env node
// elephant-autorecord — PostToolUse hook (Bash)
// Silently writes memory entries on git commit / gh pr create.
// No Claude involvement. No user-visible output.

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const LOCAL_MEM = path.join(process.cwd(), ".elephant", "memory.md");
const GLOBAL_MEM = path.join(os.homedir(), ".claude", "elephant", "memory.md");
const REPO = path.basename(process.cwd());

function caveman(text) {
  return text
    .replace(/\b(a|an|the|just|really|basically|actually|simply)\b\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function readExistingTexts(filePath) {
  try {
    return new Set(
      fs
        .readFileSync(filePath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) =>
          l
            .replace(/^\[!!\]\s*/, "")
            .replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s*:\s*/, "")
            .trim(),
        ),
    );
  } catch {
    return new Set();
  }
}

function prependLines(filePath, lines) {
  if (!lines.length) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  fs.writeFileSync(filePath, lines.join("\n") + "\n" + existing);
}

function extractCommitMsg(cmd) {
  // Heredoc: real newlines after JSON.parse of transcript
  const heredoc = cmd.match(
    /git commit -m[^<]*<<'?EOF'?\n(.*?)(?:\n\nCo-Authored|\nCo-Authored|\nEOF)/s,
  );
  if (heredoc) return heredoc[1].trim().split("\n")[0].trim();

  // Inline: git commit -m "message"
  const inline = cmd.match(/git commit -m ["']([^"'\n]+)["']/);
  if (inline) return inline[1].trim();

  return null;
}

function main() {
  let raw = "";
  const timer = setTimeout(() => process.exit(0), 3000);

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    clearTimeout(timer);

    // Fast exit — skip JSON parse entirely if no relevant command
    if (!raw.includes("git commit") && !raw.includes("gh pr create")) {
      process.exit(0);
      return;
    }

    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {}

    const cmd = data.tool_input?.command || "";
    if (!cmd) {
      process.exit(0);
      return;
    }

    const ts = getTimestamp();
    const entries = [];

    // git commit
    const commitMsg = extractCommitMsg(cmd);
    if (commitMsg) {
      const important = /^(feat|fix|breaking|release|deploy|revert)[\s!:(]/.test(commitMsg);
      entries.push({ text: caveman(commitMsg), important });
    }

    // gh pr create
    const prMatch = cmd.match(/gh pr create[\s\S]*?--title ["']([^"']+)["']/);
    if (prMatch) {
      entries.push({ text: caveman("PR: " + prMatch[1]), important: true });
    }

    if (!entries.length) {
      process.exit(0);
      return;
    }

    const existingLocal = readExistingTexts(LOCAL_MEM);
    const existingGlobal = readExistingTexts(GLOBAL_MEM);

    const newLocal = entries.filter((e) => !existingLocal.has(e.text));
    const newGlobal = entries.filter(
      (e) =>
        !existingGlobal.has(`${REPO} : ${e.text}`) &&
        !existingGlobal.has(e.text),
    );

    prependLines(
      LOCAL_MEM,
      newLocal.map((e) => `${e.important ? "[!!] " : ""}${ts} : ${e.text}`),
    );
    prependLines(
      GLOBAL_MEM,
      newGlobal.map(
        (e) => `${e.important ? "[!!] " : ""}${ts} : ${REPO} : ${e.text}`,
      ),
    );

    process.exit(0);
  });
}

main();
