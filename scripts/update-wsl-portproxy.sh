#!/usr/bin/env bash
# Refreshes Windows port proxy so localhost reaches WSL (Kanban :9119, Aegis web :3020).
# Called by wsl-portproxy-refresh.service on boot.
set -euo pipefail

POWERSHELL=/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe

WSL_IP=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
[ -z "$WSL_IP" ] && { echo "Could not detect WSL IP"; exit 1; }

"$POWERSHELL" -NoProfile -NonInteractive -Command "
  netsh interface portproxy delete v4tov4 listenport=9119 listenaddress=0.0.0.0 2>\$null
  netsh interface portproxy delete v4tov4 listenport=9120 listenaddress=0.0.0.0 2>\$null
  netsh interface portproxy delete v4tov4 listenport=3020 listenaddress=0.0.0.0 2>\$null
  netsh interface portproxy add v4tov4 listenport=9119 listenaddress=0.0.0.0 connectport=9119 connectaddress=$WSL_IP
  netsh interface portproxy add v4tov4 listenport=9120 listenaddress=0.0.0.0 connectport=9120 connectaddress=$WSL_IP
  netsh interface portproxy add v4tov4 listenport=3020 listenaddress=0.0.0.0 connectport=3020 connectaddress=$WSL_IP
  Write-Host 'Port proxy updated: localhost:9119, :9120, :3020 -> $WSL_IP'
"
