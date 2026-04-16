#!/usr/bin/env node
// elephant-engrave — Stop hook
// Soft prompt: Claude engraves if natural session end or major topic shift.
// Skips trivial sessions and re-triggers after an engrave already happened.

"use strict";

const fs = require("fs");


function main() {
  let raw = "";
  const timer = setTimeout(() => process.exit(0), 3000);

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    clearTimeout(timer);

    let data = {};
    try { data = JSON.parse(raw); } catch {}

    // Another stop hook already blocked this stop — don't block again
    if (data.stop_hook_active) {
      process.exit(0);
      return;
    }

    // Read transcript to make smart decisions
    const transcriptPath = data.transcript_path;
    if (transcriptPath) {
      try {
        const transcript = fs.readFileSync(transcriptPath, "utf8");

        // Skip trivial sessions (fewer than 3 assistant turns)
        const turns = (transcript.match(/"role"\s*:\s*"assistant"/g) || []).length;
        if (turns < 3) {
          process.exit(0);
          return;
        }

        // Already engraved this session — don't re-trigger
        if (transcript.includes("🐘 memory updated")) {
          process.exit(0);
          return;
        }
      } catch {}
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const ctx = `🐘 ELEPHANT ENGRAVE (${ts}). DO NOT use Skill tool. DO NOT run commands. Evaluate only: natural session end? major topic shift? If YES: use Write or Edit tool on .elephant/memory.md — append 2-5 key actions, format \`YYYY-MM-DD HH:MM : action\` caveman <100 chars newest-first, [!!] critical. Then say: 🐘 memory updated. Topic shift: name it, suggest fresh session. If NO: say nothing. Do nothing.`;

    process.stdout.write(JSON.stringify({
      decision: "block",
      systemMessage: ctx,
    }) + "\n");
  });
}

main();
