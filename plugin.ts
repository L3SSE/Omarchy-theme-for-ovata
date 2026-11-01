import { definePlugin } from '@ovata/plugin-api/runtime';
import {
  DEFAULT_OMARCHY_PRESET_KEY,
  OMARCHY_PRESETS,
  type OmarchyPreset,
} from './src/active-palette.ts';

interface StoredThemeSettings {
  presetId?: string;
  customTokens?: Record<string, string>;
  customName?: string;
  customMode?: 'dark' | 'light';
}

const HEX_OR_SAFE_TOKEN_RE = /^(?:#(?:[a-fA-F0-9]{6}|[a-fA-F0-9]{8})|none|1)$/;

function isSafeTokenMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 64) return false;
  return entries.every(
    ([key, val]) =>
      key.startsWith('--') &&
      typeof val === 'string' &&
      HEX_OR_SAFE_TOKEN_RE.test(val),
  );
}

definePlugin((sdk) => {
  const { React } = sdk;
  let disposed = false;
  let loadedBaseline: unknown = null;
  let currentPreset: OmarchyPreset =
    OMARCHY_PRESETS[DEFAULT_OMARCHY_PRESET_KEY] ??
    Object.values(OMARCHY_PRESETS)[0];
  let lastError: string | null = null;
  const subscribers = new Set<() => void>();

  const notify = () => {
    for (const sub of subscribers) sub();
  };

  const targets = (): HTMLElement[] => {
    if (typeof document === 'undefined') return [];
    const list: HTMLElement[] = [];
    if (document.documentElement instanceof HTMLElement) {
      list.push(document.documentElement);
    }
    if (document.body instanceof HTMLElement) {
      list.push(document.body);
    }
    const container = document.querySelector('.app-container');
    if (container instanceof HTMLElement) {
      list.push(container);
    }
    return list;
  };

  const previousInlineValues = new Map<HTMLElement, Map<string, string>>();
  let styleTag: HTMLStyleElement | null = null;

  const renderDynamicCss = (tokens: Readonly<Record<string, string>>): string => {
    const declarations = Object.entries(tokens)
      .map(([k, v]) => `  ${k}: ${v} !important;`)
      .join('\n');
    return `:root, body, body.theme-dark, body.theme-light, body.theme-rain, body.theme-tokyonight, .app-container, .app-container.theme-dark, .app-container.theme-light, .app-container.theme-rain, .app-container.theme-tokyonight {\n${declarations}\n}\nbody .file-manager, body .sidebar, body .fm-header { background-color: var(--bg-panel) !important; }\n`;
  };

  const applyPresetToDom = (preset: OmarchyPreset) => {
    if (disposed || sdk.signal.aborted) return;
    currentPreset = preset;

    if (typeof document !== 'undefined' && document.head) {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.setAttribute('data-omarchy-theme-dynamic', 'true');
        document.head.append(styleTag);
      }
      styleTag.textContent = renderDynamicCss(preset.tokens);
    }

    for (const el of targets()) {
      let saved = previousInlineValues.get(el);
      if (!saved) {
        saved = new Map<string, string>();
        for (const key of Object.keys(preset.tokens)) {
          saved.set(key, el.style.getPropertyValue(key));
        }
        previousInlineValues.set(el, saved);
      }
      for (const [key, value] of Object.entries(preset.tokens)) {
        el.style.setProperty(key, value);
      }
    }

    sdk.setStatus(`Omarchy: ${preset.name} (${preset.mode})`);
    notify();
  };

  const restoreDom = () => {
    disposed = true;
    if (styleTag) {
      styleTag.remove();
      styleTag = null;
    }
    for (const [el, saved] of previousInlineValues.entries()) {
      for (const [key, prior] of saved.entries()) {
        if (prior) {
          el.style.setProperty(key, prior);
        } else {
          el.style.removeProperty(key);
        }
      }
    }
    previousInlineValues.clear();
    subscribers.clear();
  };

  const resolveFromSettings = (raw: unknown): OmarchyPreset => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const data = raw as StoredThemeSettings;
      if (isSafeTokenMap(data.customTokens)) {
        return {
          id: data.presetId ?? 'custom',
          name:
            typeof data.customName === 'string' && data.customName.trim()
              ? data.customName.trim()
              : 'Omarchy Active',
          mode: data.customMode === 'light' ? 'light' : 'dark',
          accent: data.customTokens['--accent'] ?? '#7fbbb3',
          background: data.customTokens['--bg-dark'] ?? '#2d353b',
          foreground: data.customTokens['--text-main'] ?? '#d3c6aa',
          tokens: data.customTokens,
        };
      }
      if (typeof data.presetId === 'string' && OMARCHY_PRESETS[data.presetId]) {
        return OMARCHY_PRESETS[data.presetId];
      }
    }
    return (
      OMARCHY_PRESETS[DEFAULT_OMARCHY_PRESET_KEY] ??
      Object.values(OMARCHY_PRESETS)[0]
    );
  };

  const reloadFromSettings = async () => {
    if (disposed || sdk.signal.aborted) return;
    try {
      const loaded = await sdk.app.loadSettings();
      if (disposed || sdk.signal.aborted) return;
      loadedBaseline = loaded;
      lastError = null;
      applyPresetToDom(resolveFromSettings(loaded));
    } catch (error) {
      if (disposed || sdk.signal.aborted) return;
      lastError =
        error instanceof Error ? error.message : 'Failed to load theme settings';
      notify();
    }
  };

  const selectAndSavePreset = async (presetId: string) => {
    const target = OMARCHY_PRESETS[presetId];
    if (!target || disposed || sdk.signal.aborted) return;
    applyPresetToDom(target);
    const nextValue: StoredThemeSettings = { presetId: target.id };
    try {
      await sdk.app.saveSettings(nextValue, loadedBaseline);
      if (disposed || sdk.signal.aborted) return;
      loadedBaseline = nextValue;
      lastError = null;
      notify();
    } catch (error) {
      if (disposed || sdk.signal.aborted) return;
      lastError =
        error instanceof Error
          ? `${error.message} — click "Reload from Omarchy / Disk" to sync.`
          : 'Settings save conflict';
      notify();
    }
  };

  applyPresetToDom(currentPreset);
  void reloadFromSettings();

  const onWindowFocus = () => {
    void reloadFromSettings();
  };
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('focus', onWindowFocus);
  }

  sdk.onDispose(() => {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('focus', onWindowFocus);
    }
    restoreDom();
  });

  sdk.registerCommand({
    id: 'reload',
    name: 'Reload Omarchy theme',
    run: reloadFromSettings,
  });

  sdk.registerView({
    id: 'picker',
    name: 'Omarchy Theme Picker',
    component: function OmarchyThemePicker() {
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const listener = () => setTick((n) => n + 1);
        subscribers.add(listener);
        return () => {
          subscribers.delete(listener);
        };
      }, []);

      const presetList = Object.values(OMARCHY_PRESETS);

      return React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            },
          },
          React.createElement(
            'span',
            null,
            `Active palette: ${currentPreset.name} (${currentPreset.mode})`,
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => void reloadFromSettings(),
              style: {
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-elevated)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-elevated)',
                cursor: 'pointer',
              },
            },
            'Reload from Omarchy / Disk',
          ),
        ),
        lastError
          ? React.createElement(
              'p',
              { style: { color: 'var(--danger)', margin: 0 } },
              lastError,
            )
          : null,
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '8px',
            },
          },
          ...presetList.map((preset) => {
            const active = currentPreset.id === preset.id;
            return React.createElement(
              'button',
              {
                key: preset.id,
                type: 'button',
                'aria-pressed': active,
                onClick: () => void selectAndSavePreset(preset.id),
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: active
                    ? `2px solid ${preset.accent}`
                    : '1px solid var(--border-elevated)',
                  background: preset.background,
                  color: preset.foreground,
                  cursor: 'pointer',
                  textAlign: 'left',
                },
              },
              React.createElement('span', null, preset.name),
              React.createElement('span', {
                style: {
                  width: '14px',
                  height: '14px',
                  borderRadius: '999px',
                  background: preset.accent,
                  display: 'inline-block',
                  flexShrink: 0,
                },
              }),
            );
          }),
        ),
      );
    },
  });
});
