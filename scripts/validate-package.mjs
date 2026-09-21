#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

function resolvePackagePath(relativePath) {
  assert.match(relativePath, /^\.\//, `${relativePath} must start with ./`);
  const absolute = resolve(root, relativePath);
  assert.ok(
    absolute === root || absolute.startsWith(`${root}/`),
    `${relativePath} must stay inside the plugin package`,
  );
  return absolute;
}

const [portable, compatibility, appManifest, packageManifest] =
  await Promise.all([
    readJson("plugin.json"),
    readJson(".codex-plugin/plugin.json"),
    readJson(".app.json"),
    readJson("package.json"),
  ]);

assert.equal(
  portable.$schema,
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
);
assert.equal(portable.name, "ask-user-question");
assert.equal(portable.name, compatibility.name);
assert.equal(portable.version, compatibility.version);
assert.equal(portable.version, packageManifest.version);
assert.equal(portable.extensions?.["com.openai"]?.apps, "./.app.json");
assert.equal(compatibility.apps, "./.app.json");
assert.equal(compatibility.skills, "./skills/");
assert.ok(appManifest.apps && typeof appManifest.apps === "object");

for (const [name, app] of Object.entries(appManifest.apps)) {
  assert.ok(app && typeof app === "object", `${name} must be an object`);
  assert.match(
    app.id,
    /^plugin_asdk_app_[A-Za-z0-9]+$/,
    `${name}.id must be a registered ChatGPT MCP connection id`,
  );
}

const openai = portable.extensions["com.openai"];
for (const field of ["composerIcon", "logo"]) {
  await access(resolvePackagePath(openai.interface[field]));
}
await access(resolve(root, "skills/ask-user-questions/SKILL.md"));

console.log(
  `Package structure valid (${Object.keys(appManifest.apps).length} registered app mapping(s)).`,
);
