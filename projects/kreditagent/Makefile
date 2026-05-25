.PHONY: install dev api web contracts test package
install:
	pnpm install

dev:
	pnpm dev

api:
	pnpm --filter @kreditagent/api dev

web:
	pnpm --filter @kreditagent/web dev

contracts:
	cd contracts && forge build && forge test

test:
	pnpm test
	cd contracts && forge test

package:
	cd /mnt/data && zip -r kreditagent-hackathon.zip kreditagent-hackathon -x "*/node_modules/*" "*/.next/*" "*/out/*" "*/broadcast/*"
