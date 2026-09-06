import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("documents the R-first downstream boundary and upstream sync policy", async () => {
  const [readme, upstream, contributing] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../UPSTREAM.md", import.meta.url), "utf8"),
    readFile(new URL("../CONTRIBUTING.md", import.meta.url), "utf8"),
  ]);

  assert.match(readme, /For general HTML artifacts outside R workflows, use \[Lavish AXI\]/);
  assert.match(readme, /\[UPSTREAM\.md\]\(https:\/\/github\.com\/freestatman\/shiny-axi\/blob\/main\/UPSTREAM\.md\)/);
  assert.match(
    readme,
    /\[CONTRIBUTING\.md\]\(https:\/\/github\.com\/freestatman\/shiny-axi\/blob\/main\/CONTRIBUTING\.md\)/,
  );
  assert.match(upstream, /kunchenguid\/lavish-axi/);
  assert.match(upstream, /c7808ceb19935a018b8cbeab0f32582fd0d736d6/);
  assert.doesNotMatch(upstream, /Initial source baseline: Lavish AXI `v0\.1\.31`/);
  assert.match(upstream, /R Shiny|Quarto/);
  assert.match(upstream, /selective|Selectively/i);
  assert.match(upstream, /monthly|release/i);
  assert.match(contributing, /upstream-core/);
  assert.match(contributing, /R-specific/i);
});
