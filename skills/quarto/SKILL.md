---
name: quarto
description: Visually review rendered Quarto documents with shiny-axi and map browser feedback to source. Use when the user asks to inspect, annotate, or iterate on Quarto output.
argument-hint: <document path or visual-review goal>
author: freestatman
metadata:
  hermes:
    tags: [quarto, markdown, qmd, review, interactive, annotation]
    category: productivity
---

# Quarto visual review

Use this skill for an explicit browser-based review of a Quarto document. Do not launch a review only because a user asks to write, edit, render, or debug Quarto source.

Run commands with `npx -y shiny-axi ...`; no global installation is required. Always use the `quarto` command so changes go back to source, never the static HTML command.

## Modes

- **Static document** — the default workflow runs `quarto render` and serves the generated HTML.
- **Quarto Shiny document** — when YAML contains `server: shiny` or `server: { type: shiny }`, Shiny AXI runs `quarto serve` and proxies the live app. Source changes restart the serve process.

## Review loop

1. Confirm Quarto is installed (`quarto --version`), then open the source: `npx -y shiny-axi quarto <file.qmd>`. The command also accepts supported `.rmd` and `.md` inputs. Keep that exact source path for the whole review.
2. Run `npx -y shiny-axi poll <file.qmd>`. It stays silent while waiting; leave it running. If the harness interrupts it, re-run it safely because queued feedback is retained.
3. Read the returned batch:
   - `prompts` contain annotations; text feedback includes selected text and range anchors.
   - `dom_snapshot` provides rendered context.
   - `layout_warnings` report overflow, clipping, or overlap.
   - `next_step` is authoritative for that batch.
4. Handle fresh error-severity `layout_warnings` first. Re-check after a fix; if every remaining warning is persistent or warning-only, continue with a short explanation instead of looping.
5. Locate the owning source with the mapping guidance below and make the smallest relevant source or dependency change.
6. Saving source refreshes the preview: static documents run `quarto render`; Quarto Shiny documents restart `quarto serve`.
7. Reply and wait with `npx -y shiny-axi poll <file.qmd> --agent-reply "<concise update>"`.
8. If poll reports that the user ended the session, stop polling and do not reopen it. Use `--reopen` only when the user explicitly requests another visual review.
9. When review is complete, run `npx -y shiny-axi end <file.qmd>`.

## Mapping DOM Elements to Quarto Source

Treat DOM context as evidence, not a complete source map. Check the selected text, range anchors, IDs, classes, nearby headings, and chunk output together.

| Rendered clue                                       | Source to inspect                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| Title, author, date, navigation, or format behavior | YAML frontmatter                                                          |
| `h1`/`h2` or `level1`/`level2`                      | Markdown headings                                                         |
| `quarto-figure`, `img`, or a caption                | Markdown image, figure options, or the producing code chunk               |
| `table`                                             | Markdown table or a chunk using tools such as `knitr::kable()`            |
| `cell-output-display` or `cell-output-stdout`       | The corresponding named/nearby R, Python, Julia, or Observable code chunk |
| Site chrome or theme classes                        | Project `_quarto.yml`, theme files, extensions, or custom CSS             |

For a text-range annotation, use the selected text plus its common ancestor and boundary context; a container selector alone is not the complete identity.

## Guardrails

- Edit the source document, project configuration, stylesheet, extension, or data dependency—not rendered HTML.
- Preserve executable chunk semantics unless feedback requires an analysis change.
- Use Quarto cross-references for numbered figures and tables rather than hard-coded numbers.
- Do not add `embed-resources: true` unless portability is requested; it can make outputs much larger.
- Do not pass `--timeout-ms` during normal agent use.
