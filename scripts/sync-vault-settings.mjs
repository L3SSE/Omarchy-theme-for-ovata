#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
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

function discoverRegisteredVaults(home) {
  const candidates = [
    join(home, '.local', 'share', 'com.ovata.dev', 'vault-registry.json'),
    join(home, '.local', 'share', 'com.ovata.app', 'vault-registry.json'),
    join(home, '.local', 'share', 'Ovata', 'vault-registry.json'),
  ];
  const vaults = new Set();

  for (const registryPath of candidates) {
    if (!existsSync(registryPath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(registryPath, 'utf8'));
      if (Array.isArray(parsed?.vaults)) {
        for (const entry of parsed.vaults) {
          if (typeof entry?.path === 'string' && existsSync(entry.path)) {
            vaults.add(resolve(entry.path));
          }
        }
      }
    } catch {
      /* ignore unreadable registry */
    }
  }

  return [...vaults];
}

export function syncVaultThemeSettings(vaultRoot, omarchyState) {
  const settingsDir = join(vaultRoot, '.Ovata', 'plugin-data', 'omarchy-theme');
  mkdirSync(settingsDir, { recursive: true });
  const settingsPath = join(settingsDir, 'settings.json');

  let existing = {};
  if (existsSync(settingsPath)) {
    try {
      const raw = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        existing = raw;
      }
    } catch {
      existing = {};
    }
  }

  const sourceMode =
    existing.sourceMode === 'manual' ? 'manual' : 'follow-omarchy';
  const manualPresetId =
    typeof existing.manualPresetId === 'string'
      ? existing.manualPresetId
      : omarchyState.slug;

  const nextSettings = {
    sourceMode,
    manualPresetId,
    omarchyPresetId: omarchyState.slug,
    omarchyName: omarchyState.name,
    omarchyMode: omarchyState.mode,
    omarchyTokens: omarchyState.tokens,
    updatedAt: new Date().toISOString(),
  };

  const tmpPath = join(
    settingsDir,
    `.settings.json.tmp.${process.pid}.${Date.now()}`,
  );
  writeFileSync(tmpPath, `${JSON.stringify(nextSettings, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, settingsPath);
  return { settingsPath, nextSettings };
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) ===
    resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const home = homedir();
  const stateDir = join(home, '.local', 'state', 'omarchy', 'current');
  const colorsFile = join(stateDir, 'theme', 'colors.toml');
  const themeNameFile = join(stateDir, 'theme.name');

  if (!existsSync(colorsFile)) {
    process.exit(0);
  }

  const rawToml = readFileSync(colorsFile, 'utf8');
  const parsed = parseOmarchyColorsToml(rawToml);
  const palette = resolveOmarchyPalette(parsed);
  const slug = existsSync(themeNameFile)
    ? readFileSync(themeNameFile, 'utf8').trim().toLowerCase()
    : 'active';
  const name = existsSync(themeNameFile)
    ? formatThemeName(readFileSync(themeNameFile, 'utf8'))
    : 'Omarchy Active';

  const omarchyState = {
    slug,
    name,
    mode: palette.mode,
    tokens: buildOvataTokenMap(palette),
  };

  const cliVaults = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('--'))
    .map((p) => resolve(p));
  const targetVaults =
    cliVaults.length > 0 ? cliVaults : discoverRegisteredVaults(home);

  for (const vaultRoot of targetVaults) {
    if (!existsSync(join(vaultRoot, '.Ovata'))) continue;
    const { settingsPath } = syncVaultThemeSettings(vaultRoot, omarchyState);
    console.log(
      `Synced Omarchy theme "${name}" (${palette.mode}) -> ${settingsPath}`,
    );
  }
}
