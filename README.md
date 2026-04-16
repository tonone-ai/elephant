<div align="center">

<h1>🐘 elephant</h1>

<p><em>"Consider the elephant. Legend has it its memory is so robust it never forgets."</em><br>- Gavin Belson</p>

<p>Claude Code forgets everything between sessions. Elephant fixes that.</p>

<p><strong>Stop re-explaining your stack. Stop pasting context. Just build.</strong></p>

<img src="https://img.shields.io/badge/version-1.4.1-green">
<img src="https://img.shields.io/badge/license-MIT-green">
<img src="https://img.shields.io/badge/platform-Claude%20Code-blue">

<br><br>

<img src="docs/elephant.gif">

</div>

---

## Why it matters

Every Claude Code session starts cold. No memory of your stack, your decisions, your ongoing work. You spend the first minutes re-explaining:

- what you're building and how it's structured
- what you were working on last session
- why that workaround exists
- what got decided last week

Elephant fixes this. Memory loads automatically at session start. Open Claude Code, keep building.

**Token savings.** Entries are caveman-compressed — articles and filler stripped. `/elephant compact` merges old routine entries. A week of project history fits in ~150 tokens instead of a 500-token manual preamble.

**Time savings.** No more "here's where we left off" setup. No more finding the right file to paste for context. The AI already knows.

**Cold start.** New machine, new teammate, fresh clone? `/elephant takeover` reads your last 60 commits and seeds memory in seconds.

---

## Install

**Plugin marketplace:**

```bash
claude plugin marketplace add tonone-ai/elephant
claude plugin install elephant@elephant
```

Restart Claude Code. Done.

---

## Commands

| Command                    | What it does                                       |
| -------------------------- | -------------------------------------------------- |
| `/elephant save <text>`    | Save a memory entry                                |
| `/elephant save !! <text>` | Save an important entry (never compressed)         |
| `/elephant show`           | Print your memory                                  |
| `/elephant compact`        | Merge old entries to save tokens                   |
| `/elephant restyle`        | Re-compress all entries to strict caveman style    |
| `/elephant takeover [N]`   | Bootstrap from git history (cold start)            |
| `/elephant changelog`      | Generate / update `CHANGELOG.md` with version bump |
| `/elephant readme`         | Generate / update `README.md` from repo context    |
| `/elephant update`         | Pull latest elephant from GitHub and install       |

---

## How it works

Elephant writes to two files:

- **`.elephant/memory.md`** (local, project-specific)
- **`~/.claude/elephant/memory.md`** (global, across all projects)

Entries are caveman-compressed (articles and filler dropped) to minimize token usage.
Important entries (`[!!]`) are never compressed or deleted.

A `SessionStart` hook automatically injects your memory as context at the beginning of every session. A `Stop` hook prompts Claude to engrave important actions when you end a session or shift topics — so nothing gets lost.

### Cold start

New project? No history? Run `/elephant takeover`. It reads your last 60 commits and seeds memory automatically. Important commits (`feat:`, `fix:`, PRs) get marked `[!!]`. Fresh repo with no commits yet? It seeds from the current session instead.

---

## Memory format

```
[!!] 2026-04-12 13:58 : feat: add stripe webhooks
2026-04-12 12:00 : fix null pointer in auth middleware
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

---

## License

MIT, see [LICENSE](LICENSE)

Made by [tonone-ai](https://github.com/tonone-ai) · [elephant.tonone.ai](https://elephant.tonone.ai)
