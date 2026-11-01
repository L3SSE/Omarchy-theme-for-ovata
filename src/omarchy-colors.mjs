const MAX_COLORS_TOML_BYTES = 64 * 1024;
const HEX_6_OR_8_RE = /^#(?:[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/;
const HEX_6_RE = /^#[a-fA-F0-9]{6}$/;

/**
 * Parse a flat Omarchy `colors.toml` string into a key-value map.
 * Rejects empty, oversized, or syntactically invalid TOML assignments.
 *
 * @param {string} raw
 * @returns {Record<string, string>}
 */
export function parseOmarchyColorsToml(raw) {
  if (typeof raw !== 'string') {
    throw new TypeError('Expected colors.toml content to be a string');
  }
  const byteLength = Buffer.byteLength(raw, 'utf8');
  if (byteLength === 0 || raw.trim().length === 0) {
    throw new Error('colors.toml content cannot be empty');
  }
  if (byteLength > MAX_COLORS_TOML_BYTES) {
    throw new Error(`colors.toml exceeds maximum allowed size (${MAX_COLORS_TOML_BYTES} bytes)`);
  }

  /** @type {Record<string, string>} */
  const entries = Object.create(null);
  const lines = raw.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const match = /^([a-zA-Z0-9_]+)\s*=\s*"([^"]*)"(?:\s*#.*)?$/.exec(line);
    if (!match) {
      throw new Error(`Invalid colors.toml assignment at line ${i + 1}: ${line}`);
    }
    const [, key, value] = match;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error(`Disallowed key in colors.toml at line ${i + 1}: ${key}`);
    }
    entries[key] = value;
  }

  if (Object.keys(entries).length === 0) {
    throw new Error('colors.toml contains no valid assignments');
  }

  return entries;
}

/**
 * Validate a 6-digit or 8-digit CSS hex color token required by Ovata.
 *
 * @param {string | undefined} value
 * @param {string} fieldName
 * @returns {string}
 */
export function assertHexColor(value, fieldName) {
  if (typeof value !== 'string' || !HEX_6_OR_8_RE.test(value)) {
    throw new Error(`Invalid hex color for ${fieldName}: ${String(value)}`);
  }
  return value.toLowerCase();
}

/**
 * Derive an 8-digit hex glow token (`#rrggbbaa`) from a 6- or 8-digit hex accent.
 *
 * @param {string} hex
 * @param {string} [alphaHex='44']
 * @returns {string}
 */
export function withGlowAlpha(hex, alphaHex = '44') {
  const normalized = assertHexColor(hex, 'accent');
  if (!/^[a-fA-F0-9]{2}$/.test(alphaHex)) {
    throw new Error(`Invalid 2-digit alpha hex: ${alphaHex}`);
  }
  const base6 = HEX_6_RE.test(normalized) ? normalized : normalized.slice(0, 7);
  return `${base6}${alphaHex.toLowerCase()}`;
}

/**
 * Map parsed Omarchy `colors.toml` entries to Ovata's ThemeManifest structure.
 *
 * @param {Record<string, string>} colors
 * @param {{
 *   id?: string;
 *   name?: string;
 *   version?: string;
 *   author?: string;
 *   themeName?: string;
 *   platforms?: ('linux' | 'android')[];
 * }} [options]
 */
export function buildOmarchyThemeManifest(colors, options = {}) {
  if (!colors || typeof colors !== 'object') {
    throw new TypeError('Expected parsed colors object');
  }

  const mode = colors.mode ?? 'dark';
  if (mode !== 'dark' && mode !== 'light') {
    throw new Error(`Unsupported theme mode "${String(mode)}" (expected "dark" or "light")`);
  }

  const background = assertHexColor(colors.background, 'background');
  const accent = assertHexColor(colors.accent ?? colors.blue, 'accent');
  const darkBackground = assertHexColor(
    colors.dark_background ?? colors.background,
    'dark_background',
  );
  const darkerBackground = assertHexColor(
    colors.darker_background ?? colors.dark_background ?? colors.background,
    'darker_background',
  );
  const lighterBackground = assertHexColor(
    colors.lighter_background ?? colors.selection ?? colors.background,
    'lighter_background',
  );
  const foreground = assertHexColor(colors.foreground, 'foreground');
  const brightForeground = assertHexColor(
    colors.bright_foreground ?? colors.foreground,
    'bright_foreground',
  );
  const lightForeground = assertHexColor(
    colors.light_foreground ?? colors.dark_foreground ?? colors.foreground,
    'light_foreground',
  );
  const muted = assertHexColor(colors.muted ?? colors.selection ?? colors.background, 'muted');
  const danger = assertHexColor(colors.red ?? colors.bright_red, 'red');

  const id = options.id ?? 'omarchy-theme';
  const name = options.name ?? 'Omarchy Theme';
  const version = options.version ?? '1.0.0';
  const author = options.author ?? 'L3SSE';
  const platforms = options.platforms ?? ['linux'];
  const activePreset = (options.themeName ?? 'Everforest').trim() || 'Active';

  return {
    schemaVersion: 1,
    apiVersion: 1,
    id,
    name,
    version,
    description: `Applies the active Omarchy Linux desktop palette (${activePreset} ${mode}) to Ovata chrome and canvas nodes.`,
    author,
    platforms,
    kind: 'theme',
    theme: {
      mode,
      tokens: {
        '--node-bg': background,
        '--node-glow': withGlowAlpha(accent, '44'),
        '--bg-base': darkBackground,
        '--bg-elevated': lighterBackground,
        '--text-elevated': foreground,
        '--text-bright': brightForeground,
        '--text-faint': lightForeground,
        '--accent-primary': accent,
        '--on-accent': darkerBackground,
        '--border-elevated': muted,
        '--danger': danger,
      },
    },
  };
}
