#!/usr/bin/env node
// elephant-changelog-guard — PreToolUse hook (Bash matcher)
// Advisory only: when `gh pr create` runs without CHANGELOG.md staged,
// prints a reminder. Never blocks — Claude decides whether the change
// warrants a changelog entry.

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LOCAL_MEM = path.join(process.cwd(), "ELEPHANT.md");
const LEGACY_LOCAL_MEM = path.join(process.cwd(), ".elephant", "memory.md");

function elephantActive() {
  try {
    fs.accessSync(LOCAL_MEM);
    return true;
  } catch {}
  try {
    fs.accessSync(LEGACY_LOCAL_MEM);
    return true;
  } catch {
    return false;
  }
}

function isPrCreate(command) {
  return /\bgh\s+pr\s+create\b/.test(command);
}

function changelogStaged() {
  try {
    const staged = execSync("git diff --cached --name-only", {
      encoding: "utf8",
    });
    return staged
      .split("\n")
      .some((f) => f.trim().toLowerCase() === "changelog.md");
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
    try {
      data = JSON.parse(raw);
    } catch {}

    const command = (data.input && data.input.command) || "";
    if (!isPrCreate(command) || !elephantActive()) {
      process.exit(0);
      return;
    }

    if (changelogStaged()) {
      process.exit(0);
      return;
    }

    process.stderr.write(
      "elephant: CHANGELOG.md not staged. If this PR has a user-visible change, run /elephant changelog before pushing. Skip for trivial/internal-only changes.\n",
    );
    process.exit(0);
  });
}

main();
