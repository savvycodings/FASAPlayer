#!/usr/bin/env bash
# Fetch one Pokedata set every 2 minutes (5 API credits per run).
# Stops automatically when all sets are synced (fetch script exits 2).
# Stop early with Ctrl+C.
#
# From repo root:  bash scripts/fetch-set-cards-loop.sh
# From scripts/:   ./fetch-set-cards-loop.sh
#
# Optional env:
#   INTERVAL_SEC=120   default 120 (2 min)
#   MAX_RUNS=50        stop after N runs (unset = unlimited)

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

INTERVAL_SEC="${INTERVAL_SEC:-120}"
MAX_RUNS="${MAX_RUNS:-}"

# /mnt/c/Users/... (WSL) or /c/Users/... (Git Bash) -> C:\Users\...
to_windows_path() {
  local p="$1"
  case "$p" in
    /mnt/[a-z]/*)
      local drive rest
      drive=$(echo "$p" | sed -E 's|^/mnt/([a-z])/.*|\1|' | tr 'a-z' 'A-Z')
      rest=$(echo "$p" | sed -E 's|^/mnt/[a-z]/||' | tr '/' '\\')
      printf '%s:\\%s' "$drive" "$rest"
      return 0
      ;;
    /[a-z]/*)
      local d r
      d=$(echo "$p" | sed -E 's|^/([a-z])/.*|\1|' | tr 'a-z' 'A-Z')
      r=$(echo "$p" | sed -E 's|^/[a-z]/||' | tr '/' '\\')
      printf '%s:\\%s' "$d" "$r"
      return 0
      ;;
  esac
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$p"
    return 0
  fi
  if (cd "$p" && pwd -W >/dev/null 2>&1); then
    cd "$p" && pwd -W
    return 0
  fi
  return 1
}

setup_node_path() {
  case "$(uname -s 2>/dev/null || echo unknown)" in
    MINGW*|MSYS*|CYGWIN*)
      for dir in \
        "/c/Program Files/nodejs" \
        "/c/Program Files (x86)/nodejs" \
        "$HOME/AppData/Roaming/npm"
      do
        if [ -f "$dir/node.exe" ]; then
          export PATH="$dir:$PATH"
        fi
      done
      ;;
  esac
}

run_fetch_set_cards() {
  setup_node_path

  if command -v node >/dev/null 2>&1; then
    pnpm run fetch-set-cards
    return $?
  fi

  local win_root
  if ! win_root="$(to_windows_path "$ROOT")"; then
    echo "Could not convert path to Windows: $ROOT"
    return 127
  fi

  # PowerShell picks up Windows Node/pnpm reliably from Git Bash / WSL (cmd often opens interactive)
  if command -v powershell.exe >/dev/null 2>&1; then
    echo "Using PowerShell (pnpm.cmd): $win_root"
    MSYS2_ARG_CONV_EXCL='*' powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "Set-Location -LiteralPath '$win_root'; & pnpm.cmd run fetch-set-cards; exit \$LASTEXITCODE"
    return $?
  fi

  if command -v cmd.exe >/dev/null 2>&1; then
    echo "Using cmd.exe (pnpm.cmd): $win_root"
    MSYS2_ARG_CONV_EXCL='*' cmd.exe /c "cd /d \"$win_root\" && pnpm.cmd run fetch-set-cards"
    return $?
  fi

  echo "node not found. Run from PowerShell: scripts/fetch-set-cards-loop.ps1"
  return 127
}

run=0

echo "fetch-set-cards loop - every ${INTERVAL_SEC}s from $ROOT"
echo "Press Ctrl+C to stop."
echo ""

while true; do
  run=$((run + 1))
  echo "========== Run #${run} - $(date '+%Y-%m-%d %H:%M:%S') =========="
  run_fetch_set_cards
  ec=$?
  if [ "$ec" -eq 2 ]; then
    echo ""
    echo "All sets synced — nothing left to fetch. Loop stopped."
    exit 0
  fi
  if [ "$ec" -ne 0 ]; then
    echo "Run #${run} failed (exit $ec). Waiting ${INTERVAL_SEC}s before retry..."
  else
    echo "Run #${run} finished. Waiting ${INTERVAL_SEC}s..."
  fi
  echo ""

  if [ -n "$MAX_RUNS" ] && [ "$run" -ge "$MAX_RUNS" ]; then
    echo "Reached MAX_RUNS=$MAX_RUNS. Done."
    exit 0
  fi

  sleep "$INTERVAL_SEC"
done
