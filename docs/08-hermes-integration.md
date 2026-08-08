# Hermes Integration

This legacy integration has been replaced by the restricted, staged design in
[`runbooks/hermes-activation.md`](runbooks/hermes-activation.md) and
[`architecture/agent-harness-v1.md`](architecture/agent-harness-v1.md).

Hermes is optional and has its own provider/model control plane. It is never a
Cursor model backend, cannot approve actions, and begins with a foreground,
read-only Harness MCP profile. Fleet, Telegram automation, dashboards, A2A,
bridges, timers, port proxies, and persistent services remain disabled.

Do not use old bootstrap, sync, systemd, or `0.0.0.0 --insecure` instructions.
