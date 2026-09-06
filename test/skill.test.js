import assert from "node:assert/strict";
import test from "node:test";

import { SKILL_DESCRIPTION, createSkillMarkdown } from "../src/skill.js";

test("createSkillMarkdown emits valid frontmatter naming the Shiny AXI skill", () => {
  const md = createSkillMarkdown();
  assert.ok(md.startsWith("---\n"), "starts with frontmatter fence");
  const end = md.indexOf("\n---\n", 4);
  assert.ok(end > 0, "frontmatter is closed");
  const frontmatter = md.slice(4, end);
  assert.match(frontmatter, /^name: shiny-axi$/m);
  assert.match(frontmatter, /^description: /m);
  assert.match(frontmatter, /^argument-hint: /m);
  assert.ok(frontmatter.includes(SKILL_DESCRIPTION), "frontmatter carries the skill description");
  assert.match(SKILL_DESCRIPTION, /R Shiny/i);
  assert.match(SKILL_DESCRIPTION, /Quarto/i);
  assert.match(SKILL_DESCRIPTION, /visual/i);
  assert.match(SKILL_DESCRIPTION, /Use when/i);
  assert.ok(SKILL_DESCRIPTION.length <= 200, "description remains concise for skill discovery");
  assert.doesNotMatch(SKILL_DESCRIPTION, /plan, comparison, diagram/i);
});

test("createSkillMarkdown emits Hermes Agent metadata in frontmatter", () => {
  const md = createSkillMarkdown();
  const frontmatter = md.slice(4, md.indexOf("\n---\n", 4));

  assert.match(frontmatter, /^author: freestatman$/m);
  assert.match(frontmatter, /^metadata:\n {2}hermes:\n {4}tags: \[[^\]]+\]\n {4}category: \S+$/m);
  assert.match(frontmatter, /^ {4}tags: \[r, shiny, quarto, review\]$/m);
  assert.doesNotMatch(frontmatter, /tags: \[html,/);
  assert.doesNotMatch(frontmatter, /^version:/m, "version is omitted to avoid release churn");
});

test("createSkillMarkdown handles explicit /shiny-axi invocation arguments", () => {
  const md = createSkillMarkdown();
  const body = md.slice(md.indexOf("\n---\n", 4) + 5);

  assert.ok(body.includes("$ARGUMENTS"), "body consumes slash-command arguments");
  assert.match(body, /empty/i, "explains the model-invoked case where no arguments are passed");
});

test("createSkillMarkdown routes its default workflow through the R commands", () => {
  const md = createSkillMarkdown();

  assert.match(md, /npx -y shiny-axi shiny <app-dir>/);
  assert.match(md, /npx -y shiny-axi quarto <file\.qmd>/);
  assert.doesNotMatch(md, /1\. Create the HTML artifact/);
});

test("createSkillMarkdown stays focused on the R visual-review loop", () => {
  const md = createSkillMarkdown();

  assert.ok(md.includes("Choose `shiny` for an R Shiny app directory"));
  assert.ok(md.includes("Do not use this skill for a general HTML artifact outside an R workflow"));
  assert.match(md, /Do not launch.*only because.*build|Do not launch.*merely.*build/i);
  assert.doesNotMatch(md, /^## Visual guidance$/m);
  assert.doesNotMatch(md, /^## Playbooks$/m);
  assert.ok(md.length < 4_500, "router skill remains small enough to load cheaply");
});

test("createSkillMarkdown does not leak live session state", () => {
  const md = createSkillMarkdown();
  assert.ok(!md.includes("pending_prompts"), "no session bookkeeping fields");
  assert.ok(!/\/session\/[0-9a-f]{8}/.test(md), "no live session URLs");
});

test("createSkillMarkdown omits setup hooks guidance", () => {
  const md = createSkillMarkdown();
  assert.doesNotMatch(md, /setup hooks/);
});

test("createSkillMarkdown uses non-interactive npx commands", () => {
  const md = createSkillMarkdown();

  assert.match(md, /`npx -y shiny-axi shiny <app-dir>`/);
  assert.match(md, /`npx -y shiny-axi quarto <file\.qmd>`/);
  assert.match(md, /If shiny-axi output shows a follow-up command starting with `shiny-axi`/);
  assert.match(md, /run it as `npx -y shiny-axi/);
  assert.doesNotMatch(md, /`npx shiny-axi/);
  assert.doesNotMatch(md, /Run `shiny-axi/);
});
