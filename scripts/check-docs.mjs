#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules", "dist"]);
const upstream = resolve(root, "docs/reference/openai/upstream");
const errors = [];

async function collect(directory) {
  if (directory === upstream) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if (extname(entry.name) === ".md") files.push(path);
  }
  return files;
}

for (const file of await collect(root)) {
  const source = await readFile(file, "utf8");
  const relative = file.slice(root.length + 1);
  if (!source.endsWith("\n")) errors.push(`${relative}: missing final newline`);
  const h1Count = source.split("\n").filter((line) => /^# /.test(line)).length;
  if (h1Count !== 1) errors.push(`${relative}: expected one H1, found ${h1Count}`);
  const fenceCount = source.split("\n").filter((line) => /^```/.test(line)).length;
  if (fenceCount % 2 !== 0) errors.push(`${relative}: unbalanced fenced code block`);

  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    target = target.split(/\s+['"]/)[0].split("#")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    try {
      await access(resolve(dirname(file), decodeURIComponent(target)));
    } catch {
      errors.push(`${relative}: missing local link target ${target}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Markdown structure and local links are valid.");
}
