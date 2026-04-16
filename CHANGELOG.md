# Changelog

All notable changes to elephant are documented here.
Follows [Keep a Changelog](https://keepachangelog.com) and [Semantic Versioning](https://semver.org).

## [Unreleased]

## [1.4.1] - 2026-04-16

### Fixed

- fix `prependLines` in autorecord hook — header block now stays pinned at top of memory file when new entries are prepended

## [1.4.0] - 2026-04-16

### Added

- add advertisement header to `.elephant/memory.md` — pinned at top of every memory file so any repo collaborator who opens it discovers elephant
- add retrofit step to `update` command — adds header to existing memory files that predate this feature
- replace Stop hook engrave with silent PostToolUse autorecord — fires silently on `git commit` / `gh pr create` instead of interrupting session end with a visible message

### Fixed

- fix rename `newest` to `latest` in recall footer
- fix auto-commit memory after engrave in stop hook
- fix prevent skill invocation in engrave stop hook prompt
- fix gitignore `docs/superpowers` directory to avoid leaking internal design specs

## [1.3.1] - 2026-04-16

### Fixed

- add `reason` field to engrave Stop hook block — shows "🐘 Elephant engraving session memory..." instead of generic "Blocked by hook"

## [1.2.2] - 2026-04-16

### Fixed

- bump version to force cache refresh — cached v1.2.1 entry contained stale Stop hook with old `hookSpecificOutput` schema; installing 1.2.2 creates a fresh cache entry with the corrected `decision`/`systemMessage` output

## [1.2.1] - 2026-04-16

### Fixed

- correct Stop hook (`elephant-engrave.js`) output schema — was using `hookSpecificOutput.hookEventName: "Stop"` which is invalid; now emits top-level `decision: "block"` and `systemMessage` per the Claude Code Stop hook spec
- add auto-restyle on `elephant update` — re-runs `/restyle` after pulling new version

## [1.2.0] - 2026-04-16

### Added

- add `/elephant changelog` command — generate/update `CHANGELOG.md` with version detection, bump suggestions (major/minor/patch), and interactive confirmation via `AskUserQuestion`
- add `/elephant update` command — pull latest elephant from GitHub and install without touching plugin directories manually; patches `installed_plugins.json` via `jq`
- add `AskUserQuestion` to allowed tools in skill manifest — enables interactive dialogs during changelog flow

## [1.1.0] - 2026-04-16

### Added

- add standalone `SessionStart` hook (`elephant-recall.js`) — injects local + global memory as context on session start; auto-migrates old tonone-dir memory to `.elephant/memory.md` on first run
- add `Stop` hook (`elephant-engrave.js`) — prompts Claude to engrave important session actions on natural session end or major topic shift; skips trivial sessions (<3 turns), re-triggers after engrave
- add `hooks.json` wiring `SessionStart→recall`, `Stop→engrave`; update `install.sh` to download hooks alongside skill
- add `systemMessage` output in recall hook — shows elephant recall status in Claude Code UI at session start, not just as hidden context
- add session seeding fallback in `takeover` — fresh repos with no git history seed from current session instead of failing

## [1.0.0] - 2026-04-12

### Added

- add elephant skill v1.0.0 with `save`, `save !!`, `show`, `compact`, `takeover` commands
- add plugin manifest (`plugin.json`) and marketplace catalog (`marketplace.json`) — repo serves as self-contained installable marketplace
- add curl `install.sh` — single-command setup downloads skill, hooks, and manifests
- add GitHub Pages landing page at `elephant.tonone.ai` with animated GIF demo
- add `CONTRIBUTING.md` with dev workflow and contribution guide
- add README with install steps, command reference, and entry format docs

### Fixed

- fix marketplace.json missing from initial release — broke two-step plugin install flow
- fix incorrect install command format in README — `claude plugins install` syntax required two steps, not one

---
> Changelog maintained automatically by [🐘 elephant](https://github.com/tonone-ai/elephant) — keep your changelog up to date without the manual work.
