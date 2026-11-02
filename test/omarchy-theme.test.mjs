import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseOmarchyColorsToml,
  assertHexColor,
  withGlowAlpha,
  resolveOmarchyPalette,
  buildOvataTokenMap,
  buildOmarchyStylesheet,
  buildOmarchyThemeManifest,
} from '../src/omarchy-colors.mjs';
import { syncVaultThemeSettings } from '../scripts/sync-vault-settings.mjs';

const manifestPath = fileURLToPath(new URL('../manifest.json', import.meta.url));
const stylesPath = fileURLToPath(new URL('../styles.css', import.meta.url));

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

test('shipped manifest.json and styles.css conform to Ovata Plugin API v1 extension contract', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const css = readFileSync(stylesPath, 'utf8');

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.apiVersion, 1);
  assert.equal(manifest.id, 'omarchy-theme-for-ovata');
  assert.equal(manifest.name, 'Omarchy Theme for Ovata');
  assert.equal(manifest.version, '1.2.0');
  assert.equal(manifest.kind, 'extension');
  assert.equal(manifest.entry, 'main.js');
  assert.equal(manifest.styles, 'styles.css');
  assert.deepEqual(manifest.platforms, ['linux']);
  assert.deepEqual(manifest.capabilities, [
    'ui:styles',
    'ui:status',
    'ui:views',
    'commands:register',
    'settings:read-write',
  ]);

  for (const requiredVar of [
    '--bg-dark:',
    '--bg-panel:',
    '--bg-image: none',
    '--text-main:',
    '--accent:',
    '--node-bg:',
    '--node-glow:',
    '--accent-primary:',
  ]) {
    assert.match(css, new RegExp(requiredVar), `styles.css missing ${requiredVar}`);
  }
});

test('resolveOmarchyPalette and buildOvataTokenMap map Everforest tokens deterministically', () => {
  const parsed = parseOmarchyColorsToml(EVERFOREST_SAMPLE);
  const palette = resolveOmarchyPalette(parsed);
  const tokens = buildOvataTokenMap(palette);

  assert.equal(tokens['--bg-dark'], '#2d353b');
  assert.equal(tokens['--bg-panel'], '#21272c');
  assert.equal(tokens['--bg-image'], 'none');
  assert.equal(tokens['--node-bg'], '#343f44');
  assert.equal(tokens['--node-glow'], '#7fbbb344');
  assert.equal(tokens['--accent-primary'], '#7fbbb3');

  const css = buildOmarchyStylesheet(parsed, { themeName: 'Everforest' });
  assert.match(css, /--bg-dark: #2d353b !important;/);
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
  const paddingComment = `# ${'x'.repeat(120)}\n`.repeat(350);
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

test('syncVaultThemeSettings writes active Omarchy theme while preserving user sourceMode and manualPresetId', () => {
  const scratchVault = mkdtempSync(join(tmpdir(), 'TestVault-omarchy-sync-'));
  try {
    const parsed = parseOmarchyColorsToml(EVERFOREST_SAMPLE);
    const palette = resolveOmarchyPalette(parsed);
    const tokens = buildOvataTokenMap(palette);

    const first = syncVaultThemeSettings(scratchVault, {
      slug: 'everforest',
      name: 'Everforest',
      mode: 'dark',
      tokens,
    });
    assert.equal(first.nextSettings.sourceMode, 'follow-omarchy');
    assert.equal(first.nextSettings.manualPresetId, 'everforest');
    assert.equal(first.nextSettings.omarchyPresetId, 'everforest');

    // Simulate user switching to manual mode ("tokyo-night") in Ovata
    const persisted = JSON.parse(readFileSync(first.settingsPath, 'utf8'));
    persisted.sourceMode = 'manual';
    persisted.manualPresetId = 'tokyo-night';
    writeFileSync(first.settingsPath, JSON.stringify(persisted, null, 2));

    // When Omarchy switches system theme to "ethereal", user's manual choice is preserved
    const second = syncVaultThemeSettings(scratchVault, {
      slug: 'ethereal',
      name: 'Ethereal',
      mode: 'dark',
      tokens,
    });
    assert.equal(second.nextSettings.sourceMode, 'manual');
    assert.equal(second.nextSettings.manualPresetId, 'tokyo-night');
    assert.equal(second.nextSettings.omarchyPresetId, 'ethereal');
    assert.equal(second.nextSettings.omarchyName, 'Ethereal');
  } finally {
    rmSync(scratchVault, { recursive: true, force: true });
  }
});

test('compiled main.js bundle exercises activation, follow-omarchy live sync, manual selection, compare-and-save conflict, and clean disposal', async () => {
  const mainJsPath = fileURLToPath(
    new URL('../dist/omarchy-theme-for-ovata-1.2.0/main.js', import.meta.url),
  );
  const code = readFileSync(mainJsPath, 'utf8');

  class FakeHTMLElement {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase();
      this._props = new Map();
      this.attributes = new Map();
      this.textContent = '';
      this.removed = false;
      this.style = {
        getPropertyValue: (k) => this._props.get(k) ?? '',
        setProperty: (k, v) => this._props.set(k, String(v)),
        removeProperty: (k) => this._props.delete(k),
      };
    }
    setAttribute(k, v) {
      this.attributes.set(k, String(v));
    }
    remove() {
      this.removed = true;
    }
  }

  const prevHTMLElement = globalThis.HTMLElement;
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  const prevOvataPlugins = globalThis.OvataPlugins;

  const docEl = new FakeHTMLElement('html');
  const bodyEl = new FakeHTMLElement('body');
  const appContainer = new FakeHTMLElement('div');
  bodyEl.style.setProperty('--bg-dark', '#15131d');

  const headChildren = [];
  const windowListeners = new Map();

  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.document = {
    documentElement: docEl,
    body: bodyEl,
    head: {
      append: (el) => headChildren.push(el),
    },
    createElement: (tag) => new FakeHTMLElement(tag),
    querySelector: (sel) => (sel === '.app-container' ? appContainer : null),
  };
  globalThis.window = {
    addEventListener: (type, fn) => windowListeners.set(type, fn),
    removeEventListener: (type, fn) => {
      if (windowListeners.get(type) === fn) windowListeners.delete(type);
    },
  };

  let registeredFactory = null;
  globalThis.OvataPlugins = {
    define: (factory) => {
      registeredFactory = factory;
    },
  };

  try {
    new Function(code)();
    assert.equal(typeof registeredFactory, 'function');

    const abort = new AbortController();
    const disposers = [];
    const commands = new Map();
    const views = new Map();
    let statusText = '';
    let storedSettings = {};
    let failNextSave = false;

    const fakeReact = {
      useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
      useEffect: () => {},
      createElement: (type, props, ...children) => ({ type, props, children }),
    };

    const sdk = {
      React: fakeReact,
      signal: abort.signal,
      app: {
        files: () => [],
        readFile: async () => '',
        openFile: async () => {},
        activeDocument: () => null,
        subscribeDocument: () => () => {},
        loadSettings: async () => structuredClone(storedSettings),
        saveSettings: async (value, expected) => {
          if (failNextSave || JSON.stringify(expected) !== JSON.stringify(storedSettings)) {
            failNextSave = false;
            throw new Error('Plugin settings changed externally; reload before saving');
          }
          storedSettings = structuredClone(value);
        },
      },
      registerCommand: (cmd) => commands.set(cmd.id, cmd),
      registerView: (view) => views.set(view.id, view),
      registerPanel: () => {},
      setStatus: (text) => {
        statusText = text;
      },
      onDispose: (fn) => disposers.push(fn),
    };

    await registeredFactory(sdk);
    await new Promise((r) => setTimeout(r, 20));

    // 1. Initial activation applies default Omarchy theme and registers commands/views
    assert.match(statusText, /Following Omarchy\)$/);
    assert.equal(commands.has('follow-omarchy'), true);
    assert.equal(commands.has('reload'), true);
    assert.equal(views.has('picker'), true);
    assert.equal(headChildren.length, 1);

    // 2. Simulate Omarchy hook updating settings.json to Everforest and triggering reload
    const parsedEverforest = parseOmarchyColorsToml(EVERFOREST_SAMPLE);
    const everforestTokens = buildOvataTokenMap(resolveOmarchyPalette(parsedEverforest));
    storedSettings = {
      sourceMode: 'follow-omarchy',
      manualPresetId: 'gruvbox',
      omarchyPresetId: 'everforest',
      omarchyName: 'Everforest',
      omarchyMode: 'dark',
      omarchyTokens: everforestTokens,
    };
    await commands.get('reload').run();
    assert.equal(statusText, 'Omarchy: Everforest (dark · Following Omarchy)');
    assert.equal(bodyEl.style.getPropertyValue('--bg-dark'), '#2d353b');
    assert.equal(appContainer.style.getPropertyValue('--accent-primary'), '#7fbbb3');

    // 3. Render picker view and click "Tokyo Night" card -> switches to manual mode
    const renderedTree = views.get('picker').component();
    const grid = renderedTree.children[3];
    const tokyoButton = grid.children.find((btn) =>
      btn.children[0].children[0].startsWith('Tokyo Night'),
    );
    assert.ok(tokyoButton, 'Expected Tokyo Night button in picker');
    await tokyoButton.props.onClick();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(storedSettings.sourceMode, 'manual');
    assert.equal(storedSettings.manualPresetId, 'tokyo-night');
    assert.match(statusText, /^Omarchy: Tokyo Night \(dark · Manual\)$/);

    // 4. Simulate external conflict during save, then recover via follow-omarchy command
    failNextSave = true;
    await commands.get('follow-omarchy').run();
    await commands.get('follow-omarchy').run();
    assert.equal(storedSettings.sourceMode, 'follow-omarchy');
    assert.equal(statusText, 'Omarchy: Everforest (dark · Following Omarchy)');

    // 5. Dispose restores prior inline properties and removes dynamic style tag
    abort.abort();
    for (const dispose of disposers) dispose();
    assert.equal(headChildren[0].removed, true);
    assert.equal(bodyEl.style.getPropertyValue('--bg-dark'), '#15131d');
    assert.equal(appContainer.style.getPropertyValue('--accent-primary'), '');
    assert.equal(windowListeners.size, 0);
  } finally {
    globalThis.HTMLElement = prevHTMLElement;
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
    globalThis.OvataPlugins = prevOvataPlugins;
  }
});
