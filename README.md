# Omarchy Theme (`omarchy-theme`)

An [Ovata](https://github.com/L3SSE/Ovata) `kind: "extension"` theme plugin that styles the entire Ovata workspace and canvas using your **Omarchy** Linux desktop palette immediately upon activation, automatically switches Ovata's colors whenever you change your Omarchy theme (`sourceMode: "follow-omarchy"`), and lets you manually pin any of the 22 official Omarchy presets (`sourceMode: "manual"`).

---

## Installation

### Install from GitHub in Ovata
1. Open Ovata and go to **Settings → Plugins → Install Plugin**.
2. Paste the repository URL (or exact release asset URL):
   - Repository URL: `https://github.com/L3SSE/omarchy-theme`
   - Release tag URL: `https://github.com/L3SSE/omarchy-theme/releases/tag/v1.2.0`
   - Exact asset URL: `https://github.com/L3SSE/omarchy-theme/releases/download/v1.2.0/omarchy-theme-1.2.0.ovplugin`
3. Verify the displayed **Package Digest** matches:
   ```text
   sha256:d20e51bfd8f359d0c002d357283db318e76d2963342839b4919c0d4702f5c2dd
   ```
4. Click **Enable** and confirm **Trust this exact package and enable**.

### Enable Automatic Omarchy Desktop Theme Sync (Optional Hook)
To make Ovata switch colors automatically in real time whenever you change your Omarchy theme (`Super + Alt + Space → Theme` or `omarchy-theme-set`), run once from a local checkout of this repository:
```bash
npm run install-hook
```
This installs `~/.config/omarchy/hooks/theme-set.d/omarchy-ovata-theme.sh`.

---

## How Automatic Omarchy Sync + Manual Choice Works (`v1.2.0`)

1. **Follow Omarchy Active Theme (`sourceMode: "follow-omarchy"` — default):**
   - The Omarchy `theme-set.d` hook (`~/.config/omarchy/hooks/theme-set.d/omarchy-ovata-theme.sh`) runs automatically whenever you change your desktop theme (`omarchy-theme-set`).
   - The hook atomically writes the new `omarchyPresetId`, `omarchyName`, `omarchyMode`, and `omarchyTokens` into `<vault>/.Ovata/plugin-data/omarchy-theme/settings.json` while **preserving** your `sourceMode` and `manualPresetId`.
   - Inside Ovata, `omarchy-theme` polls `sdk.app.loadSettings()` every `1.5s` (and on window `focus`) and transitions all 31 Ovata CSS tokens to your new Omarchy theme live—without changing the plugin's SHA-256 `packageDigest` or requiring re-approval.
2. **Choose Theme Yourself (`sourceMode: "manual"`):**
   - Open **Omarchy Theme Picker** inside **Settings → Plugins** and click **Choose Theme Yourself** (or click any of the 22 bundled Omarchy theme cards: `Catppuccin`, `Catppuccin Latte`, `Ethereal`, `Everforest`, `Flexoki Light`, `Gruvbox`, `Hackerman`, `Kanagawa`, `Last Horizon`, `Lumon`, `Lupine`, `Matte Black`, `Miasma`, `Nord`, `Osaka Jade`, `Retro 82`, `Ristretto`, `Rose Pine`, `Solitude`, `Tokyo Night`, `Vantablack`, `White`).
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
| **Plugin ID** | `omarchy-theme` |
| **Plugin Version** | `1.2.0` |
| **Target Ovata Version** | `0.3.0-alpha.1` (Plugin API `v1`, Schema `v1`) |
| **Target Ovata Source Revision** | `09e44235bd6634d02d9cf71a0a79b48043e8683c` (`workingTree: "clean"`) |
| **Contract Fingerprint** | `sha256:c6deb1abb8a74c0a9d09ca37fc593b96cfb2eba6fbc0317faed64150ee7315d0` |
| **Package Digest (`packageDigest`)** | `sha256:d20e51bfd8f359d0c002d357283db318e76d2963342839b4919c0d4702f5c2dd` |
| **`.ovplugin` Bundle SHA-256** | `ae50319a20588a65c19b1979e129f12ddef5791823b9614d26a1f9b485665011` |

---

## Verification & Qualification Evidence

- **Static, Build & Compiled-Bundle Unit Suite (`npm test`):** `8/8` tests passing on Node `v26.8.1` (`manifest.json` & `styles.css` schema validation, deterministic palette mapping, Unicode/CRLF handling, empty/oversized input bounds, prototype-pollution/hex guards, `syncVaultThemeSettings` mode preservation, and compiled `main.js` lifecycle execution/conflict/disposal).
- **OvataLab Wayland Sandbox Qualification (`plugin-lifecycle`):**
  - Run ID: `20261102T090707485Z-plugin-lifecycle-03f81647` (`laptop`, `AMD Ryzen AI 7 350 w/ Radeon 860M`, Linux `7.2.8-9-omarchy`, WebKitGTK `605.1.15`)
  - Status: `pass` (`2` Wayland bubblewrap phases, `128` synthetic notes unchanged, zero CSP/window errors)
  - Report SHA-256: `4d62ddeca7508af34a1b62fd89ea9d7c2e3fd5efcbbf2bb30bc399c524a1bcf9`
  - Scope Note: `Ovata-Lab` `plugin-lifecycle` exercises the packaged Linux host/WebView plugin manager lifecycle across 7 synthetic fixture packages; `omarchy-theme` `v1.2.0` (`sha256:d20e51bfd8f359d0c002d357283db318e76d2963342839b4919c0d4702f5c2dd`) was additionally verified via its compiled `main.js` bundle test and live owner acceptance on Linux (`LCH-LAPTOP-Omarchy`). Android is not declared or claimed.

---

## Recovery, Rollback & Uninstall

- **Disable / Stop All:** Clicking **Disable** on **Omarchy Theme** (or **Stop all plugins**) in **Settings → Plugins** immediately removes the injected stylesheet, restores all prior inline CSS custom properties, and stops the settings sync timer.
- **Uninstall:** Click **Remove package** in **Settings → Plugins** to move the package snapshot to `.Ovata/trash/plugins/` while retaining user documents and `.Ovata/plugin-data/omarchy-theme/settings.json`.

---

## License

[MIT](./LICENSE)
