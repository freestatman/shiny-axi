---
name: shiny
description: Visually review an R Shiny app with shiny-axi and map browser feedback to R source. Use when the user asks to inspect, annotate, or iterate on a running Shiny UI.
argument-hint: <app directory or visual-review goal>
author: freestatman
metadata:
  hermes:
    tags: [r, shiny, review, interactive, annotation]
    category: productivity
---

# Shiny visual review

Use this skill for an explicit browser-based review of an R Shiny application. Do not launch a review only because a user asks to build, edit, or debug Shiny code.

Run commands with `npx -y shiny-axi ...`; no global installation is required. Always use the `shiny` command for a live app, never the static HTML command or `shiny-axi design`.

## Modes

- **Managed mode** (default) — launches and owns the R process. Confirm `Rscript` and the `shiny` package are available, then run `npx -y shiny-axi shiny <app-dir>`.
- **Attached mode** — proxies an already running app. Skip the R check and run `npx -y shiny-axi shiny <app-dir> --url <url>`.

Use the project directory containing `app.R` or `ui.R`/`server.R` as `<app-dir>`. Keep that exact path for the whole review.

## Review loop

1. Open or resume the session using the appropriate mode above.
2. Run `npx -y shiny-axi poll <app-dir>`. It stays silent while waiting; leave it running. If the harness interrupts it, re-run it safely because queued feedback is retained.
3. Read the returned batch:
   - `prompts` contain user annotations and comments.
   - `dom_snapshot` provides browser context.
   - `layout_warnings` report overflow, clipping, or overlap.
   - `next_step` is authoritative for that batch.
4. Handle fresh error-severity `layout_warnings` first. Re-check after a fix; if every remaining warning is persistent or warning-only, continue with a short explanation instead of looping.
5. Locate the owning source with the mapping guidance below and make the smallest relevant R, CSS, or JavaScript change.
6. Saving project files restarts the managed app and refreshes the review. Confirm the original target changed.
7. Reply and wait with `npx -y shiny-axi poll <app-dir> --agent-reply "<concise update>"`.
8. If poll reports that the user ended the session, stop polling and do not reopen it. Use `--reopen` only when the user explicitly requests another visual review.
9. When review is complete, run `npx -y shiny-axi end <app-dir>`.

## Mapping DOM Elements to R Source

Treat the DOM snapshot as evidence, not a complete source map. Use the native Shiny fast path first; use the fallback for modules, `bslib`, or custom UI.

## Fast path: native Shiny controls

| Browser clue                                                                                                         | Search the source first                                                                     | Then verify                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| An `<input>`, `<select>`, or `<textarea>` with `id="id"`                                                             | `*Input("id", ...)` in UI; `update*Input("id", ...)` in server code                         | Label, choices, value, and nearby layout match the control    |
| An element with `shiny-plot-output`, `shiny-text-output`, `shiny-html-output`, or `shiny-bound-output` and `id="id"` | `*Output("id")` in UI and `output$id <- render*()` in server code                           | Output type and surrounding section match the rendered result |
| A clickable element with `id="id"`, especially a button                                                              | `actionButton("id", ...)`, `observeEvent(input$id, ...)`, or `eventReactive(input$id, ...)` | Observer or reactive event performs the visible action        |
| A label, heading, table, or plot without an obvious ID                                                               | Exact visible text, then the closest section title or output ID                             | Source appears in the same UI subtree or rendering code       |

Search all R files, not only `app.R`; apps commonly split UI, server, modules, and helpers.

## Fallback: modules, bslib, and custom UI

Treat the DOM snapshot as evidence, not a complete source map. Verify IDs, classes, nearby text, and the user's annotation against project source.

1. **Resolve namespaces.** A browser ID such as `sales-range` may come from local ID `range`. Search for the local ID, `NS("sales")`, `moduleServer("sales", ...)`, and the module UI/server pair.
2. **Find the rendering layer.** Trace the closest meaningful ancestor to R UI, `bslib` page/sidebar/card components, `www/` styles, an HTML template, or JavaScript.
3. **Verify the exact target.** Change one likely source unit, wait for reload, and confirm the annotated element—not merely a similar element—changed as intended.

## Guardrails

- Do not edit generated or proxied HTML.
- Do not infer a source location from a selector alone.
- Keep layout/styling changes in UI, CSS, or JS and reactive computation changes in server code.
- Do not pass `--timeout-ms` during normal agent use.
