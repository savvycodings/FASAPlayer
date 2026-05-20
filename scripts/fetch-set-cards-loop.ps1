# Fetch one Pokedata set every 2 minutes (5 credits per run).
# Stops automatically when all sets are synced (fetch script exits 2). Ctrl+C to stop early.
#
# Usage (from repo root):
#   powershell -File scripts/fetch-set-cards-loop.ps1
#
# Optional env:
#   $env:INTERVAL_SEC = 120
#   $env:MAX_RUNS = 50

$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$IntervalSec = if ($env:INTERVAL_SEC) { [int]$env:INTERVAL_SEC } else { 120 }
$MaxRuns = if ($env:MAX_RUNS) { [int]$env:MAX_RUNS } else { 0 }

$run = 0
Write-Host "fetch-set-cards loop - every ${IntervalSec}s from $Root"
Write-Host "Press Ctrl+C to stop."
Write-Host ""

while ($true) {
    $run++
    Write-Host "========== Run #$run - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =========="
    & pnpm.cmd run fetch-set-cards
    $ec = $LASTEXITCODE
    if ($ec -eq 2) {
        Write-Host ""
        Write-Host "All sets synced — nothing left to fetch. Loop stopped."
        break
    }
    if ($ec -ne 0) {
        Write-Host "Run #$run failed (exit $ec). Waiting ${IntervalSec}s..."
    } else {
        Write-Host "Run #$run finished. Waiting ${IntervalSec}s..."
    }
    Write-Host ""

    if ($MaxRuns -gt 0 -and $run -ge $MaxRuns) {
        Write-Host "Reached MAX_RUNS=$MaxRuns. Done."
        break
    }

    Start-Sleep -Seconds $IntervalSec
}
