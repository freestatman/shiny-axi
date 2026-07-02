# r-axi: Plan Document

> **Status**: Exploration / Pre-decision  
> **Last updated**: 2026-06-28  
> **Context**: Branched from discussion about whether to keep R/Shiny/Quarto support as a lavish-axi fork or build a new standalone AXI extension.

---

## Background

This document captures the ongoing thinking about how to best package and evolve R ecosystem support for AI agents — specifically the combination of:

- **R Shiny** interactive visual review
- **Quarto** document annotation
- **R session context** (R console, environment, package inspection)
- **R-specific analysis** (a possible AXI-native replacement for `btw`)

---

## Current State (as of 2026-06-28)

The current work lives in a **personal fork of [lavish-axi](https://github.com/kunchenguid/lavish-axi)** (`freestatman/lavish-axi`).

### What's been built in the fork

| File | What it adds |
|---|---|
| `src/shiny-process.js` | Detects Rscript, launches/kills Shiny process, waits for readiness |
| `src/shiny-proxy.js` | HTTP + WebSocket proxy (Shiny traffic → Lavish chrome) |
| `src/quarto-process.js` | Detects quarto, renders `.qmd` → HTML, launches Quarto Shiny server |
| `src/server.js` | Routes: `/api/shiny-sessions`, `/api/quarto-sessions`, proxy wiring |
| `src/cli.js` | `shiny` and `quarto` subcommands |
| `.agents/skills/lavish-shiny/SKILL.md` | Agent skill: Shiny visual review workflow |
| `.agents/skills/lavish-quarto/SKILL.md` | Agent skill: Quarto annotation workflow |

### Current install paths (skills-based, works today)

```sh
# Shiny support
npx skills add freestatman/lavish-axi --skill lavish-shiny

# Quarto support  
npx skills add freestatman/lavish-axi --skill lavish-quarto
```

These skills teach agents to invoke `npx -y lavish-axi shiny <dir>` / `npx -y lavish-axi quarto <file>`.

### Note on README content

The R Shiny + Quarto sections in this repo's `README.md` were **locally added** and are **not part of upstream lavish-axi**. The upstream repo has no Shiny or Quarto support.

---

## The AXI Ecosystem Context

[AXI (Agent eXperience Interface)](https://axi.md) is a paradigm for agent-native CLI tools built around 10 design principles that treat token budget as a first-class constraint.

### Official AXIs

| AXI | Domain |
|---|---|
| `gh-axi` | GitHub operations |
| `chrome-devtools-axi` | Browser automation |
| `lavish-axi` | HTML artifact visual review |

### Community AXIs (as of 2026-06-28)

| AXI | Author | Domain |
|---|---|---|
| `npm-axi` | SSBrouhard | npm package registry |
| `sqlite-axi` | SSBrouhard | SQLite queries |
| `slack-axi` | JarvusInnovations | Slack |

All community AXIs are **standalone repos** with their own npm packages. None are forks of existing AXIs.

### AXI benchmark results (Kun Chen's published data)

`gh-axi` vs GitHub MCP:
- **100% success** vs 87% (MCP)
- **$0.050** vs $0.148 (MCP) — 3x cheaper
- **3 turns** vs 6 turns (MCP) — 2x fewer

`chrome-devtools-axi` vs chrome-devtools-mcp:
- **100% success** vs 99%
- **$0.074** vs $0.101 — 27% cheaper
- **4.5 turns** vs 6.2 turns

---

## The Proposed Direction: Standalone `r-axi`

### Core idea

Build **`r-axi`** as a new, independent AXI for the R ecosystem. It would be the first R-focused AXI in the catalog and would cover:

1. **Visual review layer** (from current fork): Shiny proxy + Quarto render
2. **R session context layer** (new): AXI-style replacement for `btw` MCP
3. **R toolchain layer** (new): renv, testthat, devtools with token-efficient output

### What `btw` is (the MCP reference to beat)

[`btw`](https://posit-dev.github.io/btw/) (v1.2.1, by Posit) is an R package that acts as an MCP server exposing R capabilities to LLM agents.

**btw's tool groups:**

| Group | Exposes |
|---|---|
| `env` | R objects, data frames, global environment |
| `docs` | Package help pages, vignettes, NEWS |
| `files` | List/read/write files, code search |
| `pkg` | Package dev: test, check, document |
| `cran` | CRAN package search + metadata |
| `sessioninfo` | Installed packages, platform info |
| `git` | Git status, diffs, logs |
| `github` | GitHub issues and PRs |

**btw's structural weaknesses vs AXI:**

1. **No visual/interactive loop** — `btw` has no browser chrome, no Shiny proxy, no human annotation delivery. Visual review of Shiny/Quarto is completely absent.
2. **Fine-grained MCP tool calls** — composite R tasks (launch Shiny, wait for health, open browser, poll) require 5+ separate MCP round-trips. In AXI it's one command.
3. **Requires manual MCP configuration** — user must configure `btw_mcp_server()` in Claude Desktop before each session. AXI is `npx -y r-axi ...`, zero setup.
4. **MCP schema overhead** — every call pays for tool discovery and JSON-RPC framing on both input and output.

### Proposed `r-axi` command structure

```
r-axi env          — R session context
  r-axi env ls               List objects with types and shapes (TOON)
  r-axi env describe <name>  Describe a data frame / list concisely
  r-axi env run <expr>       Evaluate expression, return TOON output

r-axi pkg          — Package and dependency management
  r-axi pkg info <name>      Package metadata (CRAN / installed)
  r-axi pkg deps <name>      Dependency tree (truncated, with depth limit)
  r-axi pkg test             Run testthat, return structured results

r-axi shiny <dir>  — Visual Shiny review
  (managed mode: spawn R, proxy, open browser chrome)
  --url <url>      (attached mode: proxy an already-running app)
  --no-open

r-axi quarto <file> — Visual Quarto annotation
  (static: quarto render → serve → browser chrome)
  (shiny: auto-detected via YAML frontmatter → quarto serve → proxy)
  --no-open

r-axi poll <path>  — Long-poll for human annotations
  --agent-reply "..."   Show reply in browser before polling
  --timeout-ms <ms>     Test/debug only

r-axi end <path>   — End a review session
r-axi stop         — Shut down background server
```

---

## Architecture Decision: Fork vs. Standalone

### Why NOT to stay as a lavish-axi fork

| Issue | Detail |
|---|---|
| Upstream rebase burden | Every lavish-axi release requires merging, conflict resolution, re-publishing |
| npm name conflict | Can't publish to `lavish-axi` (owned by Kun Chen) |
| Scope mismatch | R-specific features (env, pkg, cran) are alien to lavish's HTML artifact scope |
| AXI catalog visibility | A fork isn't listed as a community AXI in its own right |
| Community identity | "lavish fork" is less credible to the R community than a purpose-built tool |

### Why a standalone AXI works

- Own npm namespace (`r-axi`, `r-lavish-axi`, or similar TBD)
- Own release cycle, own changelog, own roadmap
- R-specific features fit naturally
- Can be listed in the AXI community catalog
- No upstream coupling

### The infrastructure question

The main cost of going standalone: reimplementing the lavish browser chrome + server core (~1500+ LOC).

**Three options considered:**

| Option | Approach | Verdict |
|---|---|---|
| A | Import lavish-axi as a JS library | Not viable — it exports no stable API |
| B | Copy/embed the lavish server core (MIT-attributed) | Pragmatic, works now. Fully independent. |
| C | Propose extracting `lavish-axi-server` package upstream | Cleanest long-term, but requires Kun Chen's buy-in |

**Current recommendation: Option B** — embed the server core, attribute MIT license to Kun Chen. The code is clean, well-structured, and designed exactly for this use case. The fork already contains it.

---

## The Benchmark Opportunity

No published AXI-vs-MCP benchmark exists in the R domain. Running one is a strategic advantage.

### Proposed conditions

| Condition | Description |
|---|---|
| `r-axi` | The new standalone AXI |
| `btw-mcp` | btw MCP server configured in Claude Code |
| `btw-mcp-minimal` | btw with only `docs` + `env` tool groups |
| `rscript-cli` | Raw Rscript calls (human CLI baseline) |
| `r-axi+shiny` | r-axi with Shiny visual review task set |

### Proposed task categories

| Category | Example tasks |
|---|---|
| Session inspection | "Describe the `mtcars` data frame. What are its columns and types?" |
| Package ops | "Check if `tidyverse` is installed. What version?" |
| Code execution | "Run a linear regression of mpg ~ wt + cyl. Summarize the output." |
| Dependency analysis | "What does `{targets}` depend on? Is it installed?" |
| Shiny review | "Launch the app in ./app, annotate the sidebar width." |
| Quarto annotation | "Render report.qmd and flag any layout overflow issues." |
| Package dev | "Run tests for the current package. Are there failures?" |

### Methodology (following Kun Chen's approach)
- N tasks × M conditions × K repeats (e.g., 10 tasks × 5 conditions × 5 repeats = 250 runs)
- Model: Claude Sonnet 4.x (to match Kun Chen's methodology for comparability)
- Metrics: Success rate, avg cost ($), avg duration (s), avg turns
- Publish results in `r-axi` README

---

## Open Questions / Decisions Pending

### 1. npm package name
Options: `r-axi`, `r-lavish-axi`, `raxi`, `shiny-axi`, `rtools-axi`
- Should clearly signal R ecosystem
- Should fit AXI naming conventions (`*-axi`)
- **Decision needed before publishing**

### 2. Scope boundary
Does `r-axi` try to replace `btw` entirely (env + pkg + cran + docs), or focus on the visual review differentiator (shiny + quarto) and leave session context to btw?
- **Full replacement**: bigger scope, stronger benchmark story, more maintenance
- **Visual-only**: smaller scope, cleaner differentiation, faster to ship
- **Recommendation**: Start with visual-only (shiny + quarto), add `r-axi env` in Phase 2

### 3. Upstream relationship with Kun Chen
- Should we reach out to propose Option C (`lavish-axi-server` shared package)?
- Is there value in a formal mention/collaboration vs. just attribution?
- **No urgency** — can be done after Phase 1 is shipped

### 4. R package vs. npm package
- `r-axi` itself is a Node.js CLI (npm package) — this is appropriate for an AXI
- But should there also be a companion R package for the agent skills / workflow?
- `btw` is an R package because it needs to introspect the R session; `r-axi` doesn't need this (it spawns Rscript as a subprocess)
- **Verdict**: npm only for the AXI CLI; no R package needed

### 5. Session persistence for `r-axi env`
- `btw` connects to a *running* R session (persistent state: objects, loaded packages)
- `r-axi env run <expr>` can spawn a fresh Rscript each time (stateless) or maintain a persistent R process
- Stateless is simpler to implement but loses REPL-like convenience
- **Deferred to Phase 2 design**

---

## Roadmap (Draft)

### Phase 1 — Extract & publish as standalone (2–4 weeks)
- [ ] Create `r-axi` npm package from lavish fork
- [ ] Choose npm package name
- [ ] Embed/attribute lavish server core (MIT)
- [ ] `r-axi shiny` working end-to-end
- [ ] `r-axi quarto` working end-to-end
- [ ] `r-axi poll`, `r-axi end`, `r-axi stop`
- [ ] Update skills to point to `r-axi` package
- [ ] Publish to npm

### Phase 2 — Add btw-equivalent layer (2–4 weeks)
- [ ] `r-axi env ls` — list R objects with type/shape (TOON)
- [ ] `r-axi env describe <name>` — describe df concisely
- [ ] `r-axi env run <expr>` — evaluate, return token-efficient output
- [ ] `r-axi pkg info <name>` — package metadata
- [ ] `r-axi pkg deps <name>` — dependency tree
- [ ] Apply AXI principles: TOON output, 3–4 field truncation, `--full` escape hatch

### Phase 3 — Benchmark (2–3 weeks)
- [ ] Design task suite (10–15 tasks)
- [ ] Set up benchmark harness
- [ ] Run: `r-axi` vs `btw-mcp` vs `rscript-cli`
- [ ] Publish results in README

### Phase 4 — Community
- [ ] Submit to axi.md catalog (community section)
- [ ] Publish `r-lavish` / `r-quarto` skills to agentskills.io
- [ ] Write up on R community channels (R Weekly, Mastodon #rstats)

---

## References

- [AXI repo](https://github.com/kunchenguid/axi)
- [AXI catalog](https://axi.md)
- [lavish-axi (upstream)](https://github.com/kunchenguid/lavish-axi)
- [lavish-axi fork (current work)](https://github.com/freestatman/lavish-axi)
- [btw R package](https://posit-dev.github.io/btw/)
- [mcptools R package](https://github.com/posit-dev/mcptools)
- [AXI benchmark methodology](https://github.com/kunchenguid/axi#results)
