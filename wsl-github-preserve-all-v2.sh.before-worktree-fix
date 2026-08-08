#!/usr/bin/env bash
set -Eeuo pipefail

# WSL -> GitHub complete preservation utility.
#
# Goal:
#   1) Preserve every existing Git repo/worktree under ~/dev/set-up/projects.
#   2) Create private GitHub repos for top-level project directories with no Git root.
#   3) Preserve ALL remaining workspace bytes, including ignored/untracked/local files,
#      in an encrypted GitHub Release snapshot split below GitHub's per-asset limit.
#
# Important:
#   - Existing source repos are backed up to NEW PRIVATE mirror repos by default.
#     This avoids accidentally pushing WIP or sensitive history to an existing public repo.
#   - Plaintext .env/key-like changes are not newly committed to source mirrors.
#     They are still preserved by the encrypted full snapshot.
#   - The full snapshot is streamed to /mnt/d first, so it does not worsen C: usage.
#
# Requirements:
#   git, gh, tar, zstd, gpg, split, sha256sum
#
# Run:
#   chmod +x wsl-github-preserve-all.sh
#   ./wsl-github-preserve-all.sh
#
# Optional environment:
#   ROOT="$HOME/dev/set-up"
#   BACKUP_DIR="/mnt/d/WSL-GITHUB-BACKUP"
#   GH_OWNER="your-github-user"
#   PREFIX="wslbak"
#   STAMP="20260808-1641"

ROOT="${ROOT:-$HOME/dev/set-up}"
PROJECTS="${PROJECTS:-$ROOT/projects}"
BACKUP_DIR="${BACKUP_DIR:-/mnt/d/WSL-GITHUB-BACKUP}"
PREFIX="${PREFIX:-wslbak}"
STAMP="${STAMP:-$(date +%Y%m%d-%H%M%S)}"
REPORT_DIR="$BACKUP_DIR/report-$STAMP"
SNAPSHOT_DIR="$BACKUP_DIR/snapshot-$STAMP"

mkdir -p "$REPORT_DIR" "$SNAPSHOT_DIR"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: required command missing: $1" >&2
    return 1
  }
}

for c in git gh tar zstd gpg split sha256sum find awk sed sort grep dirname basename realpath; do
  need "$c"
done

gh auth status >/dev/null
GH_OWNER="${GH_OWNER:-$(gh api user --jq .login)}"

echo "GitHub owner : $GH_OWNER"
echo "Workspace    : $ROOT"
echo "Projects     : $PROJECTS"
echo "Backup dir   : $BACKUP_DIR"
echo "Stamp        : $STAMP"

[[ -d "$ROOT" ]] || { echo "ERROR: ROOT missing: $ROOT"; exit 1; }
[[ -d "$PROJECTS" ]] || { echo "ERROR: PROJECTS missing: $PROJECTS"; exit 1; }
[[ -d /mnt/d ]] || { echo "ERROR: D: is not mounted at /mnt/d"; exit 1; }

###############################################################################
# Helpers
###############################################################################

slugify() {
  local s="$1"
  s="$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]')"
  s="$(printf '%s' "$s" | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')"
  printf '%s' "${s:0:70}"
}

path_hash() {
  printf '%s' "$1" | sha256sum | awk '{print substr($1,1,8)}'
}

repo_name_for_path() {
  local p="$1"
  local rel base h
  if [[ "$p" == "$ROOT" ]]; then
    rel="set-up-root"
  else
    rel="${p#"$PROJECTS"/}"
  fi
  base="$(slugify "$rel")"
  h="$(path_hash "$p")"
  printf '%s-%s-%s' "$PREFIX" "$base" "$h"
}

ensure_private_repo() {
  local full="$1"
  if gh repo view "$full" >/dev/null 2>&1; then
    # Safety: abort if a backup repo somehow exists but is public.
    local vis
    vis="$(gh repo view "$full" --json visibility --jq .visibility)"
    if [[ "$vis" != "PRIVATE" ]]; then
      echo "ERROR: backup target exists but is not private: $full ($vis)" >&2
      return 1
    fi
  else
    gh repo create "$full" --private --disable-issues --disable-wiki >/dev/null
  fi
}

is_secretish_path() {
  local p="$1"
  local low
  low="$(printf '%s' "$p" | tr '[:upper:]' '[:lower:]')"

  case "$low" in
    *.env.example|*.env.sample|*.example.env|*.sample.env|*/.env.example|*/.env.sample)
      return 1
      ;;
    .env|*/.env|.env.*|*/.env.*|*.pem|*.key|*.p12|*.pfx|*.jks|*.keystore|*/credentials.json|*/service-account.json)
      return 0
      ;;
  esac
  return 1
}

unstage_secretish_changes() {
  local repo="$1"
  local f
  while IFS= read -r -d '' f; do
    if is_secretish_path "$f"; then
      echo "  source mirror: leaving secret-like path out of commit: $f"
      git -C "$repo" restore --staged -- "$f" 2>/dev/null || \
        git -C "$repo" reset -q HEAD -- "$f" 2>/dev/null || true
    fi
  done < <(git -C "$repo" diff --cached --name-only -z --diff-filter=ACDMRTUXB)
}

###############################################################################
# Phase 0: inventory EVERYTHING before changing Git state
###############################################################################

echo
echo "=== PHASE 0: INVENTORY ==="

# Detect BOTH .git directories and .git files (worktrees).
find "$PROJECTS" \
  \( -path '*/node_modules/*' -o -path '*/.opensrc-cache/*' -o -path '*/research/opensrc-cache/*' -o -path '*/.harness/worktrees/*' -o -path '*/lib/forge-std/*' -o -path '*/lib/openzeppelin-contracts/*' \) -prune -o \
  -name .git -print0 \
  | while IFS= read -r -d '' marker; do
      repo="$(dirname "$marker")"
      (cd "$repo" && pwd -P)
    done \
  | sort -u > "$REPORT_DIR/git-roots.txt"

# The workspace root is itself a Git repository and must also be preserved.
if [[ -e "$ROOT/.git" ]]; then
  root_phys="$(cd "$ROOT" && pwd -P)"
  { cat "$REPORT_DIR/git-roots.txt"; printf '%s\n' "$root_phys"; }     | sort -u > "$REPORT_DIR/git-roots.with-root.txt"
  mv "$REPORT_DIR/git-roots.with-root.txt" "$REPORT_DIR/git-roots.txt"
fi

echo "Detected Git roots/worktrees:"
cat "$REPORT_DIR/git-roots.txt"

# Top-level project dirs ensure "project without git" is not missed.
find "$PROJECTS" -mindepth 1 -maxdepth 1 -type d -print | sort > "$REPORT_DIR/top-level-project-dirs.txt"

: > "$REPORT_DIR/non-git-top-level-projects.txt"
while IFS= read -r d; do
  # A top-level directory counts as a Git root if .git is file OR directory.
  if [[ ! -e "$d/.git" ]]; then
    printf '%s\n' "$d" >> "$REPORT_DIR/non-git-top-level-projects.txt"
  fi
done < "$REPORT_DIR/top-level-project-dirs.txt"

echo
echo "Top-level project directories without their own .git root:"
cat "$REPORT_DIR/non-git-top-level-projects.txt" || true

# Workspace byte inventory. This is metadata only; contents are captured later.
find "$ROOT" -xdev -printf '%s\t%TY-%Tm-%TdT%TH:%TM:%TS\t%p\n' \
  > "$REPORT_DIR/workspace-file-inventory.tsv"

du -sh "$ROOT" "$PROJECTS" | tee "$REPORT_DIR/workspace-size.txt"

###############################################################################
# Phase 1: existing Git repos/worktrees -> new PRIVATE GitHub backup mirrors
###############################################################################

echo
echo "=== PHASE 1: EXISTING GIT REPOS / WORKTREES ==="
: > "$REPORT_DIR/git-backup-map.tsv"
: > "$REPORT_DIR/failures.txt"

while IFS= read -r repo; do
  [[ -n "$repo" ]] || continue

  echo
  echo "--- $repo ---"

  if ! git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "SKIP: not a valid Git worktree: $repo" | tee -a "$REPORT_DIR/failures.txt"
    continue
  fi

  backup_repo_name="$(repo_name_for_path "$repo")"
  backup_full="$GH_OWNER/$backup_repo_name"
  ensure_private_repo "$backup_full"

  # Make a dedicated preservation branch so the user's existing branch is not rewritten.
  orig_branch="$(git -C "$repo" symbolic-ref --short -q HEAD || true)"
  orig_head="$(git -C "$repo" rev-parse HEAD)"
  backup_branch="backup/wsl-$STAMP"

  # A worktree cannot always check out an arbitrary branch if another worktree owns it,
  # but a uniquely named backup branch is safe.
  if git -C "$repo" show-ref --verify --quiet "refs/heads/$backup_branch"; then
    git -C "$repo" switch "$backup_branch"
  else
    git -C "$repo" switch -c "$backup_branch" "$orig_head"
  fi

  # Stage all normal source changes. Gitignore remains respected.
  git -C "$repo" add -A

  # Do not newly expose plaintext secrets through ordinary Git source mirrors.
  # Exact bytes still land in the encrypted snapshot in Phase 3.
  unstage_secretish_changes "$repo"

  if ! git -C "$repo" diff --cached --quiet; then
    ECC_SKIP_PRECOMMIT=1 git -C "$repo" -c user.name="WSL Backup" -c user.email="wsl-backup@localhost" commit -m "backup: preserve WSL state $STAMP"
  fi

  backup_head="$(git -C "$repo" rev-parse HEAD)"

  # Add/update a dedicated backup remote.
  if git -C "$repo" remote get-url wsl-backup >/dev/null 2>&1; then
    git -C "$repo" remote set-url wsl-backup "git@github.com:$backup_full.git"
  else
    git -C "$repo" remote add wsl-backup "git@github.com:$backup_full.git"
  fi

  # Push preservation branch first.
  git -C "$repo" push --no-verify -u wsl-backup "$backup_branch"

  # Push every local branch and tag. This is the private backup mirror,
  # not the project's possibly-public origin.
  git -C "$repo" push --no-verify wsl-backup --all
  git -C "$repo" push --no-verify wsl-backup --tags

  remote_head="$(git -C "$repo" ls-remote wsl-backup "refs/heads/$backup_branch" | awk '{print $1}')"

  if [[ "$backup_head" != "$remote_head" ]]; then
    echo "VERIFY FAILED: $repo" | tee -a "$REPORT_DIR/failures.txt"
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$repo" "$backup_full" "${orig_branch:-DETACHED}" "$orig_head" "$backup_branch" "$backup_head" \
    >> "$REPORT_DIR/git-backup-map.tsv"
done < "$REPORT_DIR/git-roots.txt"

###############################################################################
# Phase 2: top-level project directories with NO Git root -> private GitHub repo
###############################################################################

echo
echo "=== PHASE 2: NON-GIT TOP-LEVEL PROJECTS ==="
: > "$REPORT_DIR/non-git-backup-map.tsv"

while IFS= read -r project; do
  [[ -n "$project" ]] || continue

  echo
  echo "--- non-Git project: $project ---"

  backup_repo_name="$(repo_name_for_path "$project")"
  backup_full="$GH_OWNER/$backup_repo_name"
  ensure_private_repo "$backup_full"

  # Initialize without altering project content.
  git -C "$project" init -b main

  # Exclude nested Git repositories from this parent project repo so they are not
  # turned into accidental gitlinks. Those nested repos are preserved separately
  # by Phase 1, while Phase 3 captures exact bytes regardless.
  mkdir -p "$project/.git/info"
  : > "$project/.git/info/exclude.wsl-backup"

  while IFS= read -r nested; do
    [[ "$nested" == "$project" ]] && continue
    case "$nested/" in
      "$project/"*)
        rel="${nested#"$project"/}"
        printf '/%s/\n' "$rel" >> "$project/.git/info/exclude.wsl-backup"
        ;;
    esac
  done < "$REPORT_DIR/git-roots.txt"

  # Also exclude regenerable/cache directories from the editable source repo.
  # Exact bytes remain covered by Phase 3.
  cat >> "$project/.git/info/exclude.wsl-backup" <<'EXCL'
node_modules/
**/node_modules/
dist/
**/dist/
.next/
**/.next/
.turbo/
**/.turbo/
.cache/
**/.cache/
.opensrc-cache/
**/.opensrc-cache/
.harness/worktrees/
**/.harness/worktrees/
EXCL

  # Git only reads .git/info/exclude, so append our backup exclusions there.
  cat "$project/.git/info/exclude.wsl-backup" >> "$project/.git/info/exclude"

  git -C "$project" add -A
  unstage_secretish_changes "$project"

  if git -C "$project" diff --cached --quiet; then
    # GitHub repositories need at least one commit for a usable branch.
    printf '# WSL backup\n\nPreserved from `%s` on %s.\n' "$project" "$STAMP" \
      > "$project/.wsl-backup-readme.md"
    git -C "$project" add .wsl-backup-readme.md
  fi

  ECC_SKIP_PRECOMMIT=1 git -C "$project" -c user.name="WSL Backup" -c user.email="wsl-backup@localhost" commit -m "backup: import non-Git project from WSL $STAMP"

  git -C "$project" remote add origin "git@github.com:$backup_full.git"
  git -C "$project" push --no-verify -u origin main

  local_head="$(git -C "$project" rev-parse HEAD)"
  remote_head="$(git -C "$project" ls-remote origin refs/heads/main | awk '{print $1}')"

  if [[ "$local_head" != "$remote_head" ]]; then
    echo "VERIFY FAILED non-Git import: $project" | tee -a "$REPORT_DIR/failures.txt"
  fi

  printf '%s\t%s\t%s\n' "$project" "$backup_full" "$local_head" \
    >> "$REPORT_DIR/non-git-backup-map.tsv"
done < "$REPORT_DIR/non-git-top-level-projects.txt"

###############################################################################
# Phase 3: exact encrypted snapshot of ENTIRE ~/dev/set-up
###############################################################################

echo
echo "=== PHASE 3: EXACT ENCRYPTED FULL WORKSPACE SNAPSHOT ==="
echo
echo "This captures ignored files, .env files, caches, nested repo metadata,"
echo "uncommitted secret-like files, and anything not represented in source Git."
echo
echo "You will be prompted for a GPG passphrase."
echo "SAVE THAT PASSPHRASE OUTSIDE WSL. WITHOUT IT THE SNAPSHOT CANNOT BE RESTORED."
echo

snapshot_base="$SNAPSHOT_DIR/set-up-$STAMP.tar.zst.gpg.part-"

# Stream directly from WSL -> D:, avoiding a second giant temporary file on C:.
tar \
  --xattrs \
  --acls \
  --numeric-owner \
  -C "$(dirname "$ROOT")" \
  -cf - "$(basename "$ROOT")" \
| zstd -T0 -10 \
| gpg --symmetric --cipher-algo AES256 --compress-algo none --output - \
| split -b 1900M -d -a 3 - "$snapshot_base"

sha256sum "$snapshot_base"* > "$SNAPSHOT_DIR/SHA256SUMS.txt"
cp "$REPORT_DIR/workspace-size.txt" "$SNAPSHOT_DIR/"
cp "$REPORT_DIR/workspace-file-inventory.tsv" "$SNAPSHOT_DIR/"
cp "$REPORT_DIR/git-backup-map.tsv" "$SNAPSHOT_DIR/"
cp "$REPORT_DIR/non-git-backup-map.tsv" "$SNAPSHOT_DIR/"

snapshot_repo="$GH_OWNER/${PREFIX}-full-workspace-$STAMP"
ensure_private_repo "$snapshot_repo"

# Ensure snapshot repo has a commit so release creation has a valid target.
tmp_init="$(mktemp -d)"
trap 'rm -rf "$tmp_init"' EXIT
git -C "$tmp_init" init -b main >/dev/null
cat > "$tmp_init/README.md" <<EOF
# Encrypted WSL workspace backup

Created: $STAMP
Source: $ROOT

The release assets contain an encrypted, split tar.zst snapshot.
Keep the GPG passphrase separately.
EOF
git -C "$tmp_init" add README.md
git -C "$tmp_init" -c user.name="WSL Backup" -c user.email="wsl-backup@localhost" \
  commit -m "initialize encrypted WSL backup" >/dev/null
git -C "$tmp_init" remote add origin "git@github.com:$snapshot_repo.git"
git -C "$tmp_init" push --no-verify -u origin main >/dev/null

release_tag="wsl-$STAMP"
gh release create "$release_tag" \
  --repo "$snapshot_repo" \
  --target main \
  --title "WSL full workspace backup $STAMP" \
  --notes "Encrypted full snapshot of $ROOT. GPG symmetric encryption; split into <2 GiB assets."

for f in "$snapshot_base"* \
         "$SNAPSHOT_DIR/SHA256SUMS.txt" \
         "$SNAPSHOT_DIR/workspace-size.txt" \
         "$SNAPSHOT_DIR/workspace-file-inventory.tsv" \
         "$SNAPSHOT_DIR/git-backup-map.tsv" \
         "$SNAPSHOT_DIR/non-git-backup-map.tsv"; do
  gh release upload "$release_tag" "$f" --repo "$snapshot_repo" --clobber
done

gh release view "$release_tag" --repo "$snapshot_repo" \
  --json url,assets \
  > "$REPORT_DIR/release-verification.json"

###############################################################################
# Phase 4: final verification
###############################################################################

echo
echo "=== PHASE 4: FINAL VERIFICATION ==="

# Verify every source-backup repo listed.
while IFS=$'\t' read -r local_path remote_repo orig_branch orig_head backup_branch backup_head; do
  [[ -n "$local_path" ]] || continue
  remote_head="$(git -C "$local_path" ls-remote wsl-backup "refs/heads/$backup_branch" | awk '{print $1}')"
  if [[ "$backup_head" != "$remote_head" ]]; then
    echo "VERIFY FAILED: $local_path -> $remote_repo" | tee -a "$REPORT_DIR/failures.txt"
  else
    echo "VERIFIED: $local_path -> $remote_repo @ $backup_head"
  fi
done < "$REPORT_DIR/git-backup-map.tsv"

while IFS=$'\t' read -r local_path remote_repo local_head; do
  [[ -n "$local_path" ]] || continue
  remote_head="$(git -C "$local_path" ls-remote origin refs/heads/main | awk '{print $1}')"
  if [[ "$local_head" != "$remote_head" ]]; then
    echo "VERIFY FAILED: $local_path -> $remote_repo" | tee -a "$REPORT_DIR/failures.txt"
  else
    echo "VERIFIED: $local_path -> $remote_repo @ $local_head"
  fi
done < "$REPORT_DIR/non-git-backup-map.tsv"

asset_count="$(
  gh release view "$release_tag" --repo "$snapshot_repo" \
    --json assets --jq '.assets | length'
)"
local_asset_count="$(
  find "$SNAPSHOT_DIR" -maxdepth 1 -type f \
    \( -name 'set-up-*.part-*' -o -name 'SHA256SUMS.txt' \
       -o -name 'workspace-size.txt' -o -name 'workspace-file-inventory.tsv' \
       -o -name 'git-backup-map.tsv' -o -name 'non-git-backup-map.tsv' \) \
    | wc -l
)"

if [[ "$asset_count" -ne "$local_asset_count" ]]; then
  echo "VERIFY FAILED: release asset count local=$local_asset_count remote=$asset_count" \
    | tee -a "$REPORT_DIR/failures.txt"
else
  echo "VERIFIED: encrypted snapshot release contains $asset_count assets."
fi

if [[ -s "$REPORT_DIR/failures.txt" ]]; then
  echo
  echo "============================================================"
  echo "BACKUP NOT COMPLETE. DO NOT DELETE WSL."
  echo "Failures:"
  cat "$REPORT_DIR/failures.txt"
  echo "============================================================"
  exit 1
fi

cat > "$REPORT_DIR/SAFE_TO_DELETE_WSL.txt" <<EOF
WSL WORKSPACE PRESERVATION VERIFIED
timestamp=$STAMP
root=$ROOT
github_owner=$GH_OWNER
encrypted_snapshot_repo=$snapshot_repo
encrypted_snapshot_release=$release_tag

Existing Git repos/worktrees were mirrored to private GitHub repositories.
Top-level non-Git project directories were imported to private GitHub repositories.
The complete workspace byte set was additionally captured in an encrypted release snapshot.
EOF

echo
echo "============================================================"
echo "BACKUP VERIFIED."
echo "Report: $REPORT_DIR/SAFE_TO_DELETE_WSL.txt"
echo "Snapshot repo: https://github.com/$snapshot_repo"
echo
echo "Do NOT delete the D: snapshot chunks until you have independently"
echo "confirmed the GitHub release assets and saved the GPG passphrase."
echo "============================================================"
