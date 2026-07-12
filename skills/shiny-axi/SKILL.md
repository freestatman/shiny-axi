---
name: shiny-axi
description: Run local visual review loops for R Shiny applications, Quarto documents, and Quarto Shiny apps with agent-readable annotations and feedback, using the shiny-axi CLI.
argument-hint: <Shiny app or Quarto document to review>
author: freestatman
metadata:
  hermes:
    tags: [r, shiny, quarto, review]
    category: productivity
---

# Shiny AXI Editor

Shiny AXI helps agents turn R Shiny applications and Quarto documents into collaborative human review surfaces. Whenever you are about to build, modify, or debug a Shiny app or Quarto report, consider using Shiny AXI. First launch the session, then run `npx -y shiny-axi shiny <app-dir>` or `npx -y shiny-axi quarto <file.qmd>` so the user can visually review it, annotate elements, and send feedback back through `npx -y shiny-axi poll`.

You do not need shiny-axi installed globally - invoke it with `npx -y shiny-axi shiny <app-dir>` or `npx -y shiny-axi quarto <file.qmd>`.
If shiny-axi output shows a follow-up command starting with `shiny-axi`, run it as `npx -y shiny-axi ...` instead.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked `/shiny-axi` explicitly - use it to review the specified R Shiny or Quarto work now.
If it is empty, infer the R surface to review from the conversation.

## When to use

Use shiny-axi for R Shiny applications, Quarto documents, and Quarto Shiny apps that need a local visual review and agent feedback loop. For general HTML artifacts outside an R workflow, use Lavish AXI instead.

## Workflow

1. Identify the R surface: use `npx -y shiny-axi shiny <app-dir>` for an R Shiny app, or `npx -y shiny-axi quarto <file.qmd>` for a Quarto document or Quarto Shiny app.
2. Run the chosen command to open or resume its review session in the browser.
3. Run `npx -y shiny-axi poll <path>` to long-poll for the user's annotations, queued prompts, and browser-reported `layout_warnings`.
   The poll stays silent until the user acts or the real browser reports fresh layout warnings - leave it running, never kill it.
   If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost.
4. If poll returns `layout_warnings`, follow the returned `next_step`: fix and re-check fresh error-severity findings, but proceed with a note instead of looping when every current warning is persistent or low-severity.
5. Apply human feedback, then poll again with `--agent-reply "<message>"` to reply in the browser and keep the loop going.
6. Run `npx -y shiny-axi end <path>` when the review is finished.
7. If the user ends the session from the browser instead, only pass `--reopen` when they ask for further review or something genuinely important needs their visual attention. Otherwise deliver remaining updates directly in this conversation.

## Visual guidance

- Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance
- Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose
- Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view
- Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately
- When the artifact would describe existing or current UI or state, show it instead: capture screenshots of the real pages (run the app read-only if needed) and embed them, rather than explaining the current look in prose; reserve prose for what cannot be shown such as rationale, trade-offs, and open questions

## Playbooks

Run `npx -y shiny-axi playbook <id>` for focused, detailed guidance on any of these.
One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; open the diagram playbook and use Mermaid unless SVG is needed for richly annotated nodes.

- `diagram` - Map relationships, flows, state, and architecture
- `table` - Turn dense records into scan-friendly review surfaces
- `comparison` - Show options, tradeoffs, and current vs target behavior
- `plan` - Explain a product or technical plan before implementation
- `code` - Render source code, code files, patches, PR diffs, and before/after code inside Shiny AXI artifacts
- `input` - Must be used when the agent needs to collect user input on decisions, choices, preferences, triage, scope, or other structured feedback from within the artifact
- `slides` - Create a deliberate presentation when slides are requested

## Commands & rules

- Choose `shiny` for an R Shiny app directory and `quarto` for a `.qmd`, `.rmd`, or `.md` document. Do not use this skill for a general HTML artifact outside an R workflow; use Lavish AXI instead.
- Run `npx -y shiny-axi poll <path>` after opening the R surface. It long-polls for user feedback and browser-reported layout warnings; leave it running and re-run it safely if interrupted.
- Run `npx -y shiny-axi end <path>` when review is finished. If the user ends a session in the browser, do not reopen it unless they ask for another review.
