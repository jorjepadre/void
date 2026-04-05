#!/usr/bin/env node
// Security audit: scan src/ for banned patterns, excluding safe uses.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SRC_DIR = new URL("../src", import.meta.url).pathname;

// Banned patterns (raw function calls in code)
const BANNED = [
  // Match eval( but not db.exec/regex.exec/pattern.exec
  { re: /\beval\s*\(/g, name: "eval()" },
  { re: /\bnew\s+Function\s*\(/g, name: "new Function()" },
  // Match child_process exec/execSync with string arg — not .exec() methods
  { re: /\b(execSync|exec)\s*\(\s*[`'"][^`'"]*\$\{/g, name: "exec with template literal" },
  // shell: true in spawn options
  { re: /shell\s*:\s*true/g, name: "shell: true" },
];

// Safe contexts to skip
const SAFE_CONTEXTS = [
  /\.exec\(/,           // regex.exec, pattern.exec (method calls)
  /db\.exec/,           // SQLite db.exec (prepared statement runner)
  /\/\/ safe:/,         // inline safe marker
];

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else if (extname(entry) === ".ts") {
      results.push(full);
    }
  }
  return results;
}

let violations = 0;
const files = walk(SRC_DIR);

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (const { re, name } of BANNED) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(content)) !== null) {
      // Find line number
      const before = content.slice(0, match.index);
      const lineNo = before.split("\n").length;
      const line = lines[lineNo - 1] ?? "";

      // Skip if in a safe context
      if (SAFE_CONTEXTS.some((ctx) => ctx.test(line))) continue;

      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

      // Skip string literals that contain the pattern (for code generation)
      // Look for backticks or string that spans the match
      const matchInString = /[`'"].*\beval\b.*[`'"]|[`'"].*execSync\b.*[`'"]/.test(line);
      if (matchInString) continue;

      console.error(`VIOLATION: ${name} at ${file.replace(SRC_DIR, "src")}:${lineNo}`);
      console.error(`  ${line.trim()}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} security violation(s) found.`);
  process.exit(1);
}
console.log("Security audit passed — no banned patterns found.");
