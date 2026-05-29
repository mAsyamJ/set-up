https://github.com/Lum1104/Understand-Anything

1. Install the plugin
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
2. Analyze your codebase
/understand
A multi-agent pipeline scans your project, extracts every file, function, class, and dependency, then builds a knowledge graph saved to .understand-anything/knowledge-graph.json.

Localized output: Use --language to generate content in your preferred language:

# Generate Chinese content (知识图节点描述和 Dashboard UI)
/understand --language zh

# Supported languages: en (default), zh, zh-TW, ja, ko, ru
The --language parameter affects:

Node summaries and descriptions in the knowledge graph
Dashboard UI labels, buttons, and tooltips
Guided tour explanations
3. Explore the dashboard
/understand-dashboard
An interactive web dashboard opens with your codebase visualized as a graph — color-coded by architectural layer, searchable, and clickable. Select any node to see its code, relationships, and a plain-English explanation.

4. Keep learning
# Ask anything about the codebase
/understand-chat How does the payment flow work?

# Analyze impact of your current changes
/understand-diff

# Deep-dive into a specific file or function
/understand-explain src/auth/login.ts

# Generate an onboarding guide for new team members
/understand-onboard

# Extract business domain knowledge (domains, flows, steps)
/understand-domain

# Analyze a Karpathy-pattern LLM wiki knowledge base
/understand-knowledge ~/path/to/wiki

# Re-run anytime — incremental by default (only re-analyzes changed files)
/understand

# Auto-update on every commit via a post-commit hook
/understand --auto-update

# Scope to a subdirectory (for huge monorepos)
/understand src/frontend
