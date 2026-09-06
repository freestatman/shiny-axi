<h1 align="center">Shiny AXI</h1>

<p align="center">
  <strong>Point at a running Shiny app or rendered Quarto document, annotate what you see, and send precise browser context back to your coding agent.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/shiny-axi"><img alt="npm version" src="https://img.shields.io/npm/v/shiny-axi?style=flat-square"></a>
  <a href="https://github.com/freestatman/shiny-axi/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/freestatman/shiny-axi/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"></a>
  <img alt="macOS, Linux, and Windows" src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square">
</p>

Shiny AXI is a local-first [Agent eXperience Interface (AXI)](https://axi.md) for R Shiny and Quarto. It gives AI coding agents a structured visual-review loop instead of making people describe UI problems from memory or paste screenshots into chat.

- Run and proxy real Shiny and Quarto Shiny applications, including WebSockets.
- Render static Quarto documents and refresh them when source changes.
- Return element annotations, selected text ranges, DOM context, and browser-detected layout warnings through a token-efficient CLI poll.

## Quick start

### Prerequisites

- Node.js 22 or newer.
- For managed Shiny apps: R with the `shiny` package installed.
- For Quarto documents: the [Quarto CLI](https://quarto.org/docs/get-started/).

The CLI can run directly from npm; a global install is not required.

```sh
npx -y shiny-axi --help
```

Install the focused agent skill you need with the open [`skills` CLI](https://github.com/vercel-labs/skills):

```sh
# Shiny apps
npx skills add freestatman/shiny-axi --skill shiny --yes

# Quarto and Quarto Shiny documents
npx skills add freestatman/shiny-axi --skill quarto --yes
```

Then ask your agent for an explicit visual review, for example:

> Open this Shiny app in Shiny AXI, let me annotate it, and apply my feedback.

To run the loop manually:

```sh
# Terminal 1: open a managed Shiny app
npx -y shiny-axi shiny ./my-app

# Or open a Quarto source document
npx -y shiny-axi quarto ./report.qmd

# Terminal 2: wait for annotations for the same path
npx -y shiny-axi poll ./my-app
```

Use `Ctrl+C` to interrupt a manual poll. Feedback already queued in the browser is retained, so the same poll command can be run again safely.

## How it works

1. The CLI starts a loopback-only review server and, in managed mode, launches R or Quarto.
2. A browser chrome displays the real app or rendered document in a sandboxed frame.
3. The reviewer clicks an element or selects text, adds a comment, and sends the batch.
4. `shiny-axi poll <path>` returns the feedback and DOM context to the agent.
5. Source changes restart or re-render the target and refresh the same browser session.

The canonical file or app-directory path is the session identity; opaque session IDs do not need to be copied between commands.

## Shiny modes

### Managed mode

```sh
npx -y shiny-axi shiny ./my-app
```

Shiny AXI checks the R environment, chooses a free local port, launches the app, and stops the managed process when the review ends.

### Attached mode

```sh
npx -y shiny-axi shiny ./my-app --url http://127.0.0.1:8000
```

Use attached mode when RStudio or another tool already owns the Shiny process. Shiny AXI proxies the supplied URL without starting or stopping it.

## Quarto modes

- Static `.qmd`, `.rmd`, and `.md` inputs are rendered to HTML with `quarto render` and re-rendered when project files change.
- A document with `server: shiny` in YAML is served with `quarto serve`; its process restarts when source changes.

## CLI reference

| Command                        | Purpose                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| `shiny-axi`                    | Show active sessions and concise usage guidance.                    |
| `shiny-axi shiny [app-dir]`    | Open or resume a managed or attached Shiny review.                  |
| `shiny-axi quarto <file>`      | Open or resume a Quarto or Quarto Shiny review.                     |
| `shiny-axi poll <path>`        | Wait for feedback or browser-reported layout warnings.              |
| `shiny-axi end <path>`         | End one review session.                                             |
| `shiny-axi stop`               | Stop the background review server.                                  |
| `shiny-axi <file.html>`        | Compatibility mode for a static HTML artifact.                      |
| `shiny-axi export <file.html>` | Write a portable HTML export with supported local assets inlined.   |
| `shiny-axi share <file.html>`  | Publish an optional self-contained artifact through `ht-ml.app`.    |
| `shiny-axi setup hooks`        | Install optional session-start context for supported coding agents. |

Run `npx -y shiny-axi <command> --help` for command-specific options.

## Privacy and security

The server binds to `127.0.0.1` by default and the project does not include product telemetry. Shiny and Quarto code still runs with your local user permissions, so review untrusted projects before launching them.

Setting `SHINY_AXI_HOST` to a wildcard or LAN address exposes an unauthenticated server that can serve local project files. Use non-loopback binding only on a trusted network.

`shiny-axi share` is opt-in and uploads a self-contained artifact to the third-party [ht-ml.app](https://ht-ml.app) service. Shares are public unless password protection is selected. Never publish secrets or sensitive data. See [SECURITY.md](SECURITY.md) for reporting and support details.

## Why this exists

A working Shiny app or Quarto report is more than source text. Its quality lives in reactive behavior, plots, tables, layout, and the reading experience after render. Those details are hard to communicate with comments such as “the filter feels wrong” or “this chart is crowded.”

Shiny AXI keeps the application and data local while giving a developer, analyst, or domain expert a concrete review surface. The human retains responsibility for statistical intent, domain language, data sensitivity, and deployment decisions; the agent gets better evidence for targeted changes.

## Project scope and attribution

Shiny AXI is an R-first downstream project derived from [Lavish AXI](https://github.com/kunchenguid/lavish-axi) by Kun Chen. The upstream copyright and MIT license are retained. Shiny/Quarto process management, proxying, workflow skills, and R-specific documentation are maintained here.

For general HTML artifacts outside R workflows, use [Lavish AXI](https://github.com/kunchenguid/lavish-axi). For the source boundary and selective-sync policy, see [UPSTREAM.md](https://github.com/freestatman/shiny-axi/blob/main/UPSTREAM.md).

## Development

```sh
pnpm install --frozen-lockfile
pnpm run check
```

`pnpm run check` builds the package, lints and formats, type-checks JavaScript, runs the test suite, and verifies that the generated `skills/shiny-axi/SKILL.md` is current.

Contributions are welcome. Read [CONTRIBUTING.md](https://github.com/freestatman/shiny-axi/blob/main/CONTRIBUTING.md), the [code of conduct](CODE_OF_CONDUCT.md), and the [security policy](SECURITY.md) before opening a change. Do not hand-edit `CHANGELOG.md` or `.release-please-manifest.json`; release-please owns them.
