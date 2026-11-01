#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  parseOmarchyColorsToml,
  resolveOmarchyPalette,
  buildOvataTokenMap,
} from '../src/omarchy-colors.mjs';

function formatThemeName(rawName) {
  const cleaned = rawName.trim();
  if (!cleaned) return 'Omarchy Active';
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const vaultArg = process.argv[2];
if (!vaultArg) {
  console.error('Usage: node scripts/sync-vault-settings.mjs <vault-directory>');
  process.exit(2);
}

const vaultRoot = resolve(vaultArg);
const stateDir = join(homedir(), '.local', 'state', 'omarchy', 'current');
const colorsFile = join(stateDir, 'theme', 'colors.toml');
const themeNameFile = join(stateDir, 'theme.name');

const rawToml = readFileSync(colorsFile, 'utf8');
const parsed = parseOmarchyColorsToml(rawToml);
const palette = resolveOmarchyPalette(parsed);
const slug = existsSync(themeNameFile)
  ? readFileSync(themeNameFile, 'utf8').trim().toLowerCase()
  : 'active';
const name = existsSync(themeNameFile)
  ? formatThemeName(readFileSync(themeNameFile, 'utf8'))
  : 'Omarchy Active';

const settingsDir = join(vaultRoot, '.Ovata', 'plugin-data', 'omarchy-theme');
mkdirSync(settingsDir, { recursive: true });
const settingsPath = join(settingsDir, 'settings.json');

const payload = {
  presetId: slug,
  customName: name,
  customMode: palette.mode,
  customTokens: buildOvataTokenMap(palette),
};

writeFileSync(settingsPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Synced Omarchy theme "${name}" (${palette.mode}) -> ${settingsPath}`);
