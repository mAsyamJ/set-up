#!/usr/bin/env bash
# Open the official Hermes Kanban dashboard for the aegis-hackathon board.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/fix-hermes-kanban-ui.sh"
