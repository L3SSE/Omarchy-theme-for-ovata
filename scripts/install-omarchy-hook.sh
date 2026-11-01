#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_DIR="$HOME/.config/omarchy/hooks/theme-set.d"
HOOK_FILE="$HOOK_DIR/omarchy-ovata-theme.sh"

mkdir -p "$HOOK_DIR"

cat >"$HOOK_FILE" <<EOF
#!/usr/bin/env bash
# Automatically syncs the active Omarchy theme into Ovata's omarchy-theme plugin settings.
node "$REPO_ROOT/scripts/sync-vault-settings.mjs" >/dev/null 2>&1 || true
EOF

chmod +x "$HOOK_FILE"

# Perform an initial sync immediately so current Omarchy colors are recorded.
node "$REPO_ROOT/scripts/sync-vault-settings.mjs" || true

echo "Installed Omarchy theme-set hook at: $HOOK_FILE"
