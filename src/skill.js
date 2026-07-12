import { createHomeOutput } from "./cli.js";
import { PLAYBOOK_ROUTER_HELP } from "./playbooks.js";

// Trigger string Claude Code (and other agents) match against to auto-load the skill.
// Kept terse and outcome-focused so it fires on "about to show something visual" intents.
export const SKILL_DESCRIPTION =
  "Run local visual review loops for R Shiny applications, Quarto documents, and Quarto Shiny apps " +
  "with agent-readable annotations and feedback, using the shiny-axi CLI.";

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function playbookList(playbooks) {
  return playbooks.map((p) => `- \`${p.id}\` - ${p.use_when}`).join("\n");
}

function skillCommandText(text) {
  return text.replaceAll("`shiny-axi", "`npx -y shiny-axi");
}

function rWorkflowRules() {
  return [
    "Choose `shiny` for an R Shiny app directory and `quarto` for a `.qmd`, `.rmd`, or `.md` document. Do not use this skill for a general HTML artifact outside an R workflow; use Lavish AXI instead.",
    "Run `npx -y shiny-axi poll <path>` after opening the R surface. It long-polls for user feedback and browser-reported layout warnings; leave it running and re-run it safely if interrupted.",
    "Run `npx -y shiny-axi end <path>` when review is finished. If the user ends a session in the browser, do not reopen it unless they ask for another review.",
  ];
}

/**
 * Render the installable SKILL.md for the shiny-axi skill. The body mirrors what
 * `shiny-axi` prints with no arguments (minus live session state), while the
 * frontmatter adds discovery metadata for Agent Skills and Hermes Agent.
 *
 * @returns {string} full SKILL.md contents including YAML frontmatter
 */
export function createSkillMarkdown() {
  const home = createHomeOutput({ bin: "shiny-axi", sessions: [], includeSessions: false });

  return `---
name: shiny-axi
description: ${SKILL_DESCRIPTION}
argument-hint: <Shiny app or Quarto document to review>
author: freestatman
metadata:
  hermes:
    tags: [r, shiny, quarto, review]
    category: productivity
---

# Shiny AXI Editor

${skillCommandText(home.description)}

You do not need shiny-axi installed globally - invoke it with \`npx -y shiny-axi shiny <app-dir>\` or \`npx -y shiny-axi quarto <file.qmd>\`.
If shiny-axi output shows a follow-up command starting with \`shiny-axi\`, run it as \`npx -y shiny-axi ...\` instead.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked \`/shiny-axi\` explicitly - use it to review the specified R Shiny or Quarto work now.
If it is empty, infer the R surface to review from the conversation.

## When to use

${home.help[home.help.length - 1]}

## Workflow

1. Identify the R surface: use \`npx -y shiny-axi shiny <app-dir>\` for an R Shiny app, or \`npx -y shiny-axi quarto <file.qmd>\` for a Quarto document or Quarto Shiny app.
2. Run the chosen command to open or resume its review session in the browser.
3. Run \`npx -y shiny-axi poll <path>\` to long-poll for the user's annotations, queued prompts, and browser-reported \`layout_warnings\`.
   The poll stays silent until the user acts or the real browser reports fresh layout warnings - leave it running, never kill it.
   If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost.
4. If poll returns \`layout_warnings\`, follow the returned \`next_step\`: fix and re-check fresh error-severity findings, but proceed with a note instead of looping when every current warning is persistent or low-severity.
5. Apply human feedback, then poll again with \`--agent-reply "<message>"\` to reply in the browser and keep the loop going.
6. Run \`npx -y shiny-axi end <path>\` when the review is finished.
7. If the user ends the session from the browser instead, only pass \`--reopen\` when they ask for further review or something genuinely important needs their visual attention. Otherwise deliver remaining updates directly in this conversation.

## Visual guidance

${bullets(home.visual_guidance)}

## Playbooks

Run \`npx -y shiny-axi playbook <id>\` for focused, detailed guidance on any of these.
${PLAYBOOK_ROUTER_HELP}
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; open the diagram playbook and use Mermaid unless SVG is needed for richly annotated nodes.

${playbookList(home.playbooks)}

## Commands & rules

${bullets(rWorkflowRules())}
`;
}
