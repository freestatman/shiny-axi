// Trigger string used by skill installers and agent discovery. Keep it specific:
// ordinary R/Quarto coding does not need a browser review session.
export const SKILL_DESCRIPTION =
  "Route visual review of R Shiny and Quarto work through shiny-axi. Use when the user asks to launch, annotate, or visually inspect a Shiny app or rendered Quarto document.";

/**
 * Render the installable router skill. Detailed source-mapping guidance lives in
 * the dedicated `shiny` and `quarto` skills; this skill stays small enough to be
 * useful when installed on its own.
 *
 * @returns {string} full SKILL.md contents including YAML frontmatter
 */
export function createSkillMarkdown() {
  return [
    "---",
    "name: shiny-axi",
    `description: ${SKILL_DESCRIPTION}`,
    "argument-hint: <Shiny app or Quarto document to review>",
    "author: freestatman",
    "metadata:",
    "  hermes:",
    "    tags: [r, shiny, quarto, review]",
    "    category: productivity",
    "---",
    "",
    "# Shiny AXI",
    "",
    "Use Shiny AXI to run a local, human-in-the-loop visual review of an R Shiny app or rendered Quarto document. Do not launch it merely because the user asked to build, edit, or debug R code; use it when visual inspection or browser annotations are part of the request.",
    "",
    "The CLI needs no global install. Run every command as `npx -y shiny-axi ...`.",
    "If shiny-axi output shows a follow-up command starting with `shiny-axi`, run it as `npx -y shiny-axi ...` instead.",
    "",
    "## Request",
    "",
    "$ARGUMENTS",
    "",
    "If this is non-empty, review the named surface now. Otherwise infer the target only when the conversation clearly calls for visual review.",
    "",
    "## Route",
    "",
    "- Choose `shiny` for an R Shiny app directory: `npx -y shiny-axi shiny <app-dir>`.",
    "- Choose `quarto` for a `.qmd`, `.rmd`, or `.md` document: `npx -y shiny-axi quarto <file.qmd>`.",
    "- Do not use this skill for a general HTML artifact outside an R workflow; use Lavish AXI instead.",
    "",
    "Use the same canonical app directory or document path for every command in one session.",
    "",
    "## Review loop",
    "",
    "1. Open or resume the target with the routed command above.",
    "2. Run `npx -y shiny-axi poll <path>`. This is a long poll: silence means it is waiting. Leave it running. If the harness interrupts it, re-run the same command; queued feedback is retained.",
    "3. Treat the response as the contract for that batch:",
    "   - `prompts` are the user's requested changes.",
    "   - `dom_snapshot` and selectors are evidence for locating source, not guaranteed source maps.",
    "   - `layout_warnings` are browser findings; follow `next_step` and fix fresh error-severity warnings before requesting more human review.",
    "4. Make the smallest source change that addresses the feedback, then let live reload or Quarto render refresh the same session.",
    '5. Reply and wait with `npx -y shiny-axi poll <path> --agent-reply "<concise update>"`.',
    "6. Repeat until the user ends the browser session or the review is complete. Then run `npx -y shiny-axi end <path>`.",
    "",
    "## Guardrails",
    "",
    "- Do not pass `--timeout-ms` during normal use; it is a test/debug option.",
    "- If the user ended the browser session, stop polling and do not reopen it. Use `--reopen` only after the user explicitly requests another visual review.",
    "- Do not loop indefinitely on warnings already marked persistent or warning-only; explain them briefly and continue when the cause is not actionable.",
    "- For Shiny, edit the owning R/CSS/JS source rather than generated browser markup. For Quarto, edit the source document or its dependencies rather than rendered HTML.",
    "",
  ].join("\n");
}
