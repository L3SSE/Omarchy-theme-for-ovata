# Omarchy Theme (`omarchy-theme`)

An [Ovata](https://github.com/L3SSE/Ovata) `kind: "theme"` plugin that brings your active **Omarchy** Linux desktop color palette (`Everforest` dark mode) into Ovata's workspace chrome and canvas nodes.

---

## Capabilities & Security Scope

- **Plugin Kind:** `theme` (manifest-only color token definition; contains only `manifest.json`).
- **Requested SDK Capabilities:** **None (`0` capabilities)**.
- **Runtime Execution:** Executes **zero JavaScript**, registers no commands/views/panels, reads no vault files, and makes no network or filesystem calls.
- **Declared Platforms:** `["linux"]` (author-declared support for Omarchy Linux desktops).

---

## Supported Ovata Build & Package Identity

| Property | Value |
| :--- | :--- |
| **Plugin ID** | `omarchy-theme` |
| **Plugin Version** | `1.0.0` |
| **Target Ovata Version** | `0.3.0-alpha.1` (Plugin API `v1`, Schema `v1`) |
| **Target Ovata Source Revision** | `09e44235bd6634d02d9cf71a0a79b48043e8683c` (`workingTree: "clean"`) |
| **Contract Fingerprint** | `sha256:c6deb1abb8a74c0a9d09ca37fc593b96cfb2eba6fbc0317faed64150ee7315d0` |
| **Package Digest (`packageDigest`)** | `sha256:be1eddeaaae7c14fcbeb199cf9a8c1e9e3fa4151a5ff58e91894325e08174f51` |
| **`manifest.json` Digest (`739` bytes)** | `sha256:d3fd88e2ad8e54a4bfa51967d88958187a46a6eecd74c3ee8ad63d8dfb663425` |
| **`.ovplugin` Bundle SHA-256** | `f2ac0b434a0f93014cfa9bc2ec08d7d9120bfd31fe3bf6961ef611fc7e36ee7c` |

---

## Omarchy Palette Mapping (`Everforest` Dark)

Extracted from `~/.local/state/omarchy/current/theme/colors.toml`:

| Ovata Token | Hex Value | Omarchy `colors.toml` Key | Surface |
| :--- | :--- | :--- | :--- |
| `mode` | `"dark"` | `mode = "dark"` | Editor & browser color scheme |
| `--node-bg` | `#2d353b` | `background` | Canvas node background (required) |
| `--node-glow` | `#7fbbb344` | `accent` + `44` alpha | Canvas node glow (required) |
| `--bg-base` | `#21272c` | `dark_background` | Main canvas & workspace background |
| `--bg-elevated` | `#343f44` | `lighter_background` | Elevated panels, sidebar, modals |
| `--text-elevated` | `#d3c6aa` | `foreground` | Primary UI & document text |
| `--text-bright` | `#d3c6aa` | `bright_foreground` | Headings & emphasized text |
| `--text-faint` | `#9da9a0` | `light_foreground` | Secondary & muted labels |
| `--accent-primary` | `#7fbbb3` | `accent` / `blue` | Primary accent & active states |
| `--on-accent` | `#181d20` | `darker_background` | Contrast text on accent controls |
| `--border-elevated` | `#475258` | `muted` | Borders & dividers |
| `--danger` | `#e67e80` | `red` | Destructive actions & errors |

---

## Installation & Activation

1. Open Ovata and navigate to **Settings → Plugins → Install Plugin**.
2. Choose **Choose a local package** and select `dist/omarchy-theme-1.0.0.ovplugin` (or **Choose a local folder** and select `dist/omarchy-theme-1.0.0`), or install from a published GitHub Release URL once published.
3. Importing selects the version in `.Ovata/plugins/installed.json` without trusting or enabling it.
4. Verify the displayed **Package Digest** matches:
   ```text
   sha256:be1eddeaaae7c14fcbeb199cf9a8c1e9e3fa4151a5ff58e91894325e08174f51
   ```
5. Click **Enable** and confirm **Trust this exact package and enable**.
6. Navigate to **Settings → Themes** and select **Omarchy Theme**.

---

## Re-syncing After Switching Omarchy Themes

Because Ovata verifies the immutable SHA-256 `packageDigest` of every installed plugin before activation, theme packages cannot dynamically read `~/.local/state/omarchy/` at runtime. When you switch your Omarchy desktop theme (for example via `omarchy-theme-set`), you can regenerate `manifest.json` and build a new `.ovplugin` bundle:

```bash
# 1. Read ~/.local/state/omarchy/current/theme/colors.toml and update manifest.json
npm run sync

# 2. Run unit tests
npm test

# 3. Build a new .ovplugin from the matching Ovata checkout (at commit 09e44235bd6634d02d9cf71a0a79b48043e8683c)
node /path/to/Ovata/scripts/plugins/build-plugin.mjs \
  /home/lch/Work/omarchy-theme \
  /home/lch/Work/omarchy-theme/dist/omarchy-theme-resynced
```

After importing the new `.ovplugin` in **Settings → Plugins**, Ovata will require fresh trust approval for the new `packageDigest`.

---

## Recovery, Rollback & Uninstall

- **Process Restart Behavior:** All Ovata plugins start **stopped** after every application restart. Re-enable **Omarchy Theme** in **Settings → Plugins** after restarting Ovata; while stopped, Ovata automatically falls back to the default built-in theme (`Obsidian`).
- **Disable / Fallback:** Clicking **Disable** on **Omarchy Theme** (or **Stop all plugins**) immediately unregisters the plugin theme and restores the non-plugin theme palette without affecting your notes or vault data.
- **Rollback to a Previous Palette:** In **Settings → Plugins → Library**, select any previously imported digest of `omarchy-theme` and click **Install this version** after disabling the currently running version.
- **Uninstall:** Click **Remove package** in **Settings → Plugins**. This moves the portable package snapshot to `.Ovata/trash/plugins/` while retaining all user documents and settings.

---

## Build & Test Verification

Verified on Node `v26.8.1` against Ovata commit `09e44235bd6634d02d9cf71a0a79b48043e8683c`:

```bash
# Unit test suite (6/6 passing: schema contract, Everforest determinism, Unicode/CRLF, empty/oversized inputs, invalid hex/mode/prototype-pollution rejection)
npm test

# Deterministic build, package inspection, and manifest validation
node scripts/plugins/build-plugin.mjs /home/lch/Work/omarchy-theme /home/lch/Work/omarchy-theme/dist/omarchy-theme-1.0.0
node scripts/plugins/plugin-tool.mjs inspect /home/lch/Work/omarchy-theme/dist/omarchy-theme-1.0.0
node scripts/plugins/plugin-tool.mjs validate manifest /home/lch/Work/omarchy-theme/dist/omarchy-theme-1.0.0/manifest.json
```

### Runtime Qualification Status
- **Static / Build / Unit Checks (Gate A):** Passed (`6/6` unit tests, `build-plugin.mjs`, `plugin-tool.mjs inspect`, `plugin-tool.mjs validate manifest`).
- **OvataLab Runtime Qualification (Gates B–E):** Pending owner-authorized `Ovata-Lab` runtime qualification against commit `09e44235bd6634d02d9cf71a0a79b48043e8683c`. Publication to GitHub is held until runtime qualification is completed or explicitly authorized.

---

## License

[MIT](./LICENSE)
