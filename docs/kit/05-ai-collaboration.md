# AI collaboration proof

SEABW judging expects visible AI tool usage. This kit requires **git commit trailers** plus a **collaboration log**.

## Requirements

1. Every **AI-assisted commit** includes at least one `Co-authored-by:` line in the commit body (not only the subject line).
2. Update [docs/AI_COLLABORATION_LOG.md](templates/AI_COLLABORATION_LOG.md) (in your app repo) when you land a module or complete a phase.
3. Do not fake AI usage — commits should match real sessions (Kiro, Hermes, Cursor, etc.).

## Commit message format

```gitcommit
feat: add tx decoder for native transfer and ERC20 approve

Implements HACKATHON.md module 3. Decoder feeds policy engine inputs only.

Co-authored-by: Kiro <kiro@aws.dev>
Co-authored-by: Hermes <hermes@nousresearch.com>
Co-authored-by: Cursor <cursor@cursor.com>
```

Use only the tools you actually used. Common trailers:

| Tool | Trailer |
|------|---------|
| Kiro | `Co-authored-by: Kiro <kiro@aws.dev>` |
| Hermes | `Co-authored-by: Hermes <hermes@nousresearch.com>` |
| Cursor | `Co-authored-by: Cursor <cursor@cursor.com>` |
| GitHub Copilot | `Co-authored-by: Copilot <copilot@github.com>` |

### HEREDOC example

```bash
git commit -m "$(cat <<'EOF'
feat: add policy engine with SAFE/WARN/BLOCK

Module 4 from HACKATHON.md.

Co-authored-by: Kiro <kiro@aws.dev>
Co-authored-by: Cursor <cursor@cursor.com>
EOF
)"
```

## Collaboration log

Copy [templates/AI_COLLABORATION_LOG.md](templates/AI_COLLABORATION_LOG.md) to your app repo as `docs/AI_COLLABORATION_LOG.md`.

| Date | Module / phase | Commit (SHA) | AI tools used | Human role |
|------|----------------|--------------|---------------|------------|
| 2026-05-18 | scaffold | `a1b2c3d` | Kiro, Cursor | architecture, review |
| 2026-05-19 | module 3 decoder | `d4e5f6a` | Kiro, builder agent | requirements, test |

## Git commit template (optional)

Install via:

```bash
~/dev/Project/aegis-hackathon-kit/scripts/setup-shell.sh
```

This can set:

```bash
git config --global commit.template ~/dev/Project/aegis-hackathon-kit/docs/kit/templates/git-commit-template.txt
```

Template file: [templates/git-commit-template.txt](templates/git-commit-template.txt)

## QA verification

Before submit, run:

```bash
kiro-cli --agent qa
```

```txt
Verify last 10 commits contain Co-authored-by. Verify docs/AI_COLLABORATION_LOG.md matches module checklist in HACKATHON.md.
```

Or manually:

```bash
git log -10 --format=%B | grep -c Co-authored-by
```

## What judges should see

- **Git history:** steady commits with AI trailers, one module per commit where possible.
- **Log file:** human roles documented (design, review, demo).
- **Honesty:** AI memo and pitch do not claim AI makes security decisions — see [06-mvp-and-demo.md](06-mvp-and-demo.md).

## Anti-patterns

- Single giant commit for entire MVP without trailers.
- Empty `Co-authored-by` on obvious AI-generated diffs.
- Collaboration log missing or never updated after phase 2.

## Related

- [04-hackathon-lifecycle.md](04-hackathon-lifecycle.md)
- [templates/HACKATHON.md](templates/HACKATHON.md)
