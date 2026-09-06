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

test("public contribution surfaces route security reports privately and provide a PR checklist", async () => {
  const [security, issueConfig, pullRequestTemplate] = await Promise.all([
    readFile(new URL("../SECURITY.md", import.meta.url), "utf8"),
    readFile(new URL("../.github/ISSUE_TEMPLATE/config.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/pull_request_template.md", import.meta.url), "utf8"),
  ]);

  assert.match(security, /security\/advisories\/new/);
  assert.match(security, /Do not open a public issue/i);
  assert.match(issueConfig, /security\/advisories\/new/);
  assert.match(pullRequestTemplate, /pnpm run check/);
  assert.match(pullRequestTemplate, /CHANGELOG\.md/);
});
