# Historical Aegis RPC Setup Commands

> Archived product material. Do not execute these commands from the Agent
> Harness repository.

## 1. Workspace sanity

```bash
pwd
find . -maxdepth 3 -type f | sort | head -200
git status
```

## 2. Runtime checks

```bash
systemctl --user list-units --type=service | grep -Ei "kiro|hermes|gateway" || true
curl -s http://127.0.0.1:8787/health | jq || true
```

Expected active services:

```text
hermes-gateway.service
kiro-openai-bridge.service
```

Forbidden:

```text
telegram-kiro-gateway.service
```

## 3. Install package source research

```bash
npm install -g opensrc
opensrc path viem
rg "decodeFunctionData" "/home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3"
```

## 4. Install external skills, optional

```bash
npx skills@latest add mattpocock/skills
npx skills@latest add obra/superpowers
npx skills@latest add vercel-labs/skills
npx skills@latest add vercel-labs/agent-skills
npx skills@latest add vercel-labs/next-skills
npx skills@latest add supabase/agent-skills
npx skills@latest add anthropics/skills
```

## 5. Initialize app if missing

```bash
corepack enable
pnpm create next-app apps/web --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*"
```

## 6. Install dependencies

```bash
pnpm add viem zod @supabase/supabase-js @tanstack/react-query lucide-react framer-motion recharts
pnpm add -D tsx
```

## 7. Initialize contracts if missing

```bash
forge init contracts
cd contracts
forge build
```

## 8. First build task

```text
Use .skills/rpc-gateway and tasks/phase-01-rpc-gateway.md.
Implement /api/rpc passthrough for eth_blockNumber and eth_getBalance.
```
