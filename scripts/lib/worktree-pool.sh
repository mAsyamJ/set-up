#!/usr/bin/env bash
# Git worktree pool for isolated Cursor fleet workers.
# Usage: source and call worktree_allocate|release|list
set -euo pipefail

worktree_root_for_project() {
  local project_root="$1"
  echo "${project_root}/.harness/worktrees"
}

worktree_path_for_task() {
  local project_root="$1"
  local task_id="$2"
  echo "$(worktree_root_for_project "$project_root")/${task_id}"
}

worktree_sanitize_task_id() {
  echo "$1" | tr -cs 'a-zA-Z0-9_-' '_'
}

worktree_default_branch() {
  local project_root="$1"
  local base="${2:-}"
  if [ -n "$base" ]; then
    echo "$base"
    return 0
  fi
  git -C "$project_root" symbolic-ref --short HEAD 2>/dev/null || echo "main"
}

# Allocate worktree + branch agent/<taskId>. Idempotent if already exists.
worktree_allocate() {
  local project_root="$1"
  local task_id="$2"
  local branch_base="${3:-}"

  project_root="$(cd "$project_root" && pwd)"
  task_id="$(worktree_sanitize_task_id "$task_id")"
  local wt_root wt_path branch base
  wt_root="$(worktree_root_for_project "$project_root")"
  wt_path="$(worktree_path_for_task "$project_root" "$task_id")"
  branch="agent/${task_id}"
  base="$(worktree_default_branch "$project_root" "$branch_base")"

  mkdir -p "$wt_root"

  if [ -d "$wt_path" ] && git -C "$project_root" worktree list --porcelain 2>/dev/null | grep -q "^worktree ${wt_path}$"; then
    echo "$wt_path"
    return 0
  fi

  if [ -d "$wt_path" ]; then
    rm -rf "$wt_path"
  fi

  if git -C "$project_root" show-ref --verify --quiet "refs/heads/${branch}"; then
    git -C "$project_root" worktree add "$wt_path" "$branch"
  else
    git -C "$project_root" worktree add -b "$branch" "$wt_path" "$base"
  fi

  echo "$wt_path"
}

# Remove worktree and optionally delete branch (default: keep branch for merge).
worktree_release() {
  local project_root="$1"
  local task_id="$2"
  local delete_branch="${3:-0}"

  project_root="$(cd "$project_root" && pwd)"
  task_id="$(worktree_sanitize_task_id "$task_id")"
  local wt_path branch
  wt_path="$(worktree_path_for_task "$project_root" "$task_id")"
  branch="agent/${task_id}"

  if git -C "$project_root" worktree list --porcelain 2>/dev/null | grep -q "^worktree ${wt_path}$"; then
    git -C "$project_root" worktree remove --force "$wt_path" 2>/dev/null || rm -rf "$wt_path"
  elif [ -d "$wt_path" ]; then
    rm -rf "$wt_path"
  fi

  if [ "$delete_branch" = "1" ]; then
    git -C "$project_root" branch -D "$branch" 2>/dev/null || true
  fi
}

worktree_list() {
  local project_root="$1"
  project_root="$(cd "$project_root" && pwd)"
  local wt_root
  wt_root="$(worktree_root_for_project "$project_root")"
  if [ ! -d "$wt_root" ]; then
    return 0
  fi
  find "$wt_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\t%p\n' 2>/dev/null \
    || find "$wt_root" -mindepth 1 -maxdepth 1 -type d | while read -r d; do
      echo "$(basename "$d")	$d"
    done
}
