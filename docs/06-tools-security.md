# Tools and Security

Risk classes R0–R5 in `tools/policies/default.tool-policy.json`.

- R0: read-only (default allow)
- R1: safe write (allow with trace)
- R2: patch.propose (allow preview only)
- R3: shell.run (deny)
- R4: push/deploy (deny)
- R5: secrets (deny)

Orchestrator never calls shell directly — only gateway tools.
