import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseOmarchyColorsToml,
  assertHexColor,
  withGlowAlpha,
  buildOmarchyThemeManifest,
} from '../src/omarchy-colors.mjs';

const manifestPath = fileURLToPath(new URL('../manifest.json', import.meta.url));

const EVERFOREST_SAMPLE = `
mode = "dark"

accent = "#7fbbb3"
selection = "#3d484d"
muted = "#475258"

background = "#2d353b"
dark_background = "#21272c"
darker_background = "#181d20"
lighter_background = "#343f44"

foreground = "#d3c6aa"
dark_foreground = "#4f585e"
light_foreground = "#9da9a0"
bright_foreground = "#d3c6aa"

red = "#e67e80"
yellow = "#dbbc7f"
orange = "#e09d7f"
green = "#a7c080"
cyan = "#83c092"
blue = "#7fbbb3"
magenta = "#d699b6"
brown = "#704e3f"
`;

test('shipped manifest.json conforms to Ovata Plugin API v1 theme contract', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.apiVersion, 1);
  assert.equal(manifest.id, 'omarchy-theme');
  assert.equal(manifest.name, 'Omarchy Theme');
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.kind, 'theme');
  assert.deepEqual(manifest.platforms, ['linux']);
  assert.equal('capabilities' in manifest, false, 'theme manifest must not declare capabilities');
  assert.equal('entry' in manifest, false, 'theme manifest must not declare entry');

  assert.equal(manifest.theme.mode, 'dark');
  const tokens = manifest.theme.tokens;
  const expectedTokens = {
    '--node-bg': '#2d353b',
    '--node-glow': '#7fbbb344',
    '--bg-base': '#21272c',
    '--bg-elevated': '#343f44',
    '--text-elevated': '#d3c6aa',
    '--text-bright': '#d3c6aa',
    '--text-faint': '#9da9a0',
    '--accent-primary': '#7fbbb3',
    '--on-accent': '#181d20',
    '--border-elevated': '#475258',
    '--danger': '#e67e80',
  };
  assert.deepEqual(tokens, expectedTokens);

  for (const [key, value] of Object.entries(tokens)) {
    assert.match(value, /^#(?:[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/, `Invalid token ${key}`);
  }
});

test('parseOmarchyColorsToml and buildOmarchyThemeManifest reproduce Everforest manifest deterministically', () => {
  const parsed = parseOmarchyColorsToml(EVERFOREST_SAMPLE);
  const generated = buildOmarchyThemeManifest(parsed, {
    themeName: 'Everforest',
  });
  const shipped = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(generated, shipped);
});

test('handles Unicode comments, CRLF line endings, and Unicode preset names', () => {
  const unicodeToml = [
    '# Omarchy テーマ — Café 森 日本語 🎨',
    'mode = "light" # 明るいモード',
    'accent = "#3A94C5"',
    'background = "#FDF6E3"',
    'dark_background = "#F4F0D9"',
    'darker_background = "#EFEBD4"',
    'lighter_background = "#FFFBEF"',
    'foreground = "#5C6A72"',
    'bright_foreground = "#4F585E"',
    'light_foreground = "#829181"',
    'muted = "#939F91"',
    'red = "#F85552"',
  ].join('\r\n');

  const parsed = parseOmarchyColorsToml(unicodeToml);
  const manifest = buildOmarchyThemeManifest(parsed, {
    themeName: 'Everforest Светлая 森',
  });

  assert.equal(manifest.theme.mode, 'light');
  assert.equal(manifest.theme.tokens['--node-bg'], '#fdf6e3');
  assert.equal(manifest.theme.tokens['--node-glow'], '#3a94c544');
  assert.match(manifest.description, /Everforest Светлая 森 light/);
});

test('rejects empty, whitespace-only, and comment-only inputs', () => {
  assert.throws(() => parseOmarchyColorsToml(''), /cannot be empty/);
  assert.throws(() => parseOmarchyColorsToml('   \n\t  '), /cannot be empty/);
  assert.throws(
    () => parseOmarchyColorsToml('# only comments\n# second line\n'),
    /contains no valid assignments/,
  );
  // @ts-expect-error testing invalid runtime type
  assert.throws(() => parseOmarchyColorsToml(null), /Expected colors\.toml content to be a string/);
});

test('handles large valid inputs within 64 KiB and rejects inputs over 64 KiB', () => {
  const paddingComment = `# ${'x'.repeat(120)}\n`.repeat(350); // ~43 KiB
  const validLarge = `${paddingComment}\n${EVERFOREST_SAMPLE}`;
  const parsed = parseOmarchyColorsToml(validLarge);
  assert.equal(parsed.accent, '#7fbbb3');

  const oversized = `${'# '.concat('y'.repeat(100), '\n').repeat(700)}\n${EVERFOREST_SAMPLE}`;
  assert.throws(() => parseOmarchyColorsToml(oversized), /exceeds maximum allowed size/);
});

test('rejects invalid hex values, CSS functions, prototype-pollution keys, and unsupported modes', () => {
  assert.throws(() => assertHexColor('#fff', '--node-bg'), /Invalid hex color/);
  assert.throws(() => assertHexColor('var(--accent)', '--accent-primary'), /Invalid hex color/);
  assert.throws(() => assertHexColor('rgb(0, 0, 0)', '--bg-base'), /Invalid hex color/);
  assert.throws(() => assertHexColor('url(https://evil.example)', '--node-bg'), /Invalid hex color/);
  assert.throws(() => withGlowAlpha('#7fbbb3', 'zz'), /Invalid 2-digit alpha hex/);

  assert.throws(
    () => parseOmarchyColorsToml('__proto__ = "#000000"\n'),
    /Disallowed key/,
  );

  const parsed = parseOmarchyColorsToml(EVERFOREST_SAMPLE);
  assert.throws(
    () => buildOmarchyThemeManifest({ ...parsed, mode: 'auto' }),
    /Unsupported theme mode/,
  );
  assert.throws(
    () => buildOmarchyThemeManifest({ ...parsed, background: 'not-a-color' }),
    /Invalid hex color for background/,
  );
  const withoutRed = { ...parsed };
  delete withoutRed.red;
  assert.throws(
    () => buildOmarchyThemeManifest(withoutRed),
    /Invalid hex color for red/,
  );
});
