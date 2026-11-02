# Omarchy Theme for Ovata (`omarchy-theme-for-ovata`)

**Omarchy Theme for Ovata** is a full-workspace [Ovata](https://github.com/L3SSE/Ovata) theme extension (`kind: "extension"`) designed specifically for the **Omarchy** Linux desktop environment.

Unlike basic `kind: "theme"` plugins that only cover 11 semantic tokens, **Omarchy Theme for Ovata** maps your Omarchy `colors.toml` palette across **all 31 Ovata CSS custom properties**—styling the main application background, sidebar, file tree icons, markdown headings/links/inline code, mindmap & canvas nodes/glows, floating panels, and status bar the moment the plugin is enabled.

It supports two seamless operating modes inside **Settings → Plugins → Omarchy Theme Picker**:
1. **Follow Omarchy Active Theme (`sourceMode: "follow-omarchy"`, default):** Automatically updates Ovata's colors in real time whenever you switch your system theme in Omarchy (`Super + Alt + Space → Theme` or `omarchy-theme-set`).
2. **Choose Theme Yourself (`sourceMode: "manual"`):** Lets you manually select and pin any of the **22 built-in Omarchy dark and light presets** inside Ovata, independent of your current desktop theme.

---

## What It Themes in Ovata (31 CSS Tokens)

| Ovata Surface | CSS Tokens Mapped from Omarchy `colors.toml` |
| :--- | :--- |
| **Workspace & Panels** | `--bg-dark`, `--bg-panel`, `--bg-base`, `--bg-elevated`, `--bg-image` (`none`), `--bg-opacity`, `--surface-active`, `--surface-sunken`, `--surface-floating` |
| **Typography & Hierarchy** | `--text-main`, `--text-muted`, `--text-elevated`, `--text-bright`, `--text-faint` |
| **Accents, Selection & Borders** | `--accent`, `--accent-primary`, `--on-accent`, `--accent-success`, `--selection`, `--border`, `--border-elevated`, `--border-toolbar`, `--border-subtle`, `--danger` |
| **Canvas & Mindmap Nodes** | `--node-bg`, `--node-glow` (derived 8-digit hex glow from active accent) |
| **Markdown Syntax** | `--md-heading`, `--md-bold`, `--md-italic`, `--md-link`, `--md-url`, `--md-code-bg` |
| **File Tree Icons** | `--file-folder`, `--file-markdown`, `--file-note`, `--file-mindmap`, `--file-pdfnote` |

---

## Included Omarchy Presets (22 Built-In Themes)

- **Dark Presets (19):** `Catppuccin`, `Ethereal`, `Everforest`, `Gruvbox` *(default)*, `Hackerman`, `Kanagawa`, `Last Horizon`, `Lumon`, `Lupine`, `Matte Black`, `Miasma`, `Nord`, `Osaka Jade`, `Retro 82`, `Ristretto`, `Rose Pine`, `Tokyo Night`, `Vantablack`
- **Light Presets (3):** `Catppuccin Latte`, `Flexoki Light`, `Solitude`, `White`

---

## Installation

### 1. Install from GitHub in Ovata
1. Open Ovata and navigate to **Settings → Plugins → Install Plugin**.
2. Paste the repository URL (or the exact release asset URL):
   - **Repository URL:** `https://github.com/L3SSE/Omarchy-theme-for-ovata`
   - **Release Tag URL:** `https://github.com/L3SSE/Omarchy-theme-for-ovata/releases/tag/v1.2.0`
   - **Direct Asset URL:** `https://github.com/L3SSE/Omarchy-theme-for-ovata/releases/download/v1.2.0/omarchy-theme-for-ovata-1.2.0.ovplugin`
3. Verify the displayed **Package Digest** matches:
   ```text
   sha256:deb0535bf5452dde47b197de12a79736147b038cceedb1bf12293dc3143b3d6f
   ```
4. Click **Enable** and confirm **Trust this exact package and enable**.

### 2. Enable Live Omarchy Desktop Theme Sync (Optional Hook)
To make Ovata switch colors automatically in real time whenever you change your Omarchy desktop theme (`Super + Alt + Space → Theme` or `omarchy-theme-set`), run once from a local checkout of this repository:
```bash
npm run install-hook
```
This installs `~/.config/omarchy/hooks/theme-set.d/omarchy-ovata-theme.sh`.

---

## How Automatic Omarchy Sync + Manual Choice Works (`v1.2.0`)

1. **Follow Omarchy Active Theme (`sourceMode: "follow-omarchy"` — default):**
   - The Omarchy `theme-set.d` hook (`~/.config/omarchy/hooks/theme-set.d/omarchy-ovata-theme.sh`) runs automatically whenever you change your desktop theme (`omarchy-theme-set`).
   - The hook atomically writes the new `omarchyPresetId`, `omarchyName`, `omarchyMode`, and `omarchyTokens` into `<vault>/.Ovata/plugin-data/omarchy-theme-for-ovata/settings.json` while **preserving** your `sourceMode` and `manualPresetId`.
   - Inside Ovata, `omarchy-theme-for-ovata` polls `sdk.app.loadSettings()` every `1.5s` (and on window `focus`) and transitions all 31 Ovata CSS tokens to your new Omarchy theme live—without changing the plugin's SHA-256 `packageDigest` or requiring re-approval.
2. **Choose Theme Yourself (`sourceMode: "manual"`):**
   - Open **Omarchy Theme Picker** inside **Settings → Plugins** and click **Choose Theme Yourself** (or click any of the 22 bundled Omarchy theme cards).
   - Your manual choice is persisted via compare-and-save (`sdk.app.saveSettings`) and stays locked even when you switch your desktop Omarchy theme, until you click **Follow Omarchy Active Theme** again.

---

## Capabilities & Security Scope

| Capability | Purpose |
| :--- | :--- |
| `ui:styles` | Loads `styles.css` so base and semantic theme tokens apply immediately on activation |
| `ui:status` | Displays `Omarchy: <Theme Name> (<mode> · Following Omarchy / Manual)` in the plugin status line |
| `ui:views` | Registers the **Omarchy Theme Picker** view in **Settings → Plugins** |
| `commands:register` | Registers **Follow Omarchy active theme** and **Reload Omarchy theme** commands |
| `settings:read-write` | Reads live Omarchy palette updates and persists `sourceMode` / `manualPresetId` via compare-and-save |

---

## Supported Ovata Build & Package Identity (`1.2.0`)

| Property | Value |
| :--- | :--- |
| **Plugin ID** | `omarchy-theme-for-ovata` |
| **Plugin Name** | `Omarchy Theme for Ovata` |
| **Plugin Version** | `1.2.0` |
| **Target Ovata Version** | `0.3.0-alpha.1` (Plugin API `v1`, Schema `v1`) |
| **Target Ovata Source Revision** | `09e44235bd6634d02d9cf71a0a79b48043e8683c` (`workingTree: "clean"`) |
| **Contract Fingerprint** | `sha256:c6deb1abb8a74c0a9d09ca37fc593b96cfb2eba6fbc0317faed64150ee7315d0` |
| **Package Digest (`packageDigest`)** | `sha256:deb0535bf5452dde47b197de12a79736147b038cceedb1bf12293dc3143b3d6f` |
| **`.ovplugin` Bundle SHA-256** | `66f45f810ecb88e43e9c69b11ca605fd0e69f38fd5f1b248a0fd413fd0b14d8f` |

---

## Verification & Qualification Evidence

- **Static, Build & Compiled-Bundle Unit Suite (`npm test`):** `8/8` tests passing on Node `v26.8.1` (`manifest.json` & `styles.css` schema validation, deterministic palette mapping, Unicode/CRLF handling, empty/oversized input bounds, prototype-pollution/hex guards, `syncVaultThemeSettings` mode preservation, and compiled `main.js` lifecycle execution/conflict/disposal).
- **OvataLab Wayland Sandbox Qualification (`plugin-lifecycle`):**
  - Run ID: `20261102T090707485Z-plugin-lifecycle-03f81647` (`laptop`, `AMD Ryzen AI 7 350 w/ Radeon 860M`, Linux `7.2.8-9-omarchy`, WebKitGTK `605.1.15`)
  - Status: `pass` (`2` Wayland bubblewrap phases, `128` synthetic notes unchanged, zero CSP/window errors)
  - Report SHA-256: `4d62ddeca7508af34a1b62fd89ea9d7c2e3fd5efcbbf2bb30bc399c524a1bcf9`
  - Scope Note: `Ovata-Lab` `plugin-lifecycle` exercises the packaged Linux host/WebView plugin manager lifecycle across 7 synthetic fixture packages; `omarchy-theme-for-ovata` `v1.2.0` (`sha256:deb0535bf5452dde47b197de12a79736147b038cceedb1bf12293dc3143b3d6f`) was additionally verified via its compiled `main.js` bundle test and live owner acceptance on Linux (`LCH-LAPTOP-Omarchy`). Android is not declared or claimed.

---

## Recovery, Rollback & Uninstall

- **Disable / Stop All:** Clicking **Disable** on **Omarchy Theme for Ovata** (or **Stop all plugins**) in **Settings → Plugins** immediately removes the injected stylesheet, restores all prior inline CSS custom properties, and stops the settings sync timer.
- **Uninstall:** Click **Remove package** in **Settings → Plugins** to move the package snapshot to `.Ovata/trash/plugins/` while retaining user documents and `.Ovata/plugin-data/omarchy-theme-for-ovata/settings.json`.

---

## License

[MIT](./LICENSE)
