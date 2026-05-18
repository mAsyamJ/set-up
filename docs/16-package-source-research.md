# Package Source Research with opensrc

OpenSrc lets agents inspect package source instead of relying only on docs or type hints.

Website: https://opensrc.sh/
GitHub: https://github.com/vercel-labs/opensrc

## Install

```bash
npm install -g opensrc
```

## Package map

| Package | Why Aegis needs it | Command | What to inspect |
|---|---|---|---|
| viem | EVM clients, ABI decode, contract reads | `opensrc path viem` | `decodeFunctionData`, `publicClient.call`, `readContract` |
| next | App Router and API routes | `opensrc path next` | route handlers, server runtime |
| zod | request validation | `opensrc path zod` | `z.object`, parse errors |
| @supabase/supabase-js | audit log DB | `opensrc path @supabase/supabase-js` | client creation, inserts, selects |
| @vercel/postgres | Vercel DB fallback | `opensrc path @vercel/postgres` | SQL client patterns |
| @tanstack/react-query | dashboard fetching | `opensrc path @tanstack/react-query` | polling, invalidation |
| wagmi | wallet UI stretch | `opensrc path wagmi` | connectors, hooks |

## Useful searches

```bash
rg "decodeFunctionData" "/home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3"
rg "readContract" "/home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3"
rg "Route Handler" "/home/asyam/.opensrc/repos/github.com/vercel/next.js/16.2.6"
rg "createClient" "/home/asyam/.opensrc/repos/github.com/supabase/supabase-js/2.106.0/packages/core/supabase-js"
```

