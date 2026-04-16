# Post-Engrave Auto-Commit Design

**Date:** 2026-04-16  
**Status:** Approved

## Problem

When a PR is created via `/commit-push-pr`, the elephant Stop hook fires *after* the PR is already closed. The engrave writes `.elephant/memory.md` locally but the file is never committed — it stays stranded on the local branch.

**Flow (current, broken):**
1. `/commit-push-pr` → branch + commit + push + PR created
2. Session ends → Stop hook fires (first time)
3. Claude engraves → writes `.elephant/memory.md`, says "🐘 memory updated"
4. Stop hook fires again (second time, `stop_hook_active=true`) → exits immediately
5. `.elephant/memory.md` is dirty, uncommitted, stranded locally

## Solution: Post-Engrave Auto-Commit in the Hook

Intercept the second Stop hook call to detect the completed engrave and commit the memory file using Node's `child_process.execSync` — no Claude involvement.

**Flow (fixed):**
1. `/commit-push-pr` → branch + commit + push + PR created
2. Session ends → Stop hook fires (first time) → Claude engraves → "🐘 memory updated"
3. Stop hook fires again (`stop_hook_active=true`)
4. **[NEW]** Hook reads transcript → detects "🐘 memory updated" → memory dirty → `git add + commit + push`
5. `.elephant/memory.md` committed to current branch and pushed

## Implementation

**File:** `hooks/elephant-engrave.js`

**Structural change:** Move transcript reading before the `stop_hook_active` early-exit so the second stop can inspect it.

**Second-stop logic:**
```js
if (data.stop_hook_active) {
  if (transcript.includes("🐘 memory updated")) {
    tryCommitMemory();
  }
  process.exit(0);
  return;
}
```

**`tryCommitMemory()` function:**
```js
function tryCommitMemory() {
  const { execSync } = require("child_process");
  try {
    const status = execSync("git status --porcelain .elephant/memory.md", { encoding: "utf8" });
    if (!status.trim()) return;  // already clean
    const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
    execSync("git add .elephant/memory.md");
    execSync('git commit -m "chore: engrave session memory"');
    if (branch) execSync(`git push origin ${branch}`);
  } catch {
    // silent fail — never crash the hook
  }
}
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| Memory file already clean | `git status --porcelain` returns empty → no-op |
| Push fails (no auth, no upstream) | Caught silently; commit stays local |
| Detached HEAD | `git branch --show-current` returns empty → skip push, still commit |
| Not a git repo | `execSync` throws → caught silently |
| Git pre-commit hook fails | Caught silently; memory stays dirty |
| No engrave this session | `transcript.includes("🐘 memory updated")` = false → skip entirely |

## What Stays Unchanged

- Claude's engrave prompt (DO NOT run commands — that's addressed to Claude, not the hook)
- First-stop logic (trivial session skip, already-engraved skip)
- Changelog guard hook (PreToolUse on Claude's Bash calls, not a git hook)
- Global memory file (`~/.claude/elephant/memory.md` — not in a git repo, not committed)
