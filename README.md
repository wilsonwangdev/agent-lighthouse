# Agent Lighthouse 🔦

**Audit any website for AI Agent Readiness** — the Lighthouse for the Agent Era.

Measure how well your application serves AI agents across five dimensions: Discovery, Identity, Auth & Access, Integration, and UX.

Built on the [ora](https://ora.sh) Agent Readiness framework.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start API (port 3000)
pnpm --filter api dev

# Start Web UI (port 3001)
pnpm --filter web dev

# Run CLI audit
node packages/cli/dist/cli.js vercel.com
```

## 📦 Packages

| Package | Description |
|---|---|
| `@agent-lighthouse/core` | Audit engine — scores any URL across 5 dimensions |
| `agent-lighthouse` | CLI tool — `agent-lighthouse <url>` |
| `apps/api` | Hono REST API — `GET /api/audit?url=...` |
| `apps/web` | Next.js dashboard — Lighthouse-style web UI |

## 🧪 Scoring Model

```
Agent Readiness Score (0-100)
├── Discovery (25%)  — llms.txt, robots.txt, sitemap
├── Identity (20%)   — OG tags, JSON-LD, meta, title
├── Auth & Access (20%) — OAuth, OIDC, HTTPS, API docs
├── Integration (20%) — MCP, Webhooks, RSS, CORS
└── UX (15%)         — Semantic HTML, ARIA, links, viewport
```

## 📊 Grades

| Score | Grade |
|---|---|
| 80-100 | A — Fully Agent-Ready |
| 65-79  | B — Mostly Agent-Ready |
| 50-64  | C — Partially Agent-Ready |
| 35-49  | D — Minimally Agent-Ready |
| 0-34   | F — Not Agent-Ready |

## 🛠 Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Core**: TypeScript, native fetch
- **API**: Hono
- **Web**: Next.js 15, React 19, Tailwind CSS v4
- **CLI**: Commander, Chalk

## 📄 License

MIT
