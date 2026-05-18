#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# Aegis Protocol / Aegis RPC — OpenSrc + GitHub Source Research Setup
# Debian/WSL Debian compatible
#
# Goal:
#   Prepare source-code research for your existing Aegis hackathon repo.
#   This DOES NOT reinstall your agent runtime, skills, Hermes, Kiro, systemd,
#   or project scaffold. It only installs/checks OpenSrc and builds a local
#   source-code evidence workspace for npm packages + GitHub repos.
#
# Default repo:
#   /home/asyam/dev/Project/aegis-hackathon-kit
#
# Usage:
#   bash aegis_opensrc_github_setup.sh
#   bash aegis_opensrc_github_setup.sh --repo /path/to/aegis-hackathon-kit
#   bash aegis_opensrc_github_setup.sh --no-apt
#   bash aegis_opensrc_github_setup.sh --opensrc-only
#   bash aegis_opensrc_github_setup.sh --github-only
#   bash aegis_opensrc_github_setup.sh --overwrite
#
# Optional:
#   export GITHUB_TOKEN=ghp_xxx   # raises GitHub rate limit for OpenSrc/private repos
# ==============================================================================

REPO_ROOT="/home/asyam/dev/Project/aegis-hackathon-kit"
MODE="all"
RUN_APT="1"
OVERWRITE="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_ROOT="${2:?Missing value after --repo}"
      shift 2
      ;;
    --opensrc-only)
      MODE="opensrc"
      shift
      ;;
    --github-only)
      MODE="github"
      shift
      ;;
    --all)
      MODE="all"
      shift
      ;;
    --no-apt)
      RUN_APT="0"
      shift
      ;;
    --overwrite)
      OVERWRITE="1"
      shift
      ;;
    -h|--help)
      sed -n '1,80p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

log()  { printf "\033[1;36m[Aegis/OpenSrc]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$*"; }
has()  { command -v "$1" >/dev/null 2>&1; }

write_file() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  if [[ -f "$path" && "$OVERWRITE" != "1" ]]; then
    warn "exists, skipping: $path"
    return 0
  fi
  cat > "$path"
  log "wrote: $path"
}

append_once() {
  local path="$1"
  local marker="$2"
  mkdir -p "$(dirname "$path")"
  touch "$path"
  if grep -qF "$marker" "$path"; then
    warn "README marker exists, skipping append"
    return 0
  fi
  cat >> "$path"
  log "appended: $path"
}

# ------------------------------------------------------------------------------
# 0) Validate repo
# ------------------------------------------------------------------------------

log "Repo root: $REPO_ROOT"
mkdir -p "$REPO_ROOT"
cd "$REPO_ROOT"

if [[ ! -f "README.md" ]]; then
  warn "README.md not found. You may not be inside the Aegis repo, but continuing."
fi

# ------------------------------------------------------------------------------
# 1) Install Debian dependencies
# ------------------------------------------------------------------------------

if [[ "$RUN_APT" == "1" ]]; then
  log "Checking Debian dependencies"

  if ! has sudo; then
    warn "sudo not found. Skipping apt install. Run as root or install manually: git curl ca-certificates ripgrep nodejs npm"
  else
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates ripgrep nodejs npm jq
  fi
else
  warn "--no-apt enabled, skipping apt install"
fi

for cmd in git curl rg node npm; do
  if ! has "$cmd"; then
    err "Missing command: $cmd"
    err "Install it, then rerun. Debian: sudo apt-get install -y git curl ripgrep nodejs npm"
    exit 1
  fi
done

# ------------------------------------------------------------------------------
# 2) Install OpenSrc CLI
# ------------------------------------------------------------------------------

if ! has opensrc; then
  log "Installing opensrc globally via npm"
  npm install -g opensrc
else
  log "opensrc found: $(command -v opensrc)"
fi

log "OpenSrc version:"
opensrc --version || true

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  log "GITHUB_TOKEN detected; OpenSrc/GitHub rate limits should be higher."
else
  warn "GITHUB_TOKEN not set. Public repos still work, but GitHub rate limits are lower."
fi

# ------------------------------------------------------------------------------
# 3) Create research folders
# ------------------------------------------------------------------------------

mkdir -p \
  docs/research \
  research/opensrc-paths \
  research/repos \
  research/notes \
  scripts

# ------------------------------------------------------------------------------
# 4) Source lists: npm packages + GitHub repos focused on Aegis RPC
# ------------------------------------------------------------------------------

write_file "research/opensrc-packages.txt" <<'EOF'
# npm packages to study through OpenSrc for Aegis RPC MVP
# Keep this focused. Add more only when implementation needs it.

viem
zod
next
react
@tanstack/react-query
@supabase/supabase-js
@vercel/postgres
wagmi
permissionless
@chainlink/contracts
@openzeppelin/contracts
ethers
@safe-global/protocol-kit
@safe-global/api-kit
json-rpc-engine
lucide-react
framer-motion
recharts
@radix-ui/react-dialog
@radix-ui/react-tabs
@radix-ui/react-toast
EOF

write_file "research/github-repos.txt" <<'EOF'
# GitHub repos to study as source evidence for Aegis RPC
# OpenSrc supports owner/repo. Fallback clone is used when needed.

ethereum/execution-apis
wevm/viem
vercel/next.js
smartcontractkit/chainlink
OpenZeppelin/openzeppelin-contracts
flashbots/rpc-endpoint
Tenderly/tenderly-rabby-transaction-preview
wallet-guard/wallet-guard-extension
wallet-guard/wallet-guard-snap
RabbyHub/Rabby
eth-infinitism/account-abstraction
eth-infinitism/bundler-spec
eth-infinitism/bundler
pimlicolabs/permissionless.js
safe-global/safe-core-sdk
safe-global/safe-transaction-service
OpenZeppelin/openzeppelin-relayer
OpenZeppelin/defender-sdk
foundry-rs/foundry
shadcn-ui/ui
radix-ui/primitives
TanStack/query
supabase/supabase-js
EOF

# ------------------------------------------------------------------------------
# 5) Research docs
# ------------------------------------------------------------------------------

write_file "docs/research/00-source-code-research-index.md" <<'EOF'
# Aegis RPC — OpenSrc + GitHub Source Research Index

This folder is for source-code evidence used by coding agents.

## Rule

Use source code as truth.

- For npm packages: `opensrc path <package>`
- For GitHub repos: `opensrc path owner/repo`
- If OpenSrc cannot resolve a GitHub repo, use local fallback clone in `research/repos/`.
- Store research notes under `research/notes/`.

## Aegis 24H cut rule

Anything outside these is stretch:

1. `/api/rpc` JSON-RPC passthrough
2. `/api/preflight`
3. transaction decoder
4. ERC20 `approve(spender, MaxUint256)` BLOCK
5. Chainlink price/freshness adapter
6. deterministic SAFE / WARN / BLOCK policy engine
7. audit log
8. RiskOps dashboard
9. Base Sepolia policy registry proof

## Product truth

Aegis RPC is the product.

Chainlink is only the first adapter signal, not the product. AI explains deterministic verdicts; AI does not decide or control funds.
EOF

write_file "docs/research/01-opensrc-package-map.md" <<'EOF'
# OpenSrc Package Map

## Core commands

```bash
opensrc path viem
rg "decodeFunctionData" "$(opensrc path viem)"
cat "$(opensrc path zod)"/src/types.ts
opensrc fetch viem zod next
opensrc list
```

## MVP packages

| Package | Aegis purpose | Search terms |
|---|---|---|
| `viem` | ABI decode, call, readContract, transaction helpers | `decodeFunctionData`, `readContract`, `publicClient.call`, `sendRawTransaction` |
| `zod` | request validation | `safeParse`, `ZodError` |
| `next` | API route handlers | `export async function POST`, `Route Handler` |
| `@chainlink/contracts` | AggregatorV3Interface | `AggregatorV3Interface`, `latestRoundData`, `decimals` |
| `@openzeppelin/contracts` | ERC20 approval patterns | `IERC20`, `approve`, `allowance`, `Ownable` |
| `@supabase/supabase-js` | audit log storage | `createClient`, `insert`, `select` |
| `@tanstack/react-query` | dashboard refresh | `useQuery`, `refetchInterval` |
EOF

write_file "docs/research/02-github-repo-map.md" <<'EOF'
# GitHub Repository Map

## Must study for MVP

| Repo | Why |
|---|---|
| `ethereum/execution-apis` | JSON-RPC method definitions and behavior |
| `wevm/viem` | TypeScript EVM primitives |
| `smartcontractkit/chainlink` | Chainlink feed contracts and examples |
| `OpenZeppelin/openzeppelin-contracts` | ERC20 and ownership patterns |
| `flashbots/rpc-endpoint` | wallet-facing RPC endpoint architecture |
| `Tenderly/tenderly-rabby-transaction-preview` | transaction preview UX |
| `wallet-guard/wallet-guard-extension` | approval warning UX |
| `RabbyHub/Rabby` | transaction decode/risk UI inspiration |
| `foundry-rs/foundry` | smart contract test/deploy workflow |

## Study after MVP

| Repo | Why |
|---|---|
| `eth-infinitism/account-abstraction` | ERC-4337 architecture |
| `eth-infinitism/bundler-spec` | UserOperation RPC methods |
| `pimlicolabs/permissionless.js` | AA client patterns |
| `safe-global/safe-core-sdk` | multisig/treasury flow |
| `OpenZeppelin/openzeppelin-relayer` | managed relayer architecture |
EOF

write_file "docs/research/03-implementation-search-playbook.md" <<'EOF'
# Aegis Implementation Search Playbook

## RPC passthrough

```bash
rg "eth_sendRawTransaction|eth_call|eth_getBalance|JSON-RPC" research/repos/ethereum__execution-apis
```

## viem decoder and call

```bash
rg "decodeFunctionData|parseTransaction|serializeTransaction|publicClient.call|readContract" "$(cat research/opensrc-paths/viem.path)"
```

## Chainlink feed reads

```bash
rg "AggregatorV3Interface|latestRoundData|decimals" "$(cat research/opensrc-paths/at_chainlinkcontracts.path)"
```

## OpenZeppelin ERC20 approval

```bash
rg "function approve|allowance|IERC20|Approval" "$(cat research/opensrc-paths/at_openzeppelincontracts.path)"
```

## Wallet risk UX

```bash
rg "approve|allowance|spender|warning|risk|simulation|preview" research/repos/wallet-guard__wallet-guard-extension research/repos/RabbyHub__Rabby research/repos/Tenderly__tenderly-rabby-transaction-preview
```
EOF

# ------------------------------------------------------------------------------
# 6) Scripts generated inside your repo
# ------------------------------------------------------------------------------

write_file "scripts/aegis-opensrc-cache.sh" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

mkdir -p research/opensrc-paths research/notes
: > research/notes/opensrc-cache.log
: > research/notes/opensrc-failed.txt

if ! command -v opensrc >/dev/null 2>&1; then
  echo "opensrc missing. Install with: npm install -g opensrc"
  exit 1
fi

safe_name() {
  echo "$1" | sed 's#/#__#g; s#@#at_#g; s#:#_#g; s#[^A-Za-z0-9_.-]#_#g'
}

cache_one() {
  local spec="$1"
  [[ -z "$spec" || "$spec" =~ ^# ]] && return 0

  echo "== opensrc path $spec =="
  if path="$(opensrc path "$spec" 2>>research/notes/opensrc-cache.log)"; then
    name="$(safe_name "$spec")"
    printf "%s\n" "$path" > "research/opensrc-paths/${name}.path"
    echo "OK $spec -> $path"
  else
    echo "FAILED $spec" | tee -a research/notes/opensrc-failed.txt
  fi
}

while IFS= read -r spec; do
  cache_one "$spec"
done < research/opensrc-packages.txt

echo "Done: OpenSrc package cache"
EOF
chmod +x "scripts/aegis-opensrc-cache.sh"

write_file "scripts/aegis-github-source-cache.sh" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

mkdir -p research/opensrc-paths research/repos research/notes
: > research/notes/github-cache.log
: > research/notes/github-failed.txt

safe_name() {
  echo "$1" | sed 's#/#__#g; s#@#at_#g; s#:#_#g; s#[^A-Za-z0-9_.-]#_#g'
}

clone_fallback() {
  local repo="$1"
  local dir
  dir="$(safe_name "$repo")"

  if [[ -d "research/repos/$dir/.git" ]]; then
    echo "exists, pulling: research/repos/$dir"
    (cd "research/repos/$dir" && git pull --ff-only) || true
  else
    echo "git clone fallback: $repo"
    git clone --depth 1 "https://github.com/$repo" "research/repos/$dir" || {
      echo "FAILED clone $repo" | tee -a research/notes/github-failed.txt
      return 1
    }
  fi
}

cache_github_one() {
  local repo="$1"
  [[ -z "$repo" || "$repo" =~ ^# ]] && return 0

  echo "== GitHub source: $repo =="

  # OpenSrc supports GitHub owner/repo identifiers. Try that first.
  if command -v opensrc >/dev/null 2>&1; then
    if path="$(opensrc path "$repo" 2>>research/notes/github-cache.log)"; then
      name="$(safe_name "github__$repo")"
      printf "%s\n" "$path" > "research/opensrc-paths/${name}.path"
      echo "OpenSrc OK $repo -> $path"
      return 0
    fi
  fi

  # Fallback for repos OpenSrc cannot resolve.
  clone_fallback "$repo"
}

while IFS= read -r repo; do
  cache_github_one "$repo"
done < research/github-repos.txt

echo "Done: GitHub source cache"
EOF
chmod +x "scripts/aegis-github-source-cache.sh"

write_file "scripts/aegis-source-search.sh" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

mkdir -p research/notes
OUT="research/notes/source-research-results.md"

read_path() {
  local f="$1"
  [[ -f "$f" ]] && cat "$f" || true
}

section() {
  echo ""
  echo "## $1"
  echo ""
}

{
  echo "# Aegis Source Research Results"
  echo ""
  echo "Generated: $(date -Iseconds)"
  echo ""

  section "Cached OpenSrc paths"
  find research/opensrc-paths -type f -name "*.path" -maxdepth 1 -print 2>/dev/null | sort | while read -r f; do
    echo "- $(basename "$f"): $(cat "$f")"
  done

  section "viem: decode, read, call, transaction patterns"
  P="$(read_path research/opensrc-paths/viem.path)"
  [[ -n "$P" ]] && rg -n "decodeFunctionData|parseTransaction|serializeTransaction|readContract|publicClient.call|sendRawTransaction" "$P" || true

  section "Next.js: route handler patterns"
  P="$(read_path research/opensrc-paths/next.path)"
  [[ -n "$P" ]] && rg -n "export async function POST|Route Handler|NextRequest|NextResponse" "$P" || true

  section "Zod: request validation patterns"
  P="$(read_path research/opensrc-paths/zod.path)"
  [[ -n "$P" ]] && rg -n "safeParse|ZodError|z.object" "$P" || true

  section "Chainlink: AggregatorV3Interface patterns"
  F="$(find research/opensrc-paths -maxdepth 1 -type f -name "at_chainlink__contracts.path" -o -name "at_chainlinkcontracts.path" | head -1 || true)"
  P="$(read_path "$F")"
  [[ -n "$P" ]] && rg -n "AggregatorV3Interface|latestRoundData|decimals|updatedAt" "$P" || true

  section "OpenZeppelin: ERC20 approval and ownership patterns"
  F="$(find research/opensrc-paths -maxdepth 1 -type f -name "at_openzeppelin__contracts.path" -o -name "at_openzeppelincontracts.path" | head -1 || true)"
  P="$(read_path "$F")"
  [[ -n "$P" ]] && rg -n "function approve|allowance|IERC20|Approval|Ownable|AccessControl" "$P" || true

  section "Ethereum execution APIs: JSON-RPC transaction methods"
  rg -n "eth_sendRawTransaction|eth_call|eth_getBalance|JSON-RPC|Transaction" research/repos/ethereum__execution-apis 2>/dev/null || true

  section "RPC endpoint architecture"
  rg -n "rpc|json-rpc|eth_sendRawTransaction|proxy|forward" research/repos/flashbots__rpc-endpoint 2>/dev/null || true

  section "Transaction preview / wallet risk UX"
  rg -n "simulation|simulate|preview|approve|approval|allowance|spender|risk|warning" \
    research/repos/Tenderly__tenderly-rabby-transaction-preview \
    research/repos/wallet-guard__wallet-guard-extension \
    research/repos/RabbyHub__Rabby 2>/dev/null || true

  section "Account abstraction stretch research"
  rg -n "UserOperation|EntryPoint|eth_sendUserOperation|sendUserOperation" \
    research/repos/eth-infinitism__account-abstraction \
    research/repos/eth-infinitism__bundler-spec \
    research/repos/pimlicolabs__permissionless.js 2>/dev/null || true

  section "Safe treasury stretch research"
  rg -n "proposeTransaction|confirmTransaction|SafeTransaction|transactionService" \
    research/repos/safe-global__safe-core-sdk \
    research/repos/safe-global__safe-transaction-service 2>/dev/null || true

} > "$OUT"

echo "Wrote $OUT"
EOF
chmod +x "scripts/aegis-source-search.sh"

write_file "scripts/aegis-source-check.sh" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

echo "== Tools =="
for cmd in node npm git rg opensrc; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "OK $cmd: $(command -v "$cmd")"
  else
    echo "MISS $cmd"
  fi
done

echo ""
echo "== OpenSrc list =="
opensrc list 2>/dev/null || true

echo ""
echo "== Path files =="
find research/opensrc-paths -type f -name "*.path" 2>/dev/null | sort | wc -l

echo ""
echo "== Fallback GitHub clones =="
find research/repos -maxdepth 2 -type d -name ".git" 2>/dev/null | wc -l

echo ""
echo "== Important docs =="
for f in \
  docs/research/00-source-code-research-index.md \
  docs/research/01-opensrc-package-map.md \
  docs/research/02-github-repo-map.md \
  docs/research/03-implementation-search-playbook.md \
  research/notes/source-research-results.md
do
  [[ -f "$f" ]] && echo "OK $f" || echo "MISS $f"
done

echo ""
echo "== Next commands =="
echo "bash scripts/aegis-opensrc-cache.sh"
echo "bash scripts/aegis-github-source-cache.sh"
echo "bash scripts/aegis-source-search.sh"
EOF
chmod +x "scripts/aegis-source-check.sh"

# ------------------------------------------------------------------------------
# 7) README append
# ------------------------------------------------------------------------------

append_once "README.md" "<!-- AEGIS_OPENSRC_RESEARCH_START -->" <<'EOF'

<!-- AEGIS_OPENSRC_RESEARCH_START -->
## Aegis OpenSrc + GitHub source research

This repo uses source code as truth for agentic development.

```bash
bash scripts/aegis-opensrc-cache.sh
bash scripts/aegis-github-source-cache.sh
bash scripts/aegis-source-search.sh
bash scripts/aegis-source-check.sh
```

Main docs:

- `docs/research/00-source-code-research-index.md`
- `docs/research/01-opensrc-package-map.md`
- `docs/research/02-github-repo-map.md`
- `docs/research/03-implementation-search-playbook.md`

24H cut rule:

If it does not help `/api/rpc`, `/api/preflight`, transaction decoding, approval BLOCK, Chainlink price/freshness signal, audit log, RiskOps dashboard, or Base Sepolia proof, it is stretch.
<!-- AEGIS_OPENSRC_RESEARCH_END -->
EOF

# ------------------------------------------------------------------------------
# 8) Run selected mode
# ------------------------------------------------------------------------------

case "$MODE" in
  all)
    log "Running OpenSrc package cache"
    bash scripts/aegis-opensrc-cache.sh
    log "Running GitHub source cache"
    bash scripts/aegis-github-source-cache.sh
    ;;
  opensrc)
    log "Running OpenSrc package cache only"
    bash scripts/aegis-opensrc-cache.sh
    ;;
  github)
    log "Running GitHub source cache only"
    bash scripts/aegis-github-source-cache.sh
    ;;
esac

log "Generating source research result file"
bash scripts/aegis-source-search.sh || warn "source search completed with warnings"

log "Running final check"
bash scripts/aegis-source-check.sh

cat <<'EOF'

Done.

Use this for your coding agent:

Read:
- docs/research/00-source-code-research-index.md
- docs/research/03-implementation-search-playbook.md
- research/notes/source-research-results.md

Then implement only phase-01-rpc-gateway first:
- /api/rpc passthrough
- /api/preflight skeleton
- ERC20 approve decoder
- SAFE/WARN/BLOCK policy result
- audit log event shape

EOF
