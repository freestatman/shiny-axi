---
name: shiny
description: Launch a Shiny app from the project folder and use shiny-axi to interactively review and annotate Shiny app components.
argument-hint: <what part of the Shiny app to review or modify>
author: freestatman
metadata:
  hermes:
    tags: [r, shiny, review, interactive, annotation]
    category: productivity
---

# Shiny AXI

Shiny AXI helps agents interactively review and iterate on R Shiny applications. By launching a local Shiny app and proxying it, the user can visually annotate elements and send feedback directly to the agent. The agent then modifies the R source code (`app.R`, `ui.R`, `server.R`) to update the app.

You do not need shiny-axi installed globally - invoke it with `npx -y shiny-axi shiny <app-dir>`.
If shiny-axi output shows a follow-up command starting with `shiny-axi`, run it as `npx -y shiny-axi ...` instead.

**Important**: Do NOT use the regular visual review skill for Shiny apps. Always use `shiny-axi shiny`, never `shiny-axi <file.html>` or `shiny-axi design`. The static visual review skill creates static HTML artifacts; `shiny` proxies a live running Shiny app.

## When to use

Use this skill when:

- The user asks to build, modify, or debug an R Shiny application.
- The user wants to visually review and annotate layout, styling, inputs, or outputs of a Shiny app.
- The user has already launched a Shiny app (e.g., from RStudio or via `Rscript`) and wants to annotate it.

## Workflow

There are two modes. Choose based on whether the Shiny app is already running:

### Attached mode (app already running)

Use this when the user says the app is already running on a URL (e.g., `http://127.0.0.1:8080`). No R environment check is needed.

1. **Launch Shiny session**: Run `npx -y shiny-axi shiny <app-dir> --url <url>` where `<app-dir>` is the project directory containing the R source files and `<url>` is the running app URL.
2. **Poll for feedback**: Run `npx -y shiny-axi poll <app-dir>`. It stays silent while waiting for annotations or browser-reported `layout_warnings` - leave it running. If the harness interrupts or times out the poll, re-run it safely; queued feedback is retained.
3. Continue from step 4 below.

### Managed mode (agent launches the app)

Use this when the user does not have a running Shiny app. The CLI will spawn and manage the R process.

1. **Verify R environment**: Confirm R and the `shiny` package are installed.
2. **Launch Shiny app in Shiny AXI**: Run `npx -y shiny-axi shiny <app-dir>`.
3. **Poll for feedback**: Run `npx -y shiny-axi poll <app-dir>`. It stays silent while waiting for annotations or browser-reported `layout_warnings` - leave it running. If the harness interrupts or times out the poll, re-run it safely; queued feedback is retained.
4. Continue from step 4 below.

### Common steps (both modes)

4. **Receive feedback**: When the user acts or the browser finds a layout issue, the poll can return:
   - `prompts`: User annotations with element selectors, tags, and comments.
   - `dom_snapshot`: A snapshot of the app's DOM tree at the time of annotation.
   - `layout_warnings`: Browser-detected overflow, clipping, or overlap findings.
   - `next_step`: The authoritative instruction for the returned feedback batch.
5. **Handle layout warnings first**: Follow `next_step`. Fix and re-check fresh error-severity `layout_warnings` before asking the user for more review. If every warning is persistent or low-severity, it is acceptable to continue with a short note rather than loop indefinitely.
6. **Apply code modifications**: Locate the corresponding R components in the code and edit them:
   - Output annotations (e.g. `plotOutput("myPlot")` / `renderPlot()`)
   - Input annotations (e.g. `sliderInput("range")`)
   - Layout elements (e.g. `sidebarPanel()`, `tabsetPanel()`)
7. **Live reload**: Saving changes to `.R`, `.css`, or `.js` files will automatically reload the app in the user's browser.
8. **Reply & Wait**: Run `npx -y shiny-axi poll <app-dir> --agent-reply "Applied the changes!"` to show your message in the browser and wait for further annotations.
9. **Respect session end**: If poll reports the user ended the session, stop polling and do not reopen it. Use `--reopen` only when the user requests another review or something important needs fresh visual confirmation.
10. **End session**: Run `npx -y shiny-axi end <app-dir>` when the review session is complete.

## Mapping DOM Elements to R Source

Use the native Shiny fast path first. It covers most apps and gives a weaker model a direct place to search. Only use the fallback when the fast path does not identify one clear source location.

## Fast path: native Shiny controls

| Browser clue                                                                                                         | Search the source first                                                                     | Then verify                                                              |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| An `<input>`, `<select>`, or `<textarea>` with `id="id"`                                                             | `*Input("id", ...)` in UI; `update*Input("id", ...)` in server code                         | The label, choices, value, and nearby layout match the annotated control |
| An element with `shiny-plot-output`, `shiny-text-output`, `shiny-html-output`, or `shiny-bound-output` and `id="id"` | `*Output("id")` in UI and `output$id <- render*()` in server code                           | The output type and surrounding title/section match the annotated result |
| A clickable element with `id="id"`, especially a button                                                              | `actionButton("id", ...)`, `observeEvent(input$id, ...)`, or `eventReactive(input$id, ...)` | The observer or reactive event performs the visible action               |
| A label, heading, table, or plot without an obvious ID                                                               | The exact visible text, then the closest section title or output ID                         | The source appears in the same UI subtree or code chunk that renders it  |

For this fast path, search all R files—not only `app.R`: common layouts split UI and server across `ui.R`, `server.R`, modules, and helper files. Make the smallest change to the matching UI, server, CSS, or JS source, then use live reload to confirm that the original annotated element changed.

## Fallback: modules, bslib, and custom UI

Treat the DOM snapshot as evidence, not as a complete source map. IDs, element types, classes, nearby text, and the user's annotation are clues that must be verified against the project source.

1. **Account for modules and namespaces**: A browser ID may be namespaced (for example, `sales-range`). Search for the local control ID (`range`), `NS("sales")`, `moduleServer("sales", ...)`, and the module UI/server pair before changing code. Do not assume the complete browser ID appears verbatim in one file.
2. **Identify the rendering layer**: For layout or styling feedback, inspect the closest meaningful DOM ancestor, then trace its classes, IDs, and text to R UI, `bslib` page/sidebar/card components, `www/` CSS, HTML templates, or JavaScript. Bootstrap-like classes such as `row` and `container-fluid` can be useful clues, but bslib and custom components often render different markup.
3. **Make and verify a small change**: After locating the most likely source, change the smallest relevant UI, server, CSS, or JS unit. Let live reload refresh the app and confirm the original annotated element—not merely a similar-looking element—changed as intended.

## R Shiny Guidelines

- **Separate UI and Server**: Keep layout and styling declarations in the UI portion/file, and reactive computations, data processing, and rendering in the Server portion/file.
- **Reactivity Best Practices**: Avoid placing heavy computations directly inside render functions without `reactive()` or `eventReactive()`.
- **CSS and styling**: Place custom CSS under `www/` folder (e.g. `www/custom.css`) and reference it using `tags$head(tags$link(rel = "stylesheet", type = "text/css", href = "custom.css"))`.
