<!-- markdownlint-disable MD024 -->

# Changelog

All notable changes to elephant are documented here.
Follows [Keep a Changelog](https://keepachangelog.com) and [Semantic Versioning](https://semver.org).

## [Unreleased]

### Changed

- overhaul README to lead with changelog automation, team memory, and cross-repo memory — previously undersold the post-1.2 surface; new sections explain how `/elephant changelog` removes release-day archaeology and how committing `ELEPHANT.md` turns memory into a team artifact with `@author` attribution
- revamp `elephant.tonone.ai` landing page — add changelog-flow walkthrough terminal, team-memory and cross-repo value props, and command cards for `/elephant changelog`, `/elephant readme`, and `/elephant update`

## [1.7.0] - 2026-04-17

### Changed

- rename local memory file from `.elephant/memory.md` to `ELEPHANT.md` at repo root — the dot-prefixed directory was being pattern-matched as a local/cache file by agents, who then either gitignored it or treated uncommitted edits as stray drift to discard. Uppercase root-level name mirrors `CLAUDE.md` / `CHANGELOG.md` / `CODEOWNERS` and signals "commit this" unambiguously. Global memory path is unchanged.
- simplify local header — the **For agents** anti-gitignore note is no longer necessary now that the filename itself carries the signal

### Migration

- autorecall (SessionStart) and autorecord (PostToolUse `git commit`) hooks both detect `.elephant/memory.md` on first run and move it to `ELEPHANT.md`, then remove the empty `.elephant/` directory. No manual action required — the move happens the next time elephant runs in a repo.

## [1.6.0] - 2026-04-17

### Removed

- drop `gh pr create` autorecord path — writing a memory entry and committing it as `chore: autorecord memory sync` polluted every PR diff with a noise commit. PR titles duplicate commit subjects, so the entry was redundant anyway. Memory still captures commits via the PostToolUse `git commit` path.

### Changed

- relax changelog-guard from hard-block to advisory — `gh pr create` without `CHANGELOG.md` staged now emits a reminder on stderr instead of denying the command, so trivial or internal-only PRs can proceed without forcing a changelog entry
- add "value filter" guidance to the skill — memory, CHANGELOG, and README updates are opt-in per change. Claude should not auto-invoke `/elephant save`, `/elephant changelog`, or `/elephant readme` after every action; only when the change is worth a future reader's attention

## [1.5.1] - 2026-04-16

### Fixed

- collapse duplicate memory entries when a commit and the matching `gh pr create` describe the same change — autorecord dedupe now normalizes the `PR:` prefix (and tolerates the `REPO :` prefix used in global memory) so `git commit -m "X"` followed by `gh pr create --title "X"` no longer leaves both `X` and `PR: X` in `.elephant/memory.md`

## [1.5.0] - 2026-04-16

### Added

- add `— @author` suffix to every memory entry — writer identity derived from `git config user.email` local-part so teammates can see who added what to `.elephant/memory.md`
- attribute takeover entries to original commit author — `/elephant takeover` now reads `%ae` from git log and stamps each seeded entry with its true author, not just the current user
- move `gh pr create` autorecord from PostToolUse to PreToolUse — writes memory entry, auto-commits it as `chore: autorecord memory sync`, and pushes (if upstream set) so the PR picks up the memory update in its initial diff instead of leaving dirty drift after the PR is opened; guarded against protected branches (main/master/trunk/develop)

### Changed

- filter git-history noise from autorecord — merge commits (`Merge pull request #N`, `Merge branch`), version bumps (`chore: bump`, `vX.Y.Z`), and release tags no longer pollute memory since Claude can always `git log` for them
- downgrade plain `feat:` / `fix:` commits from `[!!]` to routine — `[!!]` now reserved for real engineering signal (`breaking`, `revert`, `feat!:`, `fix!:`, `BREAKING CHANGE`) so the important tier stays meaningful
- compact now merges authors when grouping old routine entries — single-day rollups show `— @alice,@bob` or `— @alice,@bob,@carol +N` for the contributors of that day

## [1.4.3] - 2026-04-16

### Added

- add **For agents** note to local memory header — tells agents reading `.elephant/memory.md` that the file is shared team memory and should be committed with their PR, not gitignored or excluded from diffs
- split header into `LOCAL_HEADER` / `GLOBAL_HEADER` in autorecord hook — global memory at `~/.claude/elephant/memory.md` keeps the original one-line header since it lives outside any repo
- loosen header-strip regex to match one-or-more `>` lines between `---` fences, and apply globally — so multi-line headers re-pin cleanly and any stale duplicate header blocks (e.g. from an older hook version running against a newer file) get swept up on the next write

## [1.4.2] - 2026-04-16

### Changed

- switch memory entry order to oldest-first — entries now append at the bottom so history reads chronologically top-to-bottom
- auto-write elephant header to global `~/.claude/elephant/memory.md` — both local and global files now always carry the header, not just local

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
