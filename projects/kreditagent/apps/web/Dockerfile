FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web ./apps/web
COPY packages ./packages
RUN corepack enable && pnpm install --frozen-lockfile=false && pnpm --filter @kreditagent/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@kreditagent/web", "start"]
