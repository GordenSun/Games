#!/usr/bin/env node
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const execFileAsync = promisify(execFile);

async function exists(rel) {
  try {
    await access(path.join(ROOT, rel), constants.R_OK);
    return true;
  } catch {
    errors.push(`缺少文件：${rel}`);
    return false;
  }
}

for (const rel of [
  "index.html",
  "styles/main.css",
  "src/main.js",
  "src/assetManifest.js",
  "assets/kenney/manifest.json",
  "assets/kenney/LICENSES.md",
]) {
  await exists(rel);
}

const html = await readFile(path.join(ROOT, "index.html"), "utf8");
for (const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
  const rel = match[1].split("#")[0];
  if (rel.startsWith("https://")) continue;
  await exists(rel);
}

const manifest = JSON.parse(await readFile(path.join(ROOT, "assets/kenney/manifest.json"), "utf8"));
for (const [key, item] of Object.entries(manifest.assets)) {
  const rel = item.path;
  const file = path.join(ROOT, rel);
  try {
    const info = await stat(file);
    if (info.size <= 0) errors.push(`空素材文件：${key} -> ${rel}`);
  } catch {
    errors.push(`manifest 指向不存在素材：${key} -> ${rel}`);
  }
}

const modules = [
  "src/main.js",
  "src/assetManifest.js",
  "src/audio.js",
  "src/canvasGame.js",
  "src/input.js",
  "src/loader.js",
  "src/math.js",
  "src/storage.js",
  "src/games/spaceShooter.js",
  "src/games/platformer.js",
  "src/games/tankArena.js",
  "src/games/racer.js",
  "src/games/match3.js",
  "src/games/memoryCards.js",
];

for (const rel of modules) {
  try {
    await execFileAsync(process.execPath, ["--check", path.join(ROOT, rel)], { cwd: ROOT });
  } catch (error) {
    errors.push(`JS 基础语法检查失败：${rel}\n${error.stderr || error.message}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Static site validation passed. Checked ${Object.keys(manifest.assets).length} assets and ${modules.length} modules.`);
