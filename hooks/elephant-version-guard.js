#!/usr/bin/env node
// elephant-version-guard — PreToolUse hook (Bash)
// On git push: reads .elephant-versions.json, extracts version from every registered
// source, and blocks if any disagree. Silent when all agree or no registry exists.

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REGISTRY_FILE = path.join(process.cwd(), ".elephant-versions.json");

// The registry is repo content, so treat it as untrusted input (a cloned repo can ship any registry).
const VERSION_RE = /^[\w.+-]{1,64}$/;
const MAX_PATTERN_LEN = 200;
const MAX_FILE_BYTES = 1024 * 1024;

// Resolve a registry file path, refusing anything that escapes the repo root.
function safePath(file) {
  if (typeof file !== "string" || !file || path.isAbsolute(file)) return null;
  const root = process.cwd();
  const resolved = path.resolve(root, file);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

// Only version-shaped strings may leave this hook; never echo arbitrary file content.
function sanitize(v) {
  return typeof v === "string" && VERSION_RE.test(v) ? v : null;
}

function regexMatch(content, pattern) {
  if (typeof pattern !== "string" || pattern.length > MAX_PATTERN_LEN)
    return null;
  try {
    const m = content.match(new RegExp(pattern, "m"));
    return m ? sanitize(m[1]) : null;
  } catch {
    return null;
  }
}

// Extract version from a single source entry. Returns null if file missing or no match.
function extractVersion(source) {
  const filePath = safePath(source.file);
  if (!filePath || !fs.existsSync(filePath)) return null;
  if (fs.statSync(filePath).size > MAX_FILE_BYTES) return null;

  const content = fs.readFileSync(filePath, "utf8");

  if (source.type === "json") {
    if (typeof source.jq !== "string" || source.jq.startsWith("-")) return null;
    // Prefer jq if available; fall back to a simple dot-path walker.
    try {
      const out = execFileSync("jq", ["-r", source.jq, filePath], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      return out === "null" || out === "" ? null : sanitize(out);
    } catch {
      try {
        const obj = JSON.parse(content);
        const parts = source.jq.replace(/^\./, "").split(".");
        let val = obj;
        for (const p of parts) {
          const m = p.match(/^(.+)\[(\d+)\]$/);
          if (m) val = (val[m[1]] || [])[parseInt(m[2])];
          else val = val[p];
          if (val == null) return null;
        }
        return val != null ? sanitize(String(val)) : null;
      } catch {
        return null;
      }
    }
  }

  // regex / toml / yaml — caller supplies a regex pattern (same extraction path)
  if (
    source.type === "regex" ||
    source.type === "toml" ||
    source.type === "yaml"
  ) {
    return regexMatch(content, source.pattern);
  }

  return null;
}

// True only when `git push` is an actual command, not text inside a quoted
// argument (e.g. a commit message). Deleting a remote ref can't ship a drifted version.
function isGitPush(cmd) {
  const bare = cmd.replace(/"[^"]*"|'[^']*'/g, '""');
  if (!/(?:^|[;&|(]\s*)git(?:\s+-\S+(?:\s+[^-\s]\S*)?)*\s+push\b/.test(bare))
    return false;
  return !/\s(?:--delete|-d)\b/.test(bare);
}

function main() {
  let raw = "";
  const timer = setTimeout(() => process.exit(0), 3000);

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    clearTimeout(timer);

    if (!raw.includes("push")) {
      process.exit(0);
      return;
    }

    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {}

    const cmd =
      data.tool_input?.command || (data.input && data.input.command) || "";
    if (!isGitPush(cmd)) {
      process.exit(0);
      return;
    }

    if (!fs.existsSync(REGISTRY_FILE)) {
      process.exit(0);
      return;
    }

    let registry;
    try {
      registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
    } catch {
      process.exit(0);
      return;
    }

    const sources = registry.sources || [];
    if (sources.length === 0) {
      process.exit(0);
      return;
    }

    const results = sources.map((s) => ({
      label: s.label || s.file,
      file: s.file,
      version: extractVersion(s),
    }));

    const present = results.filter((r) => r.version !== null);
    if (present.length === 0) {
      process.exit(0);
      return;
    }

    const uniqueVersions = [...new Set(present.map((r) => r.version))];
    if (uniqueVersions.length === 1) {
      // All agree — silent pass
      process.exit(0);
      return;
    }

    // Drift detected — block and show table
    const rows = results.map((r) =>
      r.version
        ? `  ${r.version.padEnd(14)} ${r.file}`
        : `  (not found)   ${r.file}`,
    );

    const msg = [
      `⚠ version drift — ${uniqueVersions.length} values across ${present.length} files:`,
      ...rows,
      "",
      "Fix: run /elephant changelog (or manually edit files to agree), then push again.",
    ].join("\n");

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: msg,
        },
        systemMessage: msg,
      }) + "\n",
    );
  });
}

main();
