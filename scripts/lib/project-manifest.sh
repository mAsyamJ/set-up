#!/usr/bin/env bash
# Resolve project paths and kanban boards from registry + manifest
# shellcheck shell=bash

project_registry_file() {
  echo "${AGENT_HARNESS_HOME}/projects/registry.json"
}

project_root_from_name() {
  local name="${1:-}"
  local reg
  reg="$(project_registry_file)"
  [ -f "$reg" ] || return 1
  python3 -c "
import json, os, sys
reg = json.load(open('$reg'))
name = sys.argv[1]
home = os.environ.get('AGENT_HARNESS_HOME', '$AGENT_HARNESS_HOME')
p = reg.get('projects', {}).get(name, {}).get('path')
if p:
    print(os.path.join(home, p) if not os.path.isabs(p) else p)
" "$name" 2>/dev/null || true
}

kanban_board_for_project() {
  local project_path="${1:-}"
  project_path="$(cd "$project_path" 2>/dev/null && pwd || echo "$project_path")"
  local manifest="$project_path/.harness/project.manifest.json"
  local board=""
  if [ -f "$manifest" ]; then
    board="$(python3 -c "
import json, sys
m = json.load(open(sys.argv[1]))
print(m.get('kanban', {}).get('board', '') or '')
" "$manifest" 2>/dev/null || true)"
  fi
  if [ -n "$board" ]; then
    echo "$board"
    return 0
  fi
  local reg
  reg="$(project_registry_file)"
  [ -f "$reg" ] || return 0
  python3 -c "
import json, os, sys
reg = json.load(open('$reg'))
proj = os.path.normpath(sys.argv[1])
home = os.environ.get('AGENT_HARNESS_HOME', '$AGENT_HARNESS_HOME')
for name, cfg in reg.get('projects', {}).items():
    path = cfg.get('path', '')
    abs_path = os.path.normpath(os.path.join(home, path) if not os.path.isabs(path) else path)
    if abs_path == proj:
        print(cfg.get('kanban', ''))
        break
" "$project_path" 2>/dev/null || true
}

list_registry_project_names() {
  local reg
  reg="$(project_registry_file)"
  [ -f "$reg" ] || return 0
  python3 -c "
import json
reg = json.load(open('$reg'))
for name in reg.get('projects', {}):
    print(name)
" 2>/dev/null || true
}

list_registry_kanban_boards() {
  local reg
  reg="$(project_registry_file)"
  [ -f "$reg" ] || return 0
  python3 -c "
import json
reg = json.load(open('$reg'))
for cfg in reg.get('projects', {}).values():
    b = cfg.get('kanban')
    if b:
        print(b)
" 2>/dev/null || true
}
