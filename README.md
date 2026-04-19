<div align="center">

<h1>🐘 elephant</h1>

<p><em>"Consider the elephant. Legend has it its memory is so robust it never forgets."</em><br>- Gavin Belson</p>

<p><strong>Persistent memory + automated changelogs + auto-maintained READMEs for Claude Code.</strong></p>

<p>Claude Code forgets everything between sessions. Elephant fixes that — and ships your release notes while it's at it.</p>

<img src="https://img.shields.io/badge/version-1.7.2-green">
<img src="https://img.shields.io/badge/license-MIT-green">
<img src="https://img.shields.io/badge/platform-Claude%20Code-blue">

<br><br>

<img src="docs/elephant.gif">

</div>

---

## What you get

- 🧠 **Persistent memory** — Claude remembers your stack, decisions, and ongoing work across sessions.
- 📝 **Automated changelogs** — `/elephant changelog` reads your git log, categorizes commits (Keep a Changelog), suggests a semver bump, and writes `CHANGELOG.md`. Never hand-maintain a changelog again.
- 📖 **Auto-maintained READMEs** — `/elephant readme` generates or updates `README.md` from repo context. Keeps version badges, install steps, and command lists in sync without manual edits.
- 👥 **Team memory** — `ELEPHANT.md` lives in your repo root and gets committed. Every teammate, every clone, same context. Author attribution (`@alice`) baked in.
- 🌍 **Cross-repo memory** — a global file at `~/.claude/elephant/memory.md` remembers context across every project you work on. Switch repos, keep the thread.
- 🚀 **Cold-start bootstrap** — new machine or new teammate? `/elephant takeover` reads the last 60 commits and seeds memory in seconds.
- 🗜️ **Token-efficient** — caveman compression + compact = ~150 tokens for a week of history vs. 500+ tokens of manual preamble.

---

## Why it matters

### Changelogs write themselves

Nobody writes changelogs. Everybody needs them. `/elephant changelog` turns the last-tag-to-HEAD diff into a proper release entry:

```text
$ /elephant changelog

Current version: 1.6.0
Changes collected: 3 features, 2 fixes, 1 breaking

Recommendation: MAJOR → 2.0.0
Reason: breaking changes detected

Choose version:
  [1] 2.0.0  (major) — recommended
  [2] 1.7.0  (minor)
  [3] 1.6.1  (patch)

✓ CHANGELOG.md updated — v2.0.0 (2026-04-17)
✓ README.md version badge: v1.6.0 → v2.0.0
```

Commits categorized into Added / Changed / Fixed / Removed / Breaking / Security automatically. Semver-aware bump suggestion. No more "what changed this release" archaeology on release day.

### Cross-session memory

Every Claude Code session starts cold. Stack, conventions, ongoing work, last week's decisions — gone. You burn tokens re-explaining:

```text
"we use Bun not Node, the auth middleware is the one under
packages/core (the old one got deprecated last sprint),
and don't touch the stripe webhook handler — that's mid-migration"
```

Elephant writes all that to `ELEPHANT.md` and auto-loads it at session start. Claude already knows.

### Team memory

`ELEPHANT.md` lives in the repo root. Commit it. Now every teammate gets the same context on first clone. Every entry tagged with author:

```text
[!!] 2026-04-17 12:23 : feat!: rename local memory to ELEPHANT.md — @fatih
2026-04-16 09:41 : fix null pointer in auth middleware — @alice
2026-04-15 14:22 : stripe webhook handler mid-migration, don't touch — @bob
```

New hire clones the repo → Claude already briefed on their first session.

### Cross-repo memory

A global file at `~/.claude/elephant/memory.md` mirrors entries across every project you work on. Switch from repo A to repo B, Claude still sees the conversation you had yesterday in repo A. Good for monorepo-ish workflows where projects leak into each other.

---

## Install

```bash
claude plugin marketplace add tonone-ai/elephant
claude plugin install elephant@elephant
```

Restart Claude Code. Done.

---

## Commands

| Command                    | What it does                                                    |
| -------------------------- | --------------------------------------------------------------- |
| `/elephant save <text>`    | Save a memory entry                                             |
| `/elephant save !! <text>` | Save an important entry (never compressed, never deleted)       |
| `/elephant show`           | Print your memory                                               |
| `/elephant compact`        | Merge routine entries older than 7 days                         |
| `/elephant restyle`        | Re-compress all entries to strict caveman style                 |
| `/elephant takeover [N]`   | Bootstrap from last N git commits (default 60)                  |
| `/elephant changelog`      | Generate / update `CHANGELOG.md` with semver-aware version bump |
| `/elephant readme`         | Generate / update `README.md` from repo context                 |
| `/elephant update`         | Pull latest elephant from GitHub and install                    |

---

## How it works

Three files do the work:

- **`ELEPHANT.md`** — local, repo root. Commit with your changes. Team memory.
- **`~/.claude/elephant/memory.md`** — global, across all projects. Personal cross-repo memory.
- **`CHANGELOG.md`** — managed by `/elephant changelog`, never by hand.

A `SessionStart` hook injects your memory as context on every session. A `Stop` hook prompts Claude to save important actions when topics shift — so nothing gets lost.

### Memory entry format

```text
[!!] 2026-04-17 12:23 : feat!: rename local memory to ELEPHANT.md — @fatih
2026-04-16 09:41 : fix null pointer in auth middleware — @alice
```

`[!!]` = important (never compressed). Trailing `@author` derived from `git config user.email` — team visibility baked in.

### Cold start

Fresh clone or new project? Run `/elephant takeover`. It reads your last 60 commits, caveman-compresses them, and seeds memory — important commits (`feat!:`, `fix!:`, breaking changes) marked `[!!]`. Fresh repo with no commits? It seeds from the current conversation instead.

### Value filter

Memory, CHANGELOG, and README writes are opt-in per change. Elephant won't spam your files after every command — only when there's something a future reader actually needs to know.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full release history — auto-maintained by elephant itself. Meta? Yes. Working? Also yes.

---

## License

MIT, see [LICENSE](LICENSE)

Made by [tonone-ai](https://github.com/tonone-ai) · [elephant.tonone.ai](https://elephant.tonone.ai)
