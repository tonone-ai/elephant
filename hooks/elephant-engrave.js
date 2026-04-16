#!/usr/bin/env node
// elephant-engrave — Stop hook
// Blocks session end with a compact prompt so Claude engraves memory.
// Shows a short "Stop says:" line instead of the old verbose paragraph.

"use strict";

const fs = require("fs");
const { execSync } = require("child_process");

function tryCommitMemory() {
  try {
    const status = execSync("git status --porcelain .elephant/memory.md", {
      encoding: "utf8",
    });
    if (!status.trim()) return;
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
    }).trim();
    execSync("git add .elephant/memory.md");
    execSync('git commit -m "chore: engrave session memory"');
    if (branch) execSync(`git push origin ${branch}`);
  } catch {
    // silent — never crash the hook
  }
}

function main() {
  let raw = "";
  const timer = setTimeout(() => process.exit(0), 3000);

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    clearTimeout(timer);

    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {}

    const transcriptPath = data.transcript_path;
    let transcript = "";
    if (transcriptPath) {
      try {
        transcript = fs.readFileSync(transcriptPath, "utf8");
      } catch {}
    }

    // Second stop (post-engrave): commit memory if engraved, then exit
    if (data.stop_hook_active) {
      if (transcript.includes("🐘 memory updated")) {
        tryCommitMemory();
      }
      process.exit(0);
      return;
    }

    // Skip trivial sessions (fewer than 3 assistant turns)
    const turns = (transcript.match(/"type"\s*:\s*"assistant"/g) || []).length;
    if (turns < 3) {
      process.exit(0);
      return;
    }

    // Already engraved this session
    if (transcript.includes("🐘 memory updated")) {
      process.exit(0);
      return;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const msg = `🐘 Engrave (${ts}) — session end or topic shift? YES: edit .elephant/memory.md, 2-5 caveman lines newest-first [!!]=critical, say "🐘 memory updated". NO: nothing.`;

    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason: msg,
        systemMessage: msg,
      }) + "\n",
    );
  });
}

main();
