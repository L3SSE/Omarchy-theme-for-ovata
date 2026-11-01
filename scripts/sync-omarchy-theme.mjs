#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseOmarchyColorsToml,
  buildOmarchyThemeManifest,
} from '../src/omarchy-colors.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const defaultStateDir = join(homedir(), '.local', 'state', 'omarchy', 'current');

function formatThemeName(rawName) {
  const cleaned = rawName.trim();
  if (!cleaned) return 'Active';
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const args = process.argv.slice(2);
let colorsFile = join(defaultStateDir, 'theme', 'colors.toml');
let themeNameFile = join(defaultStateDir, 'theme.name');
let explicitThemeName = null;
let writeManifest = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--write') {
    writeManifest = true;
  } else if (arg === '--colors-file' && args[i + 1]) {
    colorsFile = resolve(args[++i]);
  } else if (arg === '--theme-name' && args[i + 1]) {
    explicitThemeName = args[++i];
  } else {
    console.error(
      'Usage: node scripts/sync-omarchy-theme.mjs [--colors-file <path>] [--theme-name <name>] [--write]',
    );
    process.exit(2);
  }
}

const rawToml = readFileSync(colorsFile, 'utf8');
const parsedColors = parseOmarchyColorsToml(rawToml);
const detectedName =
  explicitThemeName ??
  (existsSync(themeNameFile)
    ? formatThemeName(readFileSync(themeNameFile, 'utf8'))
    : 'Active');

const existingManifestPath = join(repoRoot, 'manifest.json');
const existingManifest = existsSync(existingManifestPath)
  ? JSON.parse(readFileSync(existingManifestPath, 'utf8'))
  : {};

const manifest = buildOmarchyThemeManifest(parsedColors, {
  id: existingManifest.id ?? 'omarchy-theme',
  name: existingManifest.name ?? 'Omarchy Theme',
  version: existingManifest.version ?? '1.0.0',
  author: existingManifest.author ?? 'L3SSE',
  platforms: existingManifest.platforms ?? ['linux'],
  themeName: detectedName,
});

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (writeManifest) {
  writeFileSync(existingManifestPath, serialized, 'utf8');
}
process.stdout.write(serialized);
