FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages
RUN corepack enable && pnpm install --frozen-lockfile=false
EXPOSE 4000
CMD ["pnpm", "--filter", "@kreditagent/api", "start"]
