#!/usr/bin/env node
// elephant-engrave — Stop hook
// Soft prompt: Claude engraves if natural session end or major topic shift.
// Skips trivial sessions and re-triggers after an engrave already happened.
// On second stop (post-engrave): auto-commits .elephant/memory.md if dirty.

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
    // silent fail — never crash the hook
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

    // Read transcript to make smart decisions
    const transcriptPath = data.transcript_path;
    let transcript = "";
    if (transcriptPath) {
      try {
        transcript = fs.readFileSync(transcriptPath, "utf8");
      } catch {}
    }

    // Another stop hook already blocked this stop — commit memory if engraved, then exit
    if (data.stop_hook_active) {
      if (transcript.includes("🐘 memory updated")) {
        tryCommitMemory();
      }
      process.exit(0);
      return;
    }

    if (transcript) {
      // Skip trivial sessions (fewer than 3 assistant turns)
      const turns = (transcript.match(/"role"\s*:\s*"assistant"/g) || [])
        .length;
      if (turns < 3) {
        process.exit(0);
        return;
      }

      // Already engraved this session — don't re-trigger
      if (transcript.includes("🐘 memory updated")) {
        process.exit(0);
        return;
      }
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const ctx = `🐘 ELEPHANT ENGRAVE (${ts}). DO NOT use Skill tool. DO NOT run commands. Evaluate only: natural session end? major topic shift? If YES: use Write or Edit tool on .elephant/memory.md — append 2-5 key actions, format \`YYYY-MM-DD HH:MM : action\` caveman <100 chars newest-first, [!!] critical. Then say: 🐘 memory updated. Topic shift: name it, suggest fresh session. If NO: say nothing. Do nothing.`;

    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason: "🐘 Elephant engraving session memory...",
        systemMessage: ctx,
      }) + "\n",
    );
  });
}

main();
