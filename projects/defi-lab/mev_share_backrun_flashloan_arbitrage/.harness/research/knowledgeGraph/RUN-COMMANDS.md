# Commands to Run for Knowledge Graph Generation

**Execute these in your Cursor chat (the AI coding interface) while this project is active.**

## 1. Primary Full Project Scan (Most Important)

```text
/understand
```

This will analyze the entire MEV Share Backrun Flashloan Arbitrage project and produce:

`.understand-anything/knowledge-graph.json`

(plus supporting files in that directory).

## 2. Focused Scan on High-Value Content (Recommended Second Run)

```text
/understand docs .harness
```

## 3. Deep Analysis of the Main Learning Notes (Critical for Innovation)

```text
/understand-knowledge .workspace/DeFiMEVLearn.md
```

This treats the rich learning document as a Karpathy-style wiki and extracts entities, claims, and relationships.

## 4. (Optional but powerful) Domain View

After the above, run:

```text
/understand-domain
```

## After Running

- The raw graph will be in `.understand-anything/knowledge-graph.json` (relative to workspace or project root).
- Copy the main JSON into this directory as `00-raw-knowledge-graph.json` (or similar).
- Then continue with the rest of the plan (synthesis into the numbered MD files).

## Notes

- The plugin supports incremental runs — you can re-run `/understand` later and it will only re-analyze changed files.
- Use `--language en` if you want to force English output.
- After generation, run `/understand-dashboard` to visually explore the graph in your browser.

Once you have executed the above commands and the JSON exists, reply here and the agent will proceed to read the generated graph and perform the deep harness-native synthesis + validation against all V1 constraints.
