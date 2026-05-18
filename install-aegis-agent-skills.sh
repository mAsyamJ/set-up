#!/usr/bin/env bash
set -euo pipefail

echo "Installing core workflow skills..."
npx skills add mattpocock/skills --all || true
npx skills add obra/superpowers --all || true
npx skills add anthropics/skills --all || true

echo "Installing Vercel / Next / frontend skills..."
npx skills add vercel-labs/agent-skills --all || true
npx skills add vercel-labs/skills --all || true
npx skills add vercel-labs/next-skills --all || true
npx skills add shadcn/ui || true

echo "Installing Supabase skills..."
npx skills add supabase/agent-skills --all || true

echo "Installing OpenSrc for package source research..."
npm install -g opensrc || true

echo "Verifying OpenSrc package paths..."
opensrc path viem || true
opensrc path zod || true
opensrc path next || true
opensrc path @supabase/supabase-js || true

echo "Done."
echo ""
echo "Next:"
echo "  npx skills add vercel-labs/agent-skills --list"
echo "  npx skills add vercel-labs/next-skills --list"
echo "  bash scripts/check-agentic-workspace.sh"
