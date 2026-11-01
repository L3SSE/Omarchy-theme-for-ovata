# Omarchy Theme (`omarchy-theme`)

An [Ovata](https://github.com/L3SSE/Ovata) `kind: "extension"` theme plugin that styles the entire Ovata workspace and canvas using your **Omarchy** Linux desktop palette immediately upon activation, automatically switches Ovata's colors whenever you change your Omarchy theme (`sourceMode: "follow-omarchy"`), and lets you manually pin any of the 22 official Omarchy presets (`sourceMode: "manual"`).

---

## How Automatic Omarchy Sync + Manual Choice Works (`v1.2.0`)

1. **Follow Omarchy Active Theme (`sourceMode: "follow-omarchy"` — default):**
   - An Omarchy `theme-set.d` hook (`~/.config/omarchy/hooks/theme-set.d/omarchy-ovata-theme.sh`, installed via `npm run install-hook`) runs automatically whenever you change your desktop theme (`Super + Alt + Space → Theme` or `omarchy-theme-set`).
   - The hook writes the new `omarchyPresetId`, `omarchyName`, `omarchyMode`, and `omarchyTokens` into `<vault>/.Ovata/plugin-data/omarchy-theme/settings.json` while **preserving** your `sourceMode` and `manualPresetId`.
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

## License

[MIT](./LICENSE)
