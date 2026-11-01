import { definePlugin } from '@ovata/plugin-api/runtime';
import {
  DEFAULT_OMARCHY_PRESET_KEY,
  OMARCHY_PRESETS,
  type OmarchyPreset,
} from './src/active-palette.ts';

type ThemeSourceMode = 'follow-omarchy' | 'manual';

interface StoredThemeSettings {
  sourceMode?: ThemeSourceMode;
  manualPresetId?: string;
  omarchyPresetId?: string;
  omarchyName?: string;
  omarchyMode?: 'dark' | 'light';
  omarchyTokens?: Record<string, string>;
  updatedAt?: string;
  // Legacy v1.1.0 compatibility fields:
  presetId?: string;
  customTokens?: Record<string, string>;
  customName?: string;
  customMode?: 'dark' | 'light';
}

const HEX_OR_SAFE_TOKEN_RE = /^(?:#(?:[a-fA-F0-9]{6}|[a-fA-F0-9]{8})|none|1)$/;
const POLL_INTERVAL_MS = 1500;

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
  const fallbackPreset: OmarchyPreset =
    OMARCHY_PRESETS[DEFAULT_OMARCHY_PRESET_KEY] ??
    Object.values(OMARCHY_PRESETS)[0];

  let sourceMode: ThemeSourceMode = 'follow-omarchy';
  let manualPresetId: string = fallbackPreset.id;
  let omarchyLivePreset: OmarchyPreset = fallbackPreset;
  let appliedPreset: OmarchyPreset = fallbackPreset;
  let lastAppliedSignature = '';
  let lastError: string | null = null;
  let pollInFlight = false;

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

  const applyPresetToDom = (preset: OmarchyPreset, modeLabel: ThemeSourceMode) => {
    if (disposed || sdk.signal.aborted) return;
    const signature = `${modeLabel}:${preset.id}:${preset.name}:${preset.mode}:${JSON.stringify(preset.tokens)}`;
    appliedPreset = preset;

    if (signature !== lastAppliedSignature) {
      lastAppliedSignature = signature;

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

      const badge = modeLabel === 'follow-omarchy' ? 'Following Omarchy' : 'Manual';
      sdk.setStatus(`Omarchy: ${preset.name} (${preset.mode} · ${badge})`);
    }
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

  const parseSettingsState = (raw: unknown): {
    mode: ThemeSourceMode;
    manualId: string;
    livePreset: OmarchyPreset;
    targetPreset: OmarchyPreset;
  } => {
    let mode: ThemeSourceMode = 'follow-omarchy';
    let manualId: string = manualPresetId;
    let livePreset: OmarchyPreset = fallbackPreset;

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const data = raw as StoredThemeSettings;

      if (data.sourceMode === 'manual' || data.sourceMode === 'follow-omarchy') {
        mode = data.sourceMode;
      }

      if (typeof data.manualPresetId === 'string' && OMARCHY_PRESETS[data.manualPresetId]) {
        manualId = data.manualPresetId;
      } else if (typeof data.presetId === 'string' && OMARCHY_PRESETS[data.presetId]) {
        manualId = data.presetId;
      }

      const tokensCandidate = data.omarchyTokens ?? data.customTokens;
      const slugCandidate = data.omarchyPresetId ?? data.presetId;
      const nameCandidate = data.omarchyName ?? data.customName;
      const modeCandidate = data.omarchyMode ?? data.customMode;

      if (isSafeTokenMap(tokensCandidate)) {
        livePreset = {
          id: typeof slugCandidate === 'string' && slugCandidate ? slugCandidate : 'omarchy-active',
          name:
            typeof nameCandidate === 'string' && nameCandidate.trim()
              ? nameCandidate.trim()
              : 'Omarchy Active',
          mode: modeCandidate === 'light' ? 'light' : 'dark',
          accent: tokensCandidate['--accent'] ?? fallbackPreset.accent,
          background: tokensCandidate['--bg-dark'] ?? fallbackPreset.background,
          foreground: tokensCandidate['--text-main'] ?? fallbackPreset.foreground,
          tokens: tokensCandidate,
        };
      } else if (typeof slugCandidate === 'string' && OMARCHY_PRESETS[slugCandidate]) {
        livePreset = OMARCHY_PRESETS[slugCandidate];
      }
    }

    const targetPreset =
      mode === 'manual'
        ? (OMARCHY_PRESETS[manualId] ?? livePreset)
        : livePreset;

    return { mode, manualId, livePreset, targetPreset };
  };

  const reloadFromSettings = async () => {
    if (disposed || sdk.signal.aborted || pollInFlight) return;
    pollInFlight = true;
    try {
      const loaded = await sdk.app.loadSettings();
      if (disposed || sdk.signal.aborted) return;
      loadedBaseline = loaded;
      const resolved = parseSettingsState(loaded);
      sourceMode = resolved.mode;
      manualPresetId = resolved.manualId;
      omarchyLivePreset = resolved.livePreset;
      lastError = null;
      applyPresetToDom(resolved.targetPreset, resolved.mode);
    } catch (error) {
      if (disposed || sdk.signal.aborted) return;
      lastError =
        error instanceof Error ? error.message : 'Failed to load theme settings';
      notify();
    } finally {
      pollInFlight = false;
    }
  };

  const persistPreference = async (
    nextMode: ThemeSourceMode,
    nextManualPresetId: string,
  ) => {
    if (disposed || sdk.signal.aborted) return;
    sourceMode = nextMode;
    manualPresetId = nextManualPresetId;

    const immediateTarget =
      nextMode === 'manual'
        ? (OMARCHY_PRESETS[nextManualPresetId] ?? omarchyLivePreset)
        : omarchyLivePreset;
    applyPresetToDom(immediateTarget, nextMode);

    try {
      // Refresh baseline immediately before compare-and-save so external hook updates are preserved.
      const freshest = await sdk.app.loadSettings();
      if (disposed || sdk.signal.aborted) return;
      loadedBaseline = freshest;
      const resolved = parseSettingsState(freshest);
      omarchyLivePreset = resolved.livePreset;

      const baseObj =
        freshest && typeof freshest === 'object' && !Array.isArray(freshest)
          ? (freshest as StoredThemeSettings)
          : {};

      const nextSettings: StoredThemeSettings = {
        ...baseObj,
        sourceMode: nextMode,
        manualPresetId: nextManualPresetId,
      };

      await sdk.app.saveSettings(nextSettings, freshest);
      if (disposed || sdk.signal.aborted) return;
      loadedBaseline = nextSettings;
      lastError = null;

      const finalTarget =
        nextMode === 'manual'
          ? (OMARCHY_PRESETS[nextManualPresetId] ?? omarchyLivePreset)
          : omarchyLivePreset;
      applyPresetToDom(finalTarget, nextMode);
    } catch (error) {
      if (disposed || sdk.signal.aborted) return;
      lastError =
        error instanceof Error
          ? `${error.message} — click "Sync Now" to retry.`
          : 'Settings save conflict';
      notify();
    }
  };

  applyPresetToDom(appliedPreset, sourceMode);
  void reloadFromSettings();

  const pollTimer = setInterval(() => {
    if (disposed || sdk.signal.aborted) return;
    void reloadFromSettings();
  }, POLL_INTERVAL_MS);

  const onWindowFocus = () => {
    if (disposed || sdk.signal.aborted) return;
    void reloadFromSettings();
  };
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('focus', onWindowFocus);
  }

  sdk.onDispose(() => {
    clearInterval(pollTimer);
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('focus', onWindowFocus);
    }
    restoreDom();
  });

  sdk.registerCommand({
    id: 'follow-omarchy',
    name: 'Follow Omarchy active theme',
    run: () => persistPreference('follow-omarchy', manualPresetId),
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
      const isFollowing = sourceMode === 'follow-omarchy';

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
            'div',
            { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            React.createElement(
              'button',
              {
                type: 'button',
                'aria-pressed': isFollowing,
                onClick: () => void persistPreference('follow-omarchy', manualPresetId),
                style: {
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: isFollowing
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--border-elevated)',
                  background: isFollowing ? 'var(--surface-active)' : 'var(--bg-elevated)',
                  color: 'var(--text-elevated)',
                  fontWeight: isFollowing ? 600 : 400,
                  cursor: 'pointer',
                },
              },
              `Follow Omarchy Active Theme (${omarchyLivePreset.name})`,
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                'aria-pressed': !isFollowing,
                onClick: () => void persistPreference('manual', manualPresetId),
                style: {
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: !isFollowing
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--border-elevated)',
                  background: !isFollowing ? 'var(--surface-active)' : 'var(--bg-elevated)',
                  color: 'var(--text-elevated)',
                  fontWeight: !isFollowing ? 600 : 400,
                  cursor: 'pointer',
                },
              },
              'Choose Theme Yourself',
            ),
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
            'Sync Now',
          ),
        ),
        React.createElement(
          'p',
          { style: { margin: 0, color: 'var(--text-faint)', fontSize: '0.9em' } },
          isFollowing
            ? `Currently following Omarchy system theme: ${omarchyLivePreset.name} (${omarchyLivePreset.mode}). Switching themes in Omarchy updates Ovata automatically. Click any theme below to switch to manual selection.`
            : `Currently pinned to manual choice: ${appliedPreset.name} (${appliedPreset.mode}). Click "Follow Omarchy Active Theme" above to resume automatic syncing.`,
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
            const active = !isFollowing && manualPresetId === preset.id;
            const isSystemActive = isFollowing && omarchyLivePreset.id === preset.id;
            return React.createElement(
              'button',
              {
                key: preset.id,
                type: 'button',
                'aria-pressed': active || isSystemActive,
                onClick: () => void persistPreference('manual', preset.id),
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border:
                    active || isSystemActive
                      ? `2px solid ${preset.accent}`
                      : '1px solid var(--border-elevated)',
                  background: preset.background,
                  color: preset.foreground,
                  cursor: 'pointer',
                  textAlign: 'left',
                },
              },
              React.createElement(
                'span',
                null,
                preset.name + (isSystemActive ? ' (Omarchy)' : ''),
              ),
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
