#!/usr/bin/env node
// elephant-autorecord — PostToolUse hook (Bash)
// Silently writes memory entries on git commit / gh pr create.
// No Claude involvement. No user-visible output.

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const LOCAL_MEM = path.join(process.cwd(), ".elephant", "memory.md");
const GLOBAL_MEM = path.join(os.homedir(), ".claude", "elephant", "memory.md");
const REPO = path.basename(process.cwd());

const HEADER =
  "---\n> Memory managed by [🐘 elephant](https://github.com/tonone-ai/elephant) — cross-session, cross-repo, cross-team memory for Claude Code.\n---\n";

// Subjects that are pure git-history noise — Claude can always `git log` for them.
const NOISE_PATTERNS = [
  /^Merge pull request #\d+/i,
  /^Merge branch /i,
  /^Merge remote-tracking branch /i,
  /^chore:\s*bump (version|to v?\d)/i,
  /^chore:\s*release /i,
  /^v\d+\.\d+\.\d+/,
  /^release\s+v?\d+\.\d+\.\d+/i,
];

function isNoise(subject) {
  return NOISE_PATTERNS.some((re) => re.test(subject));
}

// Only mark [!!] for commits with real engineering signal.
// Plain feat:/fix: are routine — they compact after 7 days, which is fine.
function isImportant(subject) {
  return (
    /^(breaking|revert|release|deploy)[\s!:(]/i.test(subject) ||
    /^(feat|fix)!:/i.test(subject) ||
    /BREAKING CHANGE/i.test(subject)
  );
}

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

function getAuthor() {
  try {
    const email = execSync("git config user.email", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (email) return email.split("@")[0];
  } catch {}
  try {
    const name = execSync("git config user.name", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (name) return name.split(/\s+/)[0].toLowerCase();
  } catch {}
  return process.env.USER || "unknown";
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
            .replace(/\s*—\s*@[\w.-]+\s*$/, "")
            .trim(),
        ),
    );
  } catch {
    return new Set();
  }
}

function appendLines(filePath, lines) {
  if (!lines.length) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  // Strip existing header (if any) so it can be re-pinned at top via HEADER constant
  const headerRe = /\n*---\n> Memory managed by[^\n]*\n---\n*/;
  existing = existing.replace(headerRe, "\n").replace(/^\n+/, "");

  const body = existing.trimEnd();
  const newContent = (body ? body + "\n" : "") + lines.join("\n") + "\n";
  fs.writeFileSync(filePath, HEADER + "\n" + newContent);
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
    const author = getAuthor();
    const entries = [];

    // git commit
    const commitMsg = extractCommitMsg(cmd);
    if (commitMsg && !isNoise(commitMsg)) {
      entries.push({
        text: caveman(commitMsg),
        important: isImportant(commitMsg),
      });
    }

    // gh pr create — keep these as [!!] since PR creation is always a deliberate release signal
    const prMatch = cmd.match(/gh pr create[\s\S]*?--title ["']([^"']+)["']/);
    if (prMatch && !isNoise(prMatch[1])) {
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

    appendLines(
      LOCAL_MEM,
      newLocal.map(
        (e) => `${e.important ? "[!!] " : ""}${ts} : ${e.text} — @${author}`,
      ),
    );
    appendLines(
      GLOBAL_MEM,
      newGlobal.map(
        (e) =>
          `${e.important ? "[!!] " : ""}${ts} : ${REPO} : ${e.text} — @${author}`,
      ),
    );

    process.exit(0);
  });
}

main();
