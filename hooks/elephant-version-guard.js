#!/usr/bin/env node
// elephant-version-guard — PreToolUse hook (Bash)
// On git push: reads .elephant-versions.json, extracts version from every registered
// source, and blocks if any disagree. Silent when all agree or no registry exists.

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REGISTRY_FILE = path.join(process.cwd(), ".elephant-versions.json");

// Extract version from a single source entry. Returns null if file missing or no match.
function extractVersion(source) {
  const filePath = path.join(process.cwd(), source.file);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf8");

  if (source.type === "json") {
    // Prefer jq if available; fall back to a simple dot-path walker.
    try {
      const out = execFileSync("jq", ["-r", source.jq, filePath], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      return out === "null" || out === "" ? null : out;
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
        return val != null ? String(val) : null;
      } catch {
        return null;
      }
    }
  }

  if (source.type === "regex") {
    const m = content.match(new RegExp(source.pattern, "m"));
    return m ? m[1] : null;
  }

  // toml / yaml — caller supplies a regex pattern (same extraction path)
  if (source.type === "toml" || source.type === "yaml") {
    const m = content.match(new RegExp(source.pattern, "m"));
    return m ? m[1] : null;
  }

  return null;
}

function main() {
  let raw = "";
  const timer = setTimeout(() => process.exit(0), 3000);

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    clearTimeout(timer);

    if (!raw.includes("git push")) {
      process.exit(0);
      return;
    }

    let data = {};
    try { data = JSON.parse(raw); } catch {}

    const cmd =
      data.tool_input?.command || (data.input && data.input.command) || "";
    if (!cmd.includes("git push")) {
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
      JSON.stringify({ decision: "block", reason: msg, systemMessage: msg }) +
        "\n",
    );
  });
}

main();
