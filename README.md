<h1 align="center">shiny-axi</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/shiny-axi"
    ><img alt="npm" src="https://img.shields.io/npm/v/shiny-axi?style=flat-square"
  /></a>
  <a href="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square"
    ><img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square"
  /></a>
</p>

<h3 align="center">Iteratively review, annotate, and debug R Shiny applications and Quarto documents from your AI coding agent.</h3>

shiny-axi is an [Agent eXperience Interface (AXI)](https://axi.md) extension designed to bridge R Shiny applications and Quarto documents with AI coding agents (such as Claude Code, Cursor, or OpenCode). It launches R Shiny or Quarto sessions locally, proxies them through a collaborative review browser interface, intercepts WebSockets, and allows you to pinpoint layout elements or select text and ship those annotations back to your AI agent.

- **Visual Iteration for Shiny**: Runs your R Shiny app locally, proxies HTTP and WebSocket traffic, injects annotation SDKs, and allows the agent to visually inspect reactive layout adjustments as it modifies the R source code.
- **Quarto Render & Preview**: Automatically renders static `.qmd`/`.rmd` documents or serves interactive Quarto Shiny apps, auto-reloading the browser whenever the agent updates the source document.
- **Ergonomic Long-polling**: Exposes a token-efficient long-polling CLI interface (`shiny-axi poll`) that delivers human feedback, boundary-pinned annotations, and DOM snapshots back to the agent in one turn.
- **Zero-config client**: No global installation required for agents — the runner automatically fetches the package dynamically via `npx`.

---

## Why this matters for the R community

AI coding agents can now draft a substantial amount of R code, but a working Shiny app or Quarto report is more than source text. Its quality lives in the running experience: reactive state, inputs and outputs, plots, tables, browser layout, and the way a report reads after it renders. Those are exactly the details that are hard to express in a chat message such as “the filter feels wrong” or “this chart is too crowded.”

shiny-axi turns that visual review into structured context for an agent. You run the real app or document locally, inspect it in the browser, annotate the exact component or text range, and send the feedback back with DOM context. The agent can then change the R or Quarto source, while you see the live result rather than relying on screenshots or a long back-and-forth description.

For R teams, this means AI can participate in the full build-review-improve loop without replacing the people who understand the data, statistical intent, domain language, or deployment constraints. It is especially useful when:

- a Shiny developer needs to validate reactive behavior and layout after an agent changes UI or server code;
- an analyst needs to review a rendered Quarto report, narrative, figures, and tables with precise visual feedback;
- a domain expert can explain what is wrong in the browser without editing R code; or
- sensitive data and applications should remain in the local R workflow by default.

Shiny AXI is therefore not an “AI writes R for you” tool. It is a local-first collaboration layer that helps R developers, analysts, and domain experts give AI agents the same kind of concrete visual feedback they already use when reviewing an application or report.

---

## Installation

You can install **shiny-axi** via npm (Node 22+ required). The package is distributed as a CLI that runs without a global install:

```sh
# Execute the CLI directly using npx (no global install needed)
npx -y shiny-axi <command> [options]
```

The above works on macOS, Linux, and Windows. If you prefer a permanent global install:

```sh
npm install -g shiny-axi
```

> **Note:** The CLI is an ESM‑only package and requires Node 22 or later.

## Background

### Upstream and attribution

shiny-axi is a fork of [lavish-axi](https://github.com/kunchenguid/lavish-axi) by Kun Chen. Its local HTML review server, browser chrome, and annotation SDK were adapted and extended here for R Shiny and Quarto workflows.

The upstream work and its copyright notice are retained under the MIT License; see [LICENSE](LICENSE). Shiny/Quarto process management, proxying, and workflow-specific integrations are maintained by this project.

### Scope

Shiny AXI is an R-first visual review workflow, not a general-purpose replacement for Lavish AXI. For general HTML artifacts outside R workflows, use [Lavish AXI](https://github.com/kunchenguid/lavish-axi). For the source boundary, selective-sync policy, and contribution rules, see [UPSTREAM.md](https://github.com/freestatman/shiny-axi/blob/main/UPSTREAM.md).

## Quick Start

Install the Agent Skills for the R visual workflows using [`npx skills`](https://github.com/vercel-labs/skills):

```sh
# To review and annotate R Shiny apps, install the shiny skill:
npx skills add freestatman/shiny-axi --skill shiny

# To review and annotate Quarto documents and Quarto Shiny apps:
npx skills add freestatman/shiny-axi --skill quarto
```

Inside your AI agent session (e.g. Claude Code), simply invoke the workflow:

```
Let's build a Shiny application in my local folder and visually review the layout.
```

The agent will automatically load the appropriate skill, launch the app in your browser, and wait for your comments.

---

## How It Works

1. **Agent Launches Session**: The agent runs `npx -y shiny-axi shiny <app-dir>` (or `npx -y shiny-axi quarto <file.qmd>`).
2. **Server Starts & Proxies**: `shiny-axi` boots R/Quarto in the background, allocates a local port, proxies traffic, and opens a browser chrome window.
3. **Human Annotates & Sends**: You interact with the app inside the sandboxed preview. Select text, click elements to write annotations, and click "Send to Agent".
4. **Agent Polls & Iterates**: The agent runs `npx -y shiny-axi poll` to wait for feedback. Once annotations arrive, it edits your `.R` or `.qmd` source code.
5. **Live Reload**: Source changes are auto-detected, triggering a clean WebSocket reload / re-render inside the browser window.

---

## R Shiny Support

- **Managed Mode (Default)**: Run `shiny-axi shiny [app-dir]` (where `app-dir` defaults to the current directory). It checks for the `shiny` R package, finds a free port, launches the Shiny background process, and terminates it when the session ends.
- **Attached Mode**: If you already have a Shiny application running locally, you can proxy it by running `shiny-axi shiny [app-dir] --url <url>` (for example, `--url http://127.0.0.1:8000`).
- **Interactive UI & Plots**: The proxy server routes real-time bidirectional WebSockets to allow interactive inputs, reactive outputs, and plots to function inside the sandbox.

---

## Quarto Support

- **Static documents**: Run `shiny-axi quarto <file.qmd>`. It renders the document to HTML with `quarto render`, serves the output, and automatically re-renders on file changes.
- **Interactive Quarto Shiny apps**: When the document's YAML frontmatter contains `server: shiny`, it automatically runs `quarto serve` instead and proxies the live Shiny session.

---

## CLI Reference

| Command                        | Description                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| `shiny-axi`                    | Show current sessions and usage guidance.                           |
| `shiny-axi <html-file>`        | Compatibility: open a static HTML review session.                   |
| `shiny-axi shiny [app-dir]`    | Open or resume an R Shiny application review session.               |
| `shiny-axi quarto <file.qmd>`  | Open or resume a Quarto document / Quarto Shiny review session.     |
| `shiny-axi poll <path>`        | Long-poll until the user sends feedback or reports layout warnings. |
| `shiny-axi end <path>`         | End an active review session.                                       |
| `shiny-axi stop`               | Shut down the background server.                                    |
| `shiny-axi design`             | Show the copy-pasteable Tailwind/DaisyUI CDN fallback.              |
| `shiny-axi export <file.html>` | Write a portable HTML export with local assets inlined.             |
| `shiny-axi share <file.html>`  | Publish a self-contained artifact to the optional ht-ml.app host.   |
| `shiny-axi setup hooks`        | Install optional SessionStart hooks for Claude Code and OpenCode.   |

---

## Development

```sh
pnpm run check          # Run all verification checks (lint, typecheck, tests)
pnpm run build          # Bundle the CLI and build artifacts
pnpm run build:skill    # Regenerate skills/shiny-axi/SKILL.md
pnpm test               # Run tests
pnpm run lint           # Run ESLint
pnpm run format:check   # Prettier check
pnpm run typecheck      # tsc typecheck js files
```

## Privacy and sharing

shiny-axi runs locally and does not include product telemetry. `shiny-axi share` is optional: it uploads the selected artifact to the third-party [ht-ml.app](https://ht-ml.app) service. Shared pages are public by default; use `--password` for password protection and never publish secrets.

## Contributing

Please read [CONTRIBUTING.md](https://github.com/freestatman/shiny-axi/blob/main/CONTRIBUTING.md). Contributions follow the AXI community's no-mistakes workflow and require conventional commit messages so release-please can generate release notes.
