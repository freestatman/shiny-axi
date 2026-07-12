import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("issue forms route R-specific and upstream-core proposals to their governance labels", async () => {
  const [rSpecific, upstreamCore] = await Promise.all([
    readFile(new URL("../.github/ISSUE_TEMPLATE/r_specific.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/ISSUE_TEMPLATE/upstream_core.yml", import.meta.url), "utf8"),
  ]);

  assert.match(rSpecific, /labels: \["R-specific"\]/);
  assert.match(rSpecific, /R Shiny|Quarto/);
  assert.match(rSpecific, /id: r_surface/);
  assert.match(upstreamCore, /labels: \["upstream-core"\]/);
  assert.match(upstreamCore, /generic/i);
  assert.match(upstreamCore, /id: upstream_discussion/);
});
