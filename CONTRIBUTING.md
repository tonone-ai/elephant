# Contributing

elephant is a single-skill Claude Code plugin. Contributions welcome.

## What's here

- `skills/elephant/SKILL.md` — the skill. All logic lives here.
- `.claude-plugin/plugin.json` — plugin manifest.
- `install.sh` — curl installer.
- `docs/index.html` — GitHub Pages landing page.

## How to contribute

1. Fork the repo
2. Make your change
3. Test it: install locally with `bash install.sh` (update REPO var to point to local files, or copy manually to `~/.claude/plugins/elephant/`)
4. Open a PR with a clear description of what changed and why

## Skill changes

The skill is plain Markdown. Edit `skills/elephant/SKILL.md` directly.
Test by running the commands in Claude Code after installing locally.

## What we won't merge

- Dependencies (no npm, pip, brew requirements)
- Cloud sync or remote storage
- Breaking changes to `ELEPHANT.md` format without a migration path
