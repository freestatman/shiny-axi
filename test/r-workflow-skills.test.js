import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readWorkflowSkills() {
  return Promise.all([
    readFile(new URL("../skills/shiny/SKILL.md", import.meta.url), "utf8"),
    readFile(new URL("../skills/quarto/SKILL.md", import.meta.url), "utf8"),
  ]);
}

test("R workflow skills guide agents through layout-warning feedback and safe poll recovery", async () => {
  const [shiny, quarto] = await readWorkflowSkills();

  for (const skill of [shiny, quarto]) {
    assert.match(skill, /layout_warnings/);
    assert.match(skill, /next_step/);
    assert.match(skill, /re-run it|re-run the poll|re-run safely/i);
  }
});

test("Quarto skill distinguishes static documents from Quarto Shiny documents", async () => {
  const [, quarto] = await readWorkflowSkills();

  assert.match(quarto, /server:\s*shiny/);
  assert.match(quarto, /quarto render/);
  assert.match(quarto, /quarto serve/);
  assert.match(quarto, /restart.*serve|serve.*restart/i);
});

test("Shiny skill treats DOM-to-R mapping as an evidence-based search across modern app structures", async () => {
  const [shiny] = await readWorkflowSkills();

  assert.match(shiny, /evidence|clue/i);
  assert.match(shiny, /Search.*source|search.*source/i);
  assert.match(shiny, /module/i);
  assert.match(shiny, /bslib/i);
  assert.doesNotMatch(shiny, /directly maps to the input ID/i);
});

test("Shiny skill puts a native-control fast path before advanced DOM-to-R fallback guidance", async () => {
  const [shiny] = await readWorkflowSkills();

  const fastPath = shiny.indexOf("## Fast path: native Shiny controls");
  const fallback = shiny.indexOf("## Fallback: modules, bslib, and custom UI");

  assert.ok(fastPath >= 0, "names the native Shiny fast path");
  assert.ok(fallback > fastPath, "puts advanced guidance after the fast path");
  assert.match(shiny, /\*Input\("id", \.\.\.\)/);
  assert.match(shiny, /\*Output\("id"\)/);
  assert.match(shiny, /observeEvent\(input\$id/);
});

test("R workflow skills respect a user-ended review session", async () => {
  const [shiny, quarto] = await readWorkflowSkills();

  for (const skill of [shiny, quarto]) {
    assert.match(skill, /user ended the session/i);
    assert.match(skill, /do not reopen it/i);
    assert.match(skill, /--reopen/);
  }
});
