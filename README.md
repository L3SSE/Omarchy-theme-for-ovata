# Omarchy Theme (`omarchy-theme`)

An [Ovata](https://github.com/L3SSE/Ovata) `kind: "extension"` theme plugin that styles the entire Ovata workspace and canvas using your **Omarchy** Linux desktop palette immediately upon activation, bundles all 22 official Omarchy presets, and supports live settings reload when you switch themes.

---

## Why `kind: "extension"` Instead of `kind: "theme"`?

In Ovata `0.3.0-alpha.1` (`09e44235bd6634d02d9cf71a0a79b48043e8683c`), `kind: "theme"` manifests are limited to an 11-token schema (`ThemeTokensSchema`) and cannot override Ovata's base window/sidebar/background CSS variables (`--bg-dark`, `--bg-panel`, `--bg-image`, `--text-main`, `--text-muted`, `--accent`, `--selection`, `--border`), leaving the main window background purple (`Obsidian`) and requiring a manual visit to **Settings → Themes**.

By using `kind: "extension"` with `styles: "styles.css"` and `plugin.ts`:
1. **Immediate full-app theming on Enable:** Clicking **Enable** in **Settings → Plugins** immediately overrides all base, semantic, markdown, file-type, and canvas node tokens across the entire app without visiting **Settings → Themes**.
2. **All 22 Omarchy themes bundled:** Open **Omarchy Theme Picker** inside **Settings → Plugins** to switch between any of the 22 Omarchy palettes (`Catppuccin`, `Catppuccin Latte`, `Ethereal`, `Everforest`, `Flexoki Light`, `Gruvbox`, `Hackerman`, `Kanagawa`, `Last Horizon`, `Lumon`, `Lupine`, `Matte Black`, `Miasma`, `Nord`, `Osaka Jade`, `Retro 82`, `Ristretto`, `Rose Pine`, `Solitude`, `Tokyo Night`, `Vantablack`, `White`).
3. **Live Omarchy sync without changing the plugin digest:** Run `node scripts/sync-vault-settings.mjs <path-to-vault>` (or trigger it from an Omarchy `theme-set.d` hook) to write your active `~/.local/state/omarchy/current/theme/colors.toml` into `<vault>/.Ovata/plugin-data/omarchy-theme/settings.json`. When you focus the Ovata window (or click **Reload from Omarchy / Disk**), the plugin reloads settings and updates the theme live without rebuilding or re-approving the package.

---

## Capabilities & Security Scope

| Capability | Purpose |
| :--- | :--- |
| `ui:styles` | Loads `styles.css` so base and semantic theme tokens apply immediately on activation |
| `ui:status` | Displays `Omarchy: <Theme Name> (<mode>)` in the plugin status line |
| `ui:views` | Registers the **Omarchy Theme Picker** view in **Settings → Plugins** |
| `commands:register` | Registers the **Reload Omarchy theme** command |
| `settings:read-write` | Persists the selected preset and reads synced Omarchy colors from `.Ovata/plugin-data/omarchy-theme/settings.json` using compare-and-save |

---

## Supported Ovata Build & Package Identity (`1.1.0`)

| Property | Value |
| :--- | :--- |
| **Plugin ID** | `omarchy-theme` |
| **Plugin Version** | `1.1.0` |
| **Target Ovata Version** | `0.3.0-alpha.1` (Plugin API `v1`, Schema `v1`) |
| **Target Ovata Source Revision** | `09e44235bd6634d02d9cf71a0a79b48043e8683c` (`workingTree: "clean"`) |
| **Contract Fingerprint** | `sha256:c6deb1abb8a74c0a9d09ca37fc593b96cfb2eba6fbc0317faed64150ee7315d0` |
| **Package Digest (`packageDigest`)** | `sha256:ab8624177d12b829d5eec46959f0c8a8caf3e3852f38010e60e7f17c11f48040` |
| **`.ovplugin` Bundle SHA-256** | `871ebb060bba13dbaf1ebf36ef65cfc21f93260fb01482b8cdd879938441b96d` |

---

## Why Plugins Start Stopped After Closing Ovata

In Ovata `0.3.0-alpha.1`, the native host (`core/src/plugin_manager.rs` / `PluginsPane.tsx`) enforces a strict security boundary:
> *"ALL plugins start stopped after every process restart and need explicit Enable."*

- **Trust approval is remembered** (`Approved on this device` is stored in `~/.local/share/com.ovata.dev`), so you only approve the package digest once.
- **Active execution is session-only:** When you restart Ovata, click **Enable** once in **Settings → Plugins** (no confirmation dialog is shown on subsequent restarts) and your saved Omarchy theme immediately applies.

---

## License

[MIT](./LICENSE)
