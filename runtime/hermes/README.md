# Hermes Integration

Hermes is an optional operator with its own model and provider configuration.
It connects to the Harness through the fixed `hermes-operator` stdio MCP
entrypoint. Hermes is not a model backend for Cursor and is not an approval
authority.

The initial profile is foreground-only and read-only. Bounded task proposal is
a separate gate. Write, verification, commit, review, service management,
permission response, merge, push, deploy, and fleet capabilities are not
available to the operator profile.

See `docs/runbooks/hermes-activation.md`. Files under
`docs/archive/hermes-runtime/` are historical and must not be installed or
loaded.
