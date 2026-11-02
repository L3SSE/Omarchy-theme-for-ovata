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
 * Normalize and validate all palette colors from an Omarchy `colors.toml` object.
 *
 * @param {Record<string, string>} colors
 */
export function resolveOmarchyPalette(colors) {
  if (!colors || typeof colors !== 'object') {
    throw new TypeError('Expected parsed colors object');
  }

  const mode = colors.mode ?? 'dark';
  if (mode !== 'dark' && mode !== 'light') {
    throw new Error(`Unsupported theme mode "${String(mode)}" (expected "dark" or "light")`);
  }

  const background = assertHexColor(colors.background, 'background');
  const accent = assertHexColor(colors.accent ?? colors.blue, 'accent');
  const selection = assertHexColor(
    colors.selection ?? colors.lighter_background ?? colors.background,
    'selection',
  );
  const muted = assertHexColor(colors.muted ?? colors.selection ?? colors.background, 'muted');
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
  const red = assertHexColor(colors.red ?? colors.bright_red, 'red');
  const yellow = assertHexColor(colors.yellow ?? colors.bright_yellow ?? accent, 'yellow');
  const green = assertHexColor(colors.green ?? colors.bright_green ?? accent, 'green');
  const cyan = assertHexColor(colors.cyan ?? colors.bright_cyan ?? accent, 'cyan');
  const blue = assertHexColor(colors.blue ?? colors.bright_blue ?? accent, 'blue');
  const magenta = assertHexColor(colors.magenta ?? colors.bright_magenta ?? accent, 'magenta');

  return {
    mode,
    background,
    accent,
    selection,
    muted,
    darkBackground,
    darkerBackground,
    lighterBackground,
    foreground,
    brightForeground,
    lightForeground,
    red,
    yellow,
    green,
    cyan,
    blue,
    magenta,
    nodeGlow: withGlowAlpha(accent, '44'),
    surfaceSunken: withGlowAlpha(darkerBackground, 'a6'),
    surfaceFloating: withGlowAlpha(background, 'eb'),
  };
}

/**
 * Convert a resolved Omarchy palette into the complete map of Ovata CSS custom properties.
 *
 * @param {ReturnType<typeof resolveOmarchyPalette>} p
 * @returns {Record<string, string>}
 */
export function buildOvataTokenMap(p) {
  return {
    '--bg-dark': p.background,
    '--bg-panel': p.darkBackground,
    '--text-main': p.foreground,
    '--text-muted': p.lightForeground,
    '--accent': p.accent,
    '--selection': p.selection,
    '--border': p.muted,
    '--bg-image': 'none',
    '--bg-opacity': '1',
    '--bg-base': p.darkBackground,
    '--bg-elevated': p.lighterBackground,
    '--border-elevated': p.muted,
    '--border-toolbar': p.muted,
    '--border-subtle': p.lighterBackground,
    '--surface-active': p.selection,
    '--surface-sunken': p.surfaceSunken,
    '--surface-floating': p.surfaceFloating,
    '--accent-primary': p.accent,
    '--on-accent': p.darkerBackground,
    '--accent-success': p.green,
    '--text-elevated': p.foreground,
    '--text-bright': p.brightForeground,
    '--text-faint': p.lightForeground,
    '--danger': p.red,
    '--file-folder': p.yellow,
    '--file-markdown': p.blue,
    '--file-note': p.green,
    '--file-mindmap': p.magenta,
    '--file-pdfnote': p.red,
    '--node-bg': p.lighterBackground,
    '--node-glow': p.nodeGlow,
    '--md-heading': p.brightForeground,
    '--md-bold': p.blue,
    '--md-italic': p.magenta,
    '--md-link': p.cyan,
    '--md-url': p.green,
    '--md-code-bg': p.darkBackground,
  };
}

/**
 * Generate the full Ovata stylesheet (`styles.css`) that overrides both
 * base layout tokens (`--bg-dark`, `--bg-panel`, `--bg-image`, `--text-main`, etc.)
 * and all semantic/canvas/markdown tokens the moment the plugin is enabled.
 *
 * @param {Record<string, string>} colors
 * @param {{ themeName?: string }} [options]
 * @returns {string}
 */
export function buildOmarchyStylesheet(colors, options = {}) {
  const p = resolveOmarchyPalette(colors);
  const tokens = buildOvataTokenMap(p);
  const activePreset = (options.themeName ?? 'Active').trim() || 'Active';
  const declarations = Object.entries(tokens)
    .map(([key, value]) => `  ${key}: ${value} !important;`)
    .join('\n');

  return `/* Generated from Omarchy active theme: ${activePreset} (${p.mode}) */
:root,
body,
body.theme-dark,
body.theme-light,
body.theme-rain,
body.theme-tokyonight,
.app-container,
.app-container.theme-dark,
.app-container.theme-light,
.app-container.theme-rain,
.app-container.theme-tokyonight {
${declarations}
}

body .file-manager,
body .sidebar,
body .fm-header {
  background-color: var(--bg-panel) !important;
}

.plugin-status:empty {
  display: none !important;
}
`;
}

/**
 * Build the Ovata extension manifest (`manifest.json`) for the Omarchy theme plugin.
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
  const p = resolveOmarchyPalette(colors);
  const id = options.id ?? 'omarchy-theme-for-ovata';
  const name = options.name ?? 'Omarchy Theme for Ovata';
  const version = options.version ?? '1.2.0';
  const author = options.author ?? 'L3SSE';
  const platforms = options.platforms ?? ['linux'];
  const activePreset = (options.themeName ?? 'Active').trim() || 'Active';

  return {
    schemaVersion: 1,
    apiVersion: 1,
    id,
    name,
    version,
    description: `Full-workspace Omarchy Linux theme integration for Ovata. Styles all 31 Ovata UI, editor, markdown, and canvas tokens to match your active Omarchy desktop palette in real time via Omarchy's theme-set hook, or lets you manually pin any of the 22 built-in Omarchy dark and light color presets (default: ${activePreset} ${p.mode}).`,
    author,
    platforms,
    kind: 'extension',
    entry: 'main.js',
    styles: 'styles.css',
    capabilities: [
      'ui:styles',
      'ui:status',
      'ui:views',
      'commands:register',
      'settings:read-write',
    ],
  };
}
