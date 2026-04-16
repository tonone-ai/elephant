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

    const ctx = [
      `Elephant check (${ts}). Evaluate:`,
      "→ Natural session end? (user wrapping up, said done/thanks/bye)",
      "→ Major topic shift? (different codebase, goal, or problem domain)",
      "",
      "If YES to either:",
      "  Engrave 2-5 important actions to .elephant/memory.md (Write or Edit tool).",
      "  Format: `YYYY-MM-DD HH:MM : action` caveman style, <100 chars, newest first.",
      "  Use `[!!]` for critical items. Skip write if nothing actionable.",
      "  Say: 🐘 memory updated / close session",
      "  Topic shift: also name the new topic, suggest starting a fresh session.",
      "",
      "If NO: say nothing. Do nothing.",
    ].join("\n");

    process.stdout.write(JSON.stringify({
      decision: "block",
      systemMessage: ctx,
    }) + "\n");
  });
}

main();
