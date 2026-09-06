<h1 align="center">Shiny AXI</h1>

<p align="center">
  <strong>Point at your running R Shiny app. Give your coding agent feedback it can locate.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/shiny-axi"><img alt="npm version" src="https://img.shields.io/npm/v/shiny-axi?style=flat-square"></a>
  <a href="https://github.com/freestatman/shiny-axi/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/freestatman/shiny-axi/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"></a>
</p>

Shiny AXI connects a person's review of an R Shiny app or rendered Quarto document to a coding agent working on its source. Explore the result, annotate an element or selected text, and send your comments with browser context. The agent edits the R, Quarto, CSS, or JavaScript source; you review the result again.

It is for R developers and analysts who already use a coding agent and need to resolve questions that are easier to show than describe: a crowded plot, an unclear filter label, a misleading table heading, or a report passage that needs revision. A domain expert can review alongside the developer without knowing which source file owns the problem.

**Status:** early-stage, local development tooling. The review loop is implemented; broad app compatibility and repeat-use product fit are still being validated. See [current limits](#current-limits) before using it in an existing workflow.

## A concrete review loop

Imagine a dashboard whose plot becomes crowded after you change a filter:

1. Open the actual app and set the filter to the problematic case.
2. Annotate the plot container: “With species set to versicolor, these labels overlap. Keep all categories visible.”
3. Send the comments. The agent receives the annotation, its element context, and a DOM outline through `poll`.
4. The agent locates the relevant source and edits it. Saving managed app files restarts the app and refreshes the review.
5. Restore the filter setting and check the change. Runtime state is not automatically replayed.

Shiny AXI supplies the review surface and feedback transport. Your existing coding agent does the editing; Shiny AXI does not include or launch an AI model.

## Quick start

You need Node.js 22+, a browser, and a coding agent that can run shell commands. Managed Shiny reviews also need `Rscript` on `PATH`, the R `shiny` package, and the app's own dependencies. Quarto reviews need the [Quarto CLI](https://quarto.org/docs/get-started/) and the document's execution environment.

Install the relevant agent skill:

```sh
# R Shiny apps
npx skills add freestatman/shiny-axi --skill shiny --yes

# Quarto reports and Quarto Shiny documents
npx skills add freestatman/shiny-axi --skill quarto --yes
```

Then ask your agent:

> Open this app in Shiny AXI for a visual review. Let me use the app and annotate it, apply my feedback to the source, and wait for another review.

The CLI runs through `npx`; a global install is optional. To inspect it first:

```sh
npx -y shiny-axi --help
```

### Open an R Shiny app

Run this from a project containing an app directory with `app.R` or `ui.R` and `server.R`:

```sh
npx -y shiny-axi shiny ./my-app
```

Managed mode launches R, proxies the app including its WebSocket connection, and watches source files. Ending the review stops the managed process.

In another terminal, or from the coding agent, wait for feedback using the same path:

```sh
npx -y shiny-axi poll ./my-app
```

After applying a change, the agent can reply in the browser and wait again:

```sh
npx -y shiny-axi poll ./my-app --agent-reply "Updated the plot labels. Please reselect the filter and check them."
```

End the review in the browser or run `npx -y shiny-axi end ./my-app`. The poll waits until feedback or session end; `Ctrl+C` interrupts a manual wait. Unsent browser comments remain queued in that tab. Interrupted delivery has known limitations described below.

### Open a Quarto document

```sh
npx -y shiny-axi quarto ./report.qmd
npx -y shiny-axi poll ./report.qmd
```

Static documents render to HTML. A document with `server: shiny` in YAML uses `quarto serve` for an interactive review. Source changes trigger a new render or restart. `.rmd` and `.md` inputs are also accepted through the Quarto rendering path; this is not a promise of support for every R Markdown runtime or Quarto project configuration.

Runnable sources are included in [examples](examples): an [R Shiny app](examples/example-shiny-app/app.R), a [Quarto report](examples/example-quarto/report.qmd), and a [Quarto Shiny document](examples/example-quarto-shiny/app.qmd).

### Attach to an already running app

```sh
npx -y shiny-axi shiny ./my-app --url http://127.0.0.1:8000
```

This initially connects to an existing local HTTP app without launching R. **Experimental:** the current file watcher can launch a managed replacement after a source edit. Use managed mode for edit-and-review cycles until attached-process ownership is corrected. Authenticated deployments, HTTPS targets, and apps hosted under a URL prefix are not supported contracts for this proxy.

## What reaches the agent

- Your comments, element selectors, nearby text, and element context.
- Selected text with structured range boundaries.
- A depth-limited DOM outline to help locate the reviewed content.
- Browser-detected layout warnings when present.

The canonical app-directory or document path identifies the session. The agent does not need to copy opaque session IDs. It still needs access to the project source and must verify which R function, module, or Quarto chunk owns the target.

## Current limits

- **Review context is not runtime replay.** Shiny inputs, reactive history, data provenance, and R stack traces are not captured as a reproducible state bundle. Include the relevant input settings and steps in your comment. A managed restart may reset them.
- **Plots are not fully described by the DOM.** A plot image or canvas can be annotated as a container, but the DOM outline does not explain its pixels or underlying data. Use your agent's screenshot tools when visual evidence is needed; reference-image attachments are not implemented here.
- **Controls stay usable.** Native inputs and buttons bypass annotation interception. To discuss a control, annotate a nearby container or describe it in the composer.
- **Layout checks are heuristic.** They can flag clipping or overlap and hold the initial view behind a dismissible curtain. They do not validate statistical correctness, reactive behavior, or accessibility compliance.
- **Quarto support currently assumes adjacent HTML output.** Custom output names, output directories, and multi-page sites need further compatibility work.
- **Review transport needs upstream fixes.** Interrupted polls can lose feedback during delivery; many simultaneous review tabs can contend for browser connections. This version does not promise lossless delivery or unrestricted concurrent reviews. The [upstream review](UPSTREAM.md#review-record) tracks the relevant fixes.

## Where it fits

| Your task                                                       | Use                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| Explain a visible issue in an R app or report to a coding agent | Shiny AXI                                              |
| Write or debug R code                                           | Your editor, coding agent, and R/Shiny debugging tools |
| Record repeatable UI regression checks                          | [shinytest2](https://rstudio.github.io/shinytest2/)    |
| Render a report without a feedback loop                         | Quarto directly                                        |
| Deploy an app for other people to use                           | Your Shiny deployment tooling                          |

For general HTML artifacts outside R workflows, use [Lavish AXI](https://github.com/kunchenguid/lavish-axi).

## AXI and upstream

[AXI](https://axi.md) describes agent-friendly interfaces: compact structured output, useful live context, predictable errors, and actionable next steps. Shiny AXI uses `axi-sdk-js` for its CLI and derives its browser review implementation from Kun Chen's [Lavish AXI](https://github.com/kunchenguid/lavish-axi), retaining the MIT license and copyright notice.

The R-specific responsibility here is to connect that review loop to running Shiny processes and Quarto source documents. This is an independently maintained downstream project, not an official Posit product or a claim of complete compatibility with current Lavish releases.

See [VISION.md](VISION.md) for the proposed contribution boundaries, [the product-fit assessment](docs/product-fit-2026-09-06.md) for evidence and validation criteria, and [UPSTREAM.md](https://github.com/freestatman/shiny-axi/blob/main/UPSTREAM.md) for the selective integration policy.

## Other commands

Run `npx -y shiny-axi <command> --help` for options.

| Command                        | Purpose                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `shiny-axi`                    | Show sessions and agent guidance.                              |
| `shiny-axi end <path>`         | End one review session.                                        |
| `shiny-axi stop`               | Stop the background review server.                             |
| `shiny-axi <file.html>`        | Review a static HTML artifact associated with your R workflow. |
| `shiny-axi export <file.html>` | Inline supported local assets into a portable HTML file.       |
| `shiny-axi share <file.html>`  | Upload an HTML artifact to the third-party ht-ml.app service.  |
| `shiny-axi setup hooks`        | Install optional session-start context for supported agents.   |

Export and share operate on HTML artifacts; they do not package a live Shiny server or deploy its R environment.

## Privacy and security

The review server binds to `127.0.0.1` by default and includes no product telemetry. It executes R and Quarto code with your local permissions. Review trusted projects only. Browser context and comments returned to your coding agent are subject to that agent provider's data handling; “local” does not mean data cannot leave through the agent, app, or external page assets.

The server is unauthenticated. Do not expose it to untrusted networks using `SHINY_AXI_HOST`. Localhost hardening from newer upstream versions is still pending; see [UPSTREAM.md](UPSTREAM.md).

`share` is opt-in and uploads to [ht-ml.app](https://ht-ml.app); shares are public unless password protection is selected. Keep sensitive data out of published artifacts. See [SECURITY.md](SECURITY.md).

## Development

```sh
pnpm install --frozen-lockfile
pnpm run check
```

The check builds, lints, checks formatting and JavaScript types, runs tests, and verifies generated skill freshness. Read [CONTRIBUTING.md](https://github.com/freestatman/shiny-axi/blob/main/CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md) before contributing. Release-please owns `CHANGELOG.md` and `.release-please-manifest.json`.
