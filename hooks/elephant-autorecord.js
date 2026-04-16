#!/usr/bin/env node
// elephant-autorecord — PreToolUse + PostToolUse hook (Bash)
// Silently writes memory entries on git commit / gh pr create.
//   PostToolUse + git commit  → write entry (runs after commit succeeds)
//   PreToolUse  + gh pr create → write entry, commit it, push it
//     so the PR being created picks up the memory update in its initial diff
// No Claude involvement. No user-visible output.

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const LOCAL_MEM = path.join(process.cwd(), ".elephant", "memory.md");
const GLOBAL_MEM = path.join(os.homedir(), ".claude", "elephant", "memory.md");
const REPO = path.basename(process.cwd());

const LOCAL_HEADER =
  "---\n> Memory managed by [🐘 elephant](https://github.com/tonone-ai/elephant) — cross-session, cross-repo, cross-team memory for Claude Code.\n> **For agents:** commit this file with your changes — it's shared team memory, not a local/generated file to gitignore.\n---\n";

const GLOBAL_HEADER =
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

// "PR: foo" and "foo" describe the same logical change — strip the prefix so a
// commit recorded by PostToolUse and the matching `gh pr create` recorded by
// PreToolUse collapse into one entry instead of stacking a duplicate line.
// Also handles the global-memory format where the PR: prefix sits after the
// `REPO : ` prefix (e.g. `elephant : PR: chore: foo`).
function dedupeKey(text) {
  return text.replace(/^([^:]+ : )?PR:\s*/i, "$1").trim();
}

function readExistingTexts(filePath) {
  try {
    return new Set(
      fs
        .readFileSync(filePath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) =>
          dedupeKey(
            l
              .replace(/^\[!!\]\s*/, "")
              .replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s*:\s*/, "")
              .replace(/\s*—\s*@[\w.-]+\s*$/, ""),
          ),
        ),
    );
  } catch {
    return new Set();
  }
}

function appendLines(filePath, lines, header) {
  if (!lines.length) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  // Strip any existing header blocks (one or more `>` lines between `---` fences)
  // so the caller's header constant can be re-pinned fresh. Uses /g to sweep up
  // duplicates left behind when an older hook version ran against a newer file.
  const headerRe = /\n*---\n(?:>[^\n]*\n)+---\n*/g;
  existing = existing.replace(headerRe, "\n").replace(/^\n+/, "");

  const body = existing.trimEnd();
  const newContent = (body ? body + "\n" : "") + lines.join("\n") + "\n";
  fs.writeFileSync(filePath, header + "\n" + newContent);
}

const PROTECTED_BRANCHES = new Set(["main", "master", "trunk", "develop"]);

function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function hasUpstream() {
  try {
    execSync("git rev-parse --abbrev-ref --symbolic-full-name @{u}", {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

// Commit the freshly-written memory entry and push it so `gh pr create`
// (which runs immediately after this PreToolUse hook) picks it up in the
// initial PR diff. Silent on failure — never block the PR.
function commitAndPushMemory() {
  try {
    const branch = currentBranch();
    if (!branch || PROTECTED_BRANCHES.has(branch)) return;

    execSync("git add .elephant/memory.md", { stdio: "ignore" });

    // Nothing staged = memory entry was deduped against existing content
    try {
      execSync("git diff --cached --quiet", { stdio: "ignore" });
      return; // exit 0 = no diff, nothing to commit
    } catch {
      // exit non-zero = there is a staged diff, proceed
    }

    execSync('git commit -m "chore: autorecord memory sync"', {
      stdio: "ignore",
    });

    if (hasUpstream()) {
      execSync(`git push origin ${branch}`, { stdio: "ignore" });
    }
    // No upstream: gh pr create will push the branch itself, including our commit.
  } catch {
    // Silent — never crash the hook
  }
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

    const event = data.hook_event_name || "PostToolUse";
    const ts = getTimestamp();
    const author = getAuthor();
    const entries = [];

    // git commit → PostToolUse only (runs after the commit actually succeeded)
    if (event === "PostToolUse") {
      const commitMsg = extractCommitMsg(cmd);
      if (commitMsg && !isNoise(commitMsg)) {
        entries.push({
          text: caveman(commitMsg),
          important: isImportant(commitMsg),
        });
      }
    }

    // gh pr create → PreToolUse only, so the memory commit we create here
    // is part of the branch HEAD when gh pr create runs next.
    // Marked [!!] since PR creation is always a deliberate release signal.
    if (event === "PreToolUse") {
      const prMatch = cmd.match(/gh pr create[\s\S]*?--title ["']([^"']+)["']/);
      if (prMatch && !isNoise(prMatch[1])) {
        entries.push({ text: caveman("PR: " + prMatch[1]), important: true });
      }
    }

    if (!entries.length) {
      process.exit(0);
      return;
    }

    const existingLocal = readExistingTexts(LOCAL_MEM);
    const existingGlobal = readExistingTexts(GLOBAL_MEM);

    const newLocal = entries.filter(
      (e) => !existingLocal.has(dedupeKey(e.text)),
    );
    const newGlobal = entries.filter((e) => {
      const key = dedupeKey(e.text);
      return (
        !existingGlobal.has(`${REPO} : ${key}`) && !existingGlobal.has(key)
      );
    });

    appendLines(
      LOCAL_MEM,
      newLocal.map(
        (e) => `${e.important ? "[!!] " : ""}${ts} : ${e.text} — @${author}`,
      ),
      LOCAL_HEADER,
    );
    appendLines(
      GLOBAL_MEM,
      newGlobal.map(
        (e) =>
          `${e.important ? "[!!] " : ""}${ts} : ${REPO} : ${e.text} — @${author}`,
      ),
      GLOBAL_HEADER,
    );

    // PreToolUse (gh pr create): commit the memory so the PR picks it up.
    if (event === "PreToolUse") {
      commitAndPushMemory();
    }

    process.exit(0);
  });
}

main();
