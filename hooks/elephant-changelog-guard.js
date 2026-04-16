#!/usr/bin/env node
// elephant-changelog-guard — PreToolUse hook (Bash matcher)
// Blocks `gh pr create` if elephant is active and CHANGELOG.md not staged.
// Forces /elephant changelog before PR creation.

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LOCAL_MEM = path.join(process.cwd(), ".elephant", "memory.md");

function elephantActive() {
  try { fs.accessSync(LOCAL_MEM); return true; } catch { return false; }
}

function isPrCreate(command) {
  return /\bgh\s+pr\s+create\b/.test(command);
}

function changelogStaged() {
  try {
    const staged = execSync("git diff --cached --name-only", { encoding: "utf8" });
    return staged.split("\n").some((f) => f.trim().toLowerCase() === "changelog.md");
  } catch {
    return false;
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
    try { data = JSON.parse(raw); } catch {}

    const command = (data.input && data.input.command) || "";
    if (!isPrCreate(command) || !elephantActive()) { process.exit(0); return; }

    if (changelogStaged()) { process.exit(0); return; }

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "Elephant active but CHANGELOG.md not staged. Run /elephant changelog first to update CHANGELOG.md and bump version, then commit it and create the PR.",
      },
    }) + "\n");
  });
}

main();
