<div align="center">

<h1>🐘 elephant</h1>

<p><em>"Consider the elephant. Legend has it its memory is so robust it never forgets."</em><br>- Gavin Belson</p>

<p>Claude Code forgets everything between sessions. Elephant fixes that.</p>

<img src="https://img.shields.io/badge/version-1.1.0-green">
<img src="https://img.shields.io/badge/license-MIT-green">
<img src="https://img.shields.io/badge/platform-Claude%20Code-blue">

<br><br>

<img src="docs/elephant.gif">

</div>

---

## Install

**Plugin registry:**

```bash
claude plugins install github:tonone-ai/elephant
```

**Or curl:**

```bash
curl -fsSL https://raw.githubusercontent.com/tonone-ai/elephant/main/install.sh | bash
```

Restart Claude Code. Done.

---

## Commands

| Command                    | What it does                               |
| -------------------------- | ------------------------------------------ |
| `/elephant save <text>`    | Save a memory entry                        |
| `/elephant save !! <text>` | Save an important entry (never compressed) |
| `/elephant show`           | Print your memory                          |
| `/elephant compact`        | Merge old entries to save tokens           |
| `/elephant takeover [N]`   | Bootstrap from git history (cold start)    |

---

## How it works

Elephant writes to two files:

- **`.elephant/memory.md`** (local, project-specific)
- **`~/.claude/elephant/memory.md`** (global, across all projects)

Entries are caveman-compressed (articles and filler dropped) to minimize token usage.
Important entries (`[!!]`) are never compressed or deleted.

### Cold start

New project? No history? Run `/elephant takeover`. It reads your last 60 commits and seeds memory automatically. Important commits (`feat:`, `fix:`, PRs) get marked `[!!]`.

---

## Memory format

```
[!!] 2026-04-12 13:58 : feat: add stripe webhooks
2026-04-12 12:00 : fix null pointer in auth middleware
```

---

## License

MIT, see [LICENSE](LICENSE)

Made by [tonone-ai](https://github.com/tonone-ai)
