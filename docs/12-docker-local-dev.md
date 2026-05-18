# 12 Docker and Local Development

## Docker Compose

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: aegis-postgres
    environment:
      POSTGRES_USER: aegis
      POSTGRES_PASSWORD: aegis
      POSTGRES_DB: aegis
    ports:
      - "5432:5432"
    volumes:
      - aegis_pg:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: aegis-redis
    ports:
      - "6379:6379"

volumes:
  aegis_pg:
```

## Local setup

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm db:migrate
pnpm dev
```

## Environment

```env
BASE_SEPOLIA_RPC_URL=
NEXT_PUBLIC_CHAIN_ID=84532
DATABASE_URL=
ANTHROPIC_API_KEY=
CHAINLINK_ETH_USD_FEED_BASE_SEPOLIA=
AEGIS_POLICY_REGISTRY_ADDRESS=
DEMO_ERC20_ADDRESS=
DEMO_SPENDER_ADDRESS=
```

## Vercel note

For Vercel use Supabase or Vercel Postgres instead of local Docker Postgres.
