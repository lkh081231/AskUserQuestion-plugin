#!/usr/bin/env node

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "dist/plugin/ask-user-question");
const entries = [
  "plugin.json",
  ".app.json",
  ".codex-plugin",
  "assets",
  "skills",
  "README.md",
  "docs",
];

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const entry of entries) {
  const destination = resolve(target, entry);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, entry), destination, { recursive: true });
}

console.log(`Plugin package created at ${target}`);
