import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AxiError, installSessionStartHooks, RESERVED_COMMANDS, runAxiCli } from "axi-sdk-js";

import { createDesignOutput, DESIGN_SYSTEM_HINT } from "./design-reference.js";
import {
  buildSelfContainedHtml,
  exportFileName,
  exportWarningSummaries,
  splitExportWarnings,
} from "./export-bundle.js";
import { publishToHtmlApp } from "./html-app.js";
import { clientHost, defaultPort, ensureStateDir, hostForUrl, serverLogFile, stateFile } from "./paths.js";
import { findPlaybook, listPlaybooks, playbookIds, PLAYBOOK_ROUTER_HELP } from "./playbooks.js";
import { resolveDesignAssetPath, serve } from "./server.js";
import { canonicalFile, sessionKey, SessionStore } from "./session-store.js";
import { detectRscript } from "./shiny-process.js";
import { detectQuarto } from "./quarto-process.js";

const COMMANDS = new Set([
  "open",
  "poll",
  "end",
  "stop",
  "server",
  "playbook",
  "design",
  "setup",
  "shiny",
  "quarto",
  "export",
  "share",
]);
// SDK-reserved built-ins (e.g. `update`) must reach runAxiCli untouched; otherwise
// the bare-arg normalization below would rewrite them into the hidden `open` command.
// Our own COMMANDS are also reserved so bare-arg normalization doesn't swallow them.
const RESERVED = new Set([...COMMANDS, ...RESERVED_COMMANDS]);
const DESCRIPTION =
  "Shiny AXI helps agents turn R Shiny applications and Quarto documents into collaborative human review surfaces. Whenever you are about to build, modify, or debug a Shiny app or Quarto report, consider using Shiny AXI. " +
  "First launch the session, then run `shiny-axi shiny <app-dir>` or `shiny-axi quarto <file.qmd>` so the user can visually review it, annotate elements, and send feedback back through `shiny-axi poll`.";
// Inlined at build time from package.json; falls back to reading package.json so source-run tests work.
export const VERSION =
  process.env.SHINY_AXI_BUILD_VERSION ||
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

export async function run(argv) {
  await ensureStateDir();
  const normalizedArgv = normalizeArgv(argv);
  const isTopLevelHelp = argv.length === 1 && argv[0] === "--help";
  await runAxiCli({
    description: DESCRIPTION,
    version: VERSION,
    argv: isTopLevelHelp ? [] : normalizedArgv,
    topLevelHelp: TOP_LEVEL_HELP,
    home: async () =>
      createHomeOutput({
        bin: process.argv[1] || "shiny-axi",
        sessions: isTopLevelHelp ? [] : await visibleSessions(),
        includeSessions: !isTopLevelHelp,
      }),
    commands: {
      open: openCommand,
      poll: pollCommand,
      end: endCommand,
      stop: stopCommand,
      playbook: playbookCommand,
      design: designCommand,
      setup: setupCommand,
      server: serverCommand,
      shiny: shinyCommand,
      quarto: quartoCommand,
      export: exportCommand,
      share: shareCommand,
    },
    getCommandHelp,
  });
}

export function collapseHomeDirectory(file, home) {
  const normalizedFile = file.replaceAll("\\", "/");
  const normalizedHome = home.replaceAll("\\", "/");

  if (normalizedFile === normalizedHome) {
    return "~";
  }
  if (normalizedFile.startsWith(`${normalizedHome}/`)) {
    return `~/${normalizedFile.slice(normalizedHome.length + 1)}`;
  }
  return file;
}

export function normalizeArgv(argv) {
  const first = argv[0];
  if (!first || RESERVED.has(first)) {
    return argv;
  }
  if (first.startsWith("-")) {
    return argv.some((arg) => isHtmlPath(arg)) ? ["open", ...argv] : argv;
  }
  return ["open", ...argv];
}

export function createHomeOutput({ bin, sessions, includeSessions = true }) {
  return {
    bin: collapseHomeDirectory(bin, os.homedir()),
    description: DESCRIPTION,
    ...(includeSessions
      ? {
          sessions: sessions.map((session) => ({
            file: session.file,
            status: session.status,
            url: session.url,
            pending_prompts: session.pending_prompts || 0,
          })),
        }
      : {}),
    visual_guidance: [
      "Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance",
      "Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose",
      "Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view",
      "Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately",
      "When the artifact would describe existing or current UI or state, show it instead: capture screenshots of the real pages (run the app read-only if needed) and embed them, rather than explaining the current look in prose; reserve prose for what cannot be shown such as rationale, trade-offs, and open questions",
    ],
    playbooks: listPlaybooks(),
    help: [
      "Run `shiny-axi <html-file>` to open or resume a Shiny AXI session. If the user explicitly ended the session from the browser, this refuses to reopen it and explains why instead of reopening uninvited - pass `--reopen` only when the user asks for further review or something important needs their visual attention",
      "Unless the user specifies another location, create HTML artifacts in the current working directory under `.shiny-axi/`",
      "Shiny AXI serves the html file through a local express.js server. If your html needs to reference other filesystem assets such as images, CSS, fonts, and local scripts, copy them into the same directory as the HTML file, then reference them with relative paths from that directory. Never prepend `/` to those asset paths - root paths won't work",
      "Run `shiny-axi poll <html-file>` to wait for user feedback or browser-reported layout_warnings. It long-polls and stays silent until the user sends feedback, ends the session, or the real browser reports fresh layout_warnings, so leave it running - never kill it. Fix and re-check fresh error-severity layout_warnings before involving the human; if the poll says every current warning is persistent or low-severity, proceed with a note instead of looping. If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost. When it reports the session ended, stop polling and do not reopen it uninvited - deliver remaining updates in this conversation instead",
      "Run `shiny-axi end <html-file>` to end a session as the agent - ending it this way still allows a plain reopen later. When the user ends it from the browser instead, a later `shiny-axi <html-file>` refuses to reopen it without `--reopen`",
      "Run `shiny-axi export <html-file> [--out <path>]` to write a portable copy of the artifact - one HTML file with its LOCAL assets inlined - so it opens with no Shiny AXI server and no sibling files. Remote CDN/font references are left as links, so it needs network to render those. Users can also export from the browser chrome's overflow menu",
      "Run `shiny-axi share <html-file> [--password <pw>] [--token <t>]` to publish the artifact on ht-ml.app (https://ht-ml.app), a third-party hosting service not part of Shiny AXI, and get back a visitable URL. Shares are PUBLIC by default, so anyone with the link can open them. Pass --password to publish a PRIVATE password-protected page; viewers must supply the password to view. Local assets are inlined; remote refs load over the network. It returns the url plus a secret update_key for managing the page later. Use --token or SHINY_AXI_HTML_APP_TOKEN only when you have an optional bearer token; it is never required. Users can also publish from the browser chrome's overflow menu",
      "Run `shiny-axi stop` to shut down the background server (it also self-stops when idle or after the last session ends with nothing connected)",
      `Run \`shiny-axi playbook <playbook_id>\` for focused artifact guidance. ${PLAYBOOK_ROUTER_HELP}`,
      DESIGN_SYSTEM_HINT,
      "Use shiny-axi for R Shiny applications, Quarto documents, and Quarto Shiny apps that need a local visual review and agent feedback loop. For general HTML artifacts outside an R workflow, use Lavish AXI instead.",
    ],
  };
}

export function createPlaybookOutput(args) {
  const id = args[0];
  if (!id) {
    return {
      playbooks: listPlaybooks(),
      help: ["Run `shiny-axi playbook <playbook_id>` for focused artifact guidance", PLAYBOOK_ROUTER_HELP],
    };
  }

  const playbook = findPlaybook(id);
  if (!playbook) {
    throw new AxiError(`Unknown playbook: ${id}`, "VALIDATION_ERROR", [
      `Run \`shiny-axi playbook\` to list known IDs: ${playbookIds().join(", ")}`,
    ]);
  }

  return { playbook };
}

export function createOpenOutput({ file, url, status }) {
  return {
    session: { file, url, status },
    next_step: `Do not respond to the user just yet. Now you must run \`shiny-axi poll ${file}\`. This command long-polls until the user sends feedback, ends the session, or the real browser reports layout_warnings from the in-iframe layout audit, and it stays silent the whole time - that is normal, never kill it. If layout_warnings arrive, follow the poll response's next_step: fix and re-check fresh error-severity overflow or clipped-text findings before involving the human, but persistent or low-severity warnings may be surfaced with a note when the cause is not obvious. Do not pass --timeout-ms during normal agent use. If your harness limits how long a foreground command may run, run the poll as a background task and wait for it to finish; if the poll still gets killed or times out, just re-run it - queued feedback is never lost. After applying feedback, run \`shiny-axi poll ${file} --agent-reply "<message for the user>"\` without --timeout-ms to show your response in Shiny AXI Editor and wait for more feedback. If the user ends the session, stop polling and do not reopen it by re-running \`shiny-axi ${file}\` unless the user asks for further review or something genuinely important needs their visual attention - deliver routine updates directly in this conversation instead. When reopening is warranted, run \`shiny-axi ${file} --reopen\`.`,
  };
}

export function createUserEndedOpenOutput({ file, url }) {
  return {
    session: { file, url, status: "user-ended" },
    next_step: `The user explicitly ended this Shiny AXI Editor session from the browser, so \`shiny-axi ${file}\` did not reopen it. Do not reopen unless the user asks for further review or something genuinely important needs their visual attention - deliver routine updates directly in this conversation instead. When reopening is warranted, run \`shiny-axi ${file} --reopen\`.`,
  };
}

function createRSessionNextStep(file, command) {
  return `Do not respond to the user just yet. Now you must run \`shiny-axi poll ${file}\`. This command long-polls until the user sends feedback, ends the session, or the real browser reports \`layout_warnings\` from the in-iframe layout audit, and it stays silent the whole time - that is normal, never kill it. If layout_warnings arrive, follow the poll response's next_step: fix and re-check fresh error-severity overflow or clipped-text findings before involving the human, but persistent or low-severity warnings may be surfaced with a note when the cause is not obvious. Do not pass --timeout-ms during normal agent use. If your harness limits how long a foreground command may run, run the poll as a background task and wait for it to finish; if the poll still gets killed or times out, just re-run it - queued feedback is never lost. After applying feedback, run \`shiny-axi poll ${file} --agent-reply "<message for the user>"\` without --timeout-ms to show your response in Shiny AXI Editor and wait for more feedback. If the user ends the session, stop polling and do not reopen it by re-running \`shiny-axi ${command} ${file}\` unless the user asks for further review or something genuinely important needs their visual attention - deliver routine updates directly in this conversation instead. When reopening is warranted, run \`shiny-axi ${command} ${file} --reopen\`.`;
}

export async function shinyCommand(args) {
  const urlArgIndex = args.indexOf("--url");
  const filteredArgs = args.filter((arg, index) => {
    if (arg.startsWith("-")) return false;
    if (urlArgIndex !== -1 && (index === urlArgIndex || index === urlArgIndex + 1)) return false;
    return true;
  });

  const appDir = filteredArgs[0] || ".";
  const absolute = await canonicalFile(appDir);

  const url = flagValue(args, "--url");
  const reopen = args.includes("--reopen");

  // Only check for R/Rscript when we need to spawn a Shiny process (managed mode).
  // When --url is provided the app is already running externally (attached mode).
  if (!url) {
    const rcheck = await detectRscript();
    if (!rcheck.ok) {
      throw new AxiError(`R environment issue: ${rcheck.error || "Rscript not found"}`, "SERVER_ERROR", [
        "Ensure R is installed and Rscript is on your system PATH.",
        "Ensure the R package 'shiny' is installed: Rscript -e \"install.packages('shiny')\"",
      ]);
    }
  }
  const baseUrl = await ensureServer({ forceRestart: shouldForceRestartForLocalBuild(process.argv[1] || "") });

  const response = await postJson(`${baseUrl}/api/shiny-sessions`, {
    appDir: absolute,
    url: url,
    reopen,
  });

  if (response.status === "user-ended") {
    return createUserEndedOpenOutput({ file: absolute, url: response.url });
  }

  if (shouldOpenBrowser(args, process.env)) {
    try {
      const open = (await import("open")).default;
      await open(response.url);
    } catch {
      response.status = "ready";
    }
  }

  return {
    session: { file: absolute, url: response.url, status: response.status || "opened", type: "shiny" },
    next_step: createRSessionNextStep(absolute, "shiny"),
  };
}

export async function quartoCommand(args) {
  const filteredArgs = args.filter((arg) => !arg.startsWith("-"));
  const qmdFile = filteredArgs[0];
  if (!qmdFile) {
    throw new AxiError("Missing QMD file path", "VALIDATION_ERROR", ["Usage: shiny-axi quarto <file.qmd>"]);
  }

  const ext = path.extname(qmdFile).toLowerCase();
  if (ext !== ".qmd" && ext !== ".rmd" && ext !== ".md") {
    throw new AxiError(`Invalid file extension: ${ext}`, "VALIDATION_ERROR", [
      "Quarto command accepts only .qmd, .rmd, or .md files.",
    ]);
  }

  const absolute = await canonicalFile(qmdFile);
  const reopen = args.includes("--reopen");

  const quartoCheck = await detectQuarto();
  if (!quartoCheck.ok) {
    throw new AxiError(`Quarto environment issue: ${quartoCheck.error || "quarto not found"}`, "SERVER_ERROR", [
      "Ensure Quarto is installed and 'quarto' command is on your system PATH.",
      "See https://quarto.org/docs/get-started/ for installation instructions.",
    ]);
  }

  const baseUrl = await ensureServer({ forceRestart: shouldForceRestartForLocalBuild(process.argv[1] || "") });

  const response = await postJson(`${baseUrl}/api/quarto-sessions`, {
    qmdFile: absolute,
    reopen,
  });

  if (response.status === "user-ended") {
    return createUserEndedOpenOutput({ file: absolute, url: response.url });
  }

  if (shouldOpenBrowser(args, process.env)) {
    try {
      const open = (await import("open")).default;
      await open(response.url);
    } catch {
      response.status = "ready";
    }
  }

  return {
    session: {
      file: absolute,
      url: response.url,
      status: response.status || "opened",
      type: response.type || "quarto",
    },
    next_step: createRSessionNextStep(absolute, "quarto"),
  };
}

async function openCommand(args) {
  const file = args.find((arg) => !arg.startsWith("-"));
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `shiny-axi <html-file>`"]);
  }
  await assertHtmlFile(file);
  const absolute = await canonicalFile(file);
  const noGate = args.includes("--no-gate");
  const reopen = args.includes("--reopen");
  const baseUrl = await ensureServer({ forceRestart: shouldForceRestartForLocalBuild(process.argv[1] || "") });
  const response = await postJson(`${baseUrl}/api/sessions`, { file: absolute, noGate, reopen });
  if (response.status === "user-ended") {
    return createUserEndedOpenOutput({ file: absolute, url: response.url });
  }
  if (shouldOpenBrowser(args, process.env)) {
    try {
      const open = (await import("open")).default;
      await open(response.url);
    } catch {
      response.status = "ready";
    }
  }
  return createOpenOutput({ file: absolute, url: response.url, status: response.status || "opened" });
}

export function shouldOpenBrowser(args, env) {
  return !args.includes("--no-open") && env.SHINY_AXI_NO_OPEN !== "1";
}

async function pollCommand(args) {
  const file = args[0];
  if (!file) {
    throw new AxiError("File or directory path is required", "VALIDATION_ERROR", ["Run `shiny-axi poll <path>`"]);
  }
  const absolute = await canonicalFile(file);
  const baseUrl = await ensureServer();
  const agentReply = flagValue(args, "--agent-reply");
  if (agentReply) {
    await postJson(`${baseUrl}/api/${sessionKey(absolute)}/agent-reply`, { text: agentReply });
  }
  const timeoutMs = flagValue(args, "--timeout-ms");
  const timeoutQuery = timeoutMs ? `&timeoutMs=${encodeURIComponent(timeoutMs)}` : "";
  // The indefinite poll looks hung from the agent's side (stdout stays empty until the user
  // acts), so narrate the wait on stderr and leave re-run guidance behind if the agent's
  // harness kills the process anyway. stderr keeps the stdout JSON contract intact.
  const onPollSignal = (signal) => {
    process.stderr.write(`\n${pollInterruptedText(absolute)}\n`);
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  if (!timeoutMs) {
    // Register before the banner write below: a harness that kills the poll as soon as the
    // banner appears can deliver the signal before the next statement runs, and without a
    // handler the default disposition exits silently with no re-run guidance.
    process.on("SIGINT", onPollSignal);
    process.on("SIGTERM", onPollSignal);
  }
  const waitReporter = timeoutMs ? null : startPollWaitReporter({ file: absolute });
  try {
    const response = await fetchJson(`${baseUrl}/api/poll?file=${encodeURIComponent(absolute)}${timeoutQuery}`, {
      retries: 3,
      retryDelayMs: 500,
    });
    return createPollOutput({ file: absolute, response });
  } finally {
    waitReporter?.stop();
    if (!timeoutMs) {
      process.off("SIGINT", onPollSignal);
      process.off("SIGTERM", onPollSignal);
    }
  }
}

export function pollWaitBannerText(file) {
  return (
    `[shiny-axi] Long-polling for user feedback or layout_warnings on ${file}. This stays silent until the user sends feedback, ends the session, or the browser reports fresh layout_warnings - leave it running. ` +
    `If it gets killed or times out, re-run \`shiny-axi poll ${file}\` - queued feedback is never lost.`
  );
}

export function pollWaitTickText(elapsedMs) {
  const minutes = Math.round(elapsedMs / 60_000);
  return `[shiny-axi] Still waiting for user feedback (${minutes}m). Also waiting for fresh layout_warnings. Leave this running until the user acts or the browser reports fresh layout_warnings.`;
}

export function pollInterruptedText(file) {
  return (
    `[shiny-axi] Poll interrupted before user feedback arrived. The user may still be reviewing - ` +
    `re-run \`shiny-axi poll ${file}\` to keep waiting; queued feedback is never lost.`
  );
}

export function startPollWaitReporter({
  file,
  write = (line) => {
    process.stderr.write(line);
  },
  intervalMs = 60_000,
}) {
  write(`${pollWaitBannerText(file)}\n`);
  let elapsedMs = 0;
  const timer = setInterval(() => {
    elapsedMs += intervalMs;
    write(`${pollWaitTickText(elapsedMs)}\n`);
  }, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}

/**
 * @returns {{
 *   session: { file: string, status: string, session_ended?: boolean, ended_by?: string },
 *   next_step?: string,
 *   dom_snapshot?: string,
 *   prompts?: any[],
 *   layout_warnings?: any[],
 * }}
 */
export function createPollOutput({ file, response }) {
  if (response.status === "missing") {
    throw new AxiError("No active Shiny AXI session for this file", "NOT_FOUND", [`Run \`shiny-axi ${file}\` first`]);
  }
  if (response.status === "feedback") {
    const layoutWarnings = Array.isArray(response.layout_warnings) ? response.layout_warnings : [];
    const sessionEnded = Boolean(response.session_ended);
    const endedBy = typeof response.ended_by === "string" ? response.ended_by : undefined;
    return {
      session: {
        file,
        status: "feedback",
        ...(sessionEnded ? { session_ended: true, ...(endedBy ? { ended_by: endedBy } : {}) } : {}),
      },
      dom_snapshot: response.dom_snapshot || "",
      prompts: response.prompts || [],
      ...(layoutWarnings.length > 0 ? { layout_warnings: layoutWarnings } : {}),
      next_step: createFeedbackNextStep(file, layoutWarnings, sessionEnded, endedBy),
    };
  }
  if (response.status === "ended") {
    return {
      session: { file, status: "ended", ...(response.ended_by ? { ended_by: response.ended_by } : {}) },
      next_step: createEndedNextStep(file, response.ended_by),
    };
  }
  return {
    session: { file, status: response.status || "waiting" },
    next_step: `No user feedback arrived before the optional timeout. Run \`shiny-axi poll ${file}\` without --timeout-ms to wait indefinitely - queued feedback is never lost, so re-running the poll is always safe.`,
  };
}

function createFeedbackNextStep(file, layoutWarnings, sessionEnded, endedBy) {
  const count = layoutWarnings.length;
  if (sessionEnded) {
    const layoutNote =
      count > 0 ? `${count} layout warning${count === 1 ? "" : "s"} arrived alongside this final feedback. ` : "";
    if (endedBy === "user") {
      return `${layoutNote}This was the last feedback before the user ended the session. Stop polling ${file} and do not reopen it - deliver any remaining updates directly in this conversation instead. Only run \`shiny-axi ${file} --reopen\` if the user explicitly asks for further review or something genuinely important needs their visual attention.`;
    }
    return `${layoutNote}This was the last feedback before the Shiny AXI session ended. Stop polling ${file}. Deliver any remaining updates directly in this conversation, or run \`shiny-axi ${file}\` to open a fresh session if the user needs further visual review.`;
  }
  const layoutPrefix =
    count > 0 ? layoutWarningsPrefix(file, layoutWarnings) : `Apply the requested changes to ${file}. `;
  return `${layoutPrefix}Do not respond to the user just yet. Now you must run \`shiny-axi poll ${file} --agent-reply "<message for the user>"\` without --timeout-ms unless the user ended the session. The poll waits silently until the user sends more feedback, ends the session, or reports fresh layout_warnings - never kill it. If your harness limits how long a foreground command may run, run the poll as a background task; if it still gets killed or times out, just re-run it - queued feedback is never lost.`;
}

// A finding stays worth a fix-and-recheck loop only while it's both new (not already reported to
// this agent) and error-severity (overflow/clipped content, not the more heuristic overlap
// detector). Once every current finding fails one of those tests - a prior fix attempt didn't
// clear it, or it's a low-severity text-flow finding - looping edits and reloads further is more
// disruptive than useful, so the guidance permits proceeding to the human with a note instead.
function layoutWarningsPrefix(file, layoutWarnings) {
  const count = layoutWarnings.length;
  const plural = count === 1 ? "" : "s";
  const allPersistent = layoutWarnings.every((warning) => warning.persistent);
  const allLowSeverity = layoutWarnings.every((warning) => warning.severity !== "error");
  const allRepeatOrLowSeverity = layoutWarnings.every((warning) => warning.persistent || warning.severity !== "error");

  if (allPersistent) {
    return `${count} layout warning${plural} detected, and every one was already reported in a prior poll and is still unresolved - if you already attempted a fix, it is fine to proceed to the human with a short note about what remains instead of looping further edits and reloads. `;
  }
  if (allLowSeverity) {
    return `${count} low-severity layout warning${plural} detected (no error-severity findings) - fix them if the cause is obvious in ${file}, otherwise it is fine to proceed to the human with a note instead of iterating further. `;
  }
  if (allRepeatOrLowSeverity) {
    return `${count} layout warning${plural} detected, with no fresh error-severity findings - fix any obvious low-severity issue in ${file}, otherwise it is fine to proceed to the human with a note instead of iterating further. `;
  }
  return `${count} layout warning${plural} detected - fix horizontal overflow or clipped text in ${file}, then re-check in the browser before involving the human. Shiny AXI live-reloads the artifact automatically after you save, so you do not need to re-run \`shiny-axi ${file}\` for this. `;
}

function createEndedNextStep(file, endedBy) {
  if (endedBy === "user") {
    return `The user ended this Shiny AXI session. Stop polling ${file} - do not run \`shiny-axi ${file}\` to reopen it. Deliver any remaining updates directly in this conversation instead. Only reopen with \`shiny-axi ${file} --reopen\` if the user explicitly asks for further review or something genuinely important needs their visual attention.`;
  }
  return `This Shiny AXI session for ${file} has ended. Stop polling. Deliver any remaining updates directly in this conversation, or run \`shiny-axi ${file}\` to open a fresh session if the user needs further visual review.`;
}

async function endCommand(args) {
  const file = args[0];
  if (!file) {
    throw new AxiError("File or directory path is required", "VALIDATION_ERROR", ["Run `shiny-axi end <path>`"]);
  }
  const absolute = await canonicalFile(file);
  const baseUrl = await ensureServer();
  const response = await postJson(`${baseUrl}/api/end`, { file: absolute });
  return { session: { file: absolute, status: response.status || "ended" } };
}

// Explicitly shut down the running Shiny AXI server. Unlike `end` (which closes a single
// session), this stops the background process so it stops dangling between sessions.
export async function stopCommand(args) {
  const port = Number(flagValue(args, "--port") || defaultPort());
  const baseUrl = `http://${hostForUrl(clientHost())}:${port}`;
  return shutdownServerOnPort(port, { baseUrl, currentVersion: VERSION });
}

export async function shutdownServerOnPort(
  port,
  {
    baseUrl = `http://${hostForUrl(clientHost())}:${port}`,
    currentVersion = VERSION,
    fetchHealth: healthFetcher = fetchHealth,
    requestShutdown: shutdownRequester = requestShutdown,
    waitForPortFree: portFreeWaiter = waitForPortFree,
    killProcessOnPort: portKiller = killProcessOnPort,
    processMatchesShiny = processOnPortMatchesShiny,
  } = {},
) {
  const health = await healthFetcher(baseUrl);
  if (!health) {
    return { server: { status: "not-running", port } };
  }
  if (!(await canControlServerOnPort(port, health, processMatchesShiny))) {
    return { server: { status: "not-shiny-axi", port } };
  }
  await shutdownRequester(baseUrl);
  let freed = await portFreeWaiter(baseUrl, 3000);
  if (!freed && shouldKillProcessOnPort(currentVersion, health)) {
    portKiller(port);
    freed = await portFreeWaiter(baseUrl, 3000);
  }
  return { server: { status: freed ? "stopped" : "stopping", port } };
}

async function playbookCommand(args) {
  return createPlaybookOutput(args);
}

async function designCommand() {
  return createDesignOutput();
}

async function setupCommand(args) {
  if (args.length !== 1 || args[0] !== "hooks") {
    throw new AxiError("Unknown setup action", "VALIDATION_ERROR", ["Run `shiny-axi setup hooks`"]);
  }

  const errors = [];
  installSessionStartHooks({
    marker: "shiny-axi",
    binaryNames: ["shiny-axi"],
    distEntrypoints: ["dist/cli.mjs", "bin/shiny-axi.js"],
    homeDir: resolveHookHomeDir(),
    onError: (message) => errors.push(message),
  });
  installCopilotCliSessionStartHook({
    hookDir: resolveCopilotHookDir(process.env, resolveHookHomeDir()),
    onError: (message) => errors.push(message),
  });

  if (errors.length > 0) {
    throw new AxiError("Failed to install shiny-axi agent hooks", "SERVER_ERROR", errors);
  }

  return {
    hooks: { status: "installed", integrations: "Claude Code, Codex, OpenCode, GitHub Copilot CLI" },
    help: ["Restart your agent session to receive shiny-axi ambient context"],
  };
}

export function resolveHookHomeDir(env = process.env, fallback = os.homedir()) {
  return env.HOME || fallback;
}

async function serverCommand(args) {
  const port = Number(flagValue(args, "--port") || defaultPort());
  const debug = args.includes("--verbose") || process.env.SHINY_AXI_DEBUG === "1";
  const server = await serve({ port, stateFile: stateFile(), version: VERSION, debug });
  await server.done;
  return "";
}

async function visibleSessions() {
  const store = new SessionStore(stateFile());
  return (await store.listSessions()).filter((session) => session.status !== "ended");
}

async function assertHtmlFile(file) {
  if (!isHtmlPath(file)) {
    throw new AxiError("Shiny AXI Editor expects an HTML file", "VALIDATION_ERROR", ["Run `shiny-axi <html-file>`"]);
  }
  try {
    await access(file);
  } catch {
    throw new AxiError(`File not found: ${file}`, "NOT_FOUND", [
      "Create the HTML artifact first, then run `shiny-axi <html-file>`",
    ]);
  }
}

function isHtmlPath(file) {
  return file.toLowerCase().endsWith(".html") || file.toLowerCase().endsWith(".htm");
}

async function ensureServer({ forceRestart = false } = {}) {
  const port = defaultPort();
  const baseUrl = `http://${hostForUrl(clientHost())}:${port}`;
  const existing = await fetchHealth(baseUrl);
  if (existing && !shouldRestartServer(VERSION, existing, forceRestart)) {
    return baseUrl;
  }
  if (existing) {
    if (!(await canControlServerOnPort(port, existing, processOnPortMatchesShiny))) {
      throw new AxiError(`Port ${port} is occupied by a non-Shiny AXI server`, "SERVER_ERROR", [
        `Stop the process using port ${port}, or set SHINY_AXI_PORT to another port`,
      ]);
    }
    // Stale server from an older release is squatting on the port. Ask it to shut down
    // gracefully so the upgraded client doesn't keep handing users an old chrome.
    await requestShutdown(baseUrl);
    const freed = await waitForPortFree(baseUrl, 2000);
    if (!freed) {
      // Pre-handshake servers (any release older than this change) don't expose /shutdown
      // so the POST 404'd. Fall back to SIGTERM by PID so the very first upgrade still
      // works, then keep waiting.
      if (shouldKillProcessOnPort(VERSION, existing)) {
        killProcessOnPort(port);
        await waitForPortFree(baseUrl, 3000);
      }
    }
  }
  await startServer(port);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const health = await fetchHealth(baseUrl);
    if (health && !shouldRestartServer(VERSION, health)) {
      return baseUrl;
    }
    await delay(100);
  }
  throw new AxiError("Shiny AXI server did not start", "SERVER_ERROR", [
    `Run \`shiny-axi server --port ${port}\` to inspect server startup`,
  ]);
}

// Pure helper so the upgrade-detection logic is unit-testable without spinning up HTTP.
// Returns true when the running server is a different (or pre-handshake) version than
// what this CLI was built with - i.e. the user just upgraded and the stale server needs
// to step aside.
export function shouldRestartServer(currentVersion, healthBody, forceRestart = false) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (forceRestart && healthBody.app === "shiny-axi") return true;
  if (typeof healthBody.version !== "string" || healthBody.version === "") return true;
  return healthBody.version !== currentVersion;
}

export function shouldForceRestartForLocalBuild(executablePath, sourceServerExists = localSourceServerExists()) {
  const localBuildEntry = fileURLToPath(new URL("../dist/cli.mjs", import.meta.url));
  return sourceServerExists && path.resolve(executablePath) === path.resolve(localBuildEntry);
}

function localSourceServerExists() {
  return existsSync(fileURLToPath(new URL("../src/server.js", import.meta.url)));
}

export function shouldKillProcessOnPort(currentVersion, healthBody) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (typeof healthBody.version !== "string" || healthBody.version === "") return true;
  if (healthBody.app !== "shiny-axi") return false;
  return healthBody.version !== currentVersion;
}

async function canControlServerOnPort(port, healthBody, processMatchesShiny) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (healthBody.app === "shiny-axi") return true;
  if (typeof healthBody.version === "string" && healthBody.version !== "") return false;
  return processMatchesShiny(port);
}

async function fetchHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function requestShutdown(baseUrl) {
  try {
    await fetch(`${baseUrl}/shutdown`, { method: "POST" });
  } catch {
    // Best effort. If the server died before answering, the port will free up on its own.
  }
}

async function waitForPortFree(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await fetchHealth(baseUrl))) return true;
    await delay(100);
  }
  return false;
}

// Last-resort fallback for the bootstrap upgrade case: a pre-handshake server is squatting
// on the port and doesn't expose /shutdown, so we resolve its PID via lsof and SIGTERM it.
// macOS/Linux only - Windows users would need to kill manually, but lavish-axi isn't
// shipped for Windows today.
function killProcessOnPort(port) {
  try {
    const result = spawnSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    if (result.status !== 0) return;
    for (const line of result.stdout.split("\n")) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // Process already gone or permission denied - either way nothing we can do.
        }
      }
    }
  } catch {
    // lsof missing or unsupported platform - the outer caller will surface SERVER_ERROR.
  }
}

function processOnPortMatchesShiny(port) {
  try {
    const pids = spawnSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    if (pids.status !== 0) return false;
    for (const line of pids.stdout.split("\n")) {
      const pid = Number(line.trim());
      if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
      const command = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
      if (command.status === 0 && /shiny-axi/.test(command.stdout)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function startServer(port) {
  await ensureStateDir();
  const entry = resolveServerEntry();
  let logFd = null;
  try {
    logFd = openSync(serverLogFile(), "a");
  } catch {
    // If logging cannot be initialized, keep the server behavior unchanged.
  }
  try {
    const child = spawn(process.execPath, [entry, "server", "--port", String(port)], createServerSpawnOptions(logFd));
    child.unref();
  } finally {
    if (logFd !== null) closeSync(logFd);
  }
}

// The detached server child must point at a node-executable entry that actually invokes
// run(). In source layout that's `../bin/shiny-axi.js` (which calls run on import). In the
// published bundle, only `dist/cli.mjs` ships and it self-invokes via the bundled bin
// wrapper. Pick whichever exists.
export function resolveServerEntry() {
  const binEntry = fileURLToPath(new URL("../bin/shiny-axi.js", import.meta.url));
  if (existsSync(binEntry)) return binEntry;
  return fileURLToPath(import.meta.url);
}

/**
 * @param {number | null} logFd
 * @returns {import("node:child_process").SpawnOptions}
 */
export function createServerSpawnOptions(logFd = null) {
  const stdio = /** @type {import("node:child_process").StdioOptions} */ (
    logFd === null ? "ignore" : ["ignore", logFd, logFd]
  );
  return {
    detached: true,
    stdio,
    env: { ...process.env, SHINY_AXI_NO_OPEN: "1" },
  };
}

export async function fetchJson(url, { retries = 0, retryDelayMs = 250 } = {}) {
  let response;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      response = await fetch(url);
      break;
    } catch (error) {
      if (error instanceof AxiError) throw error;
      if (attempt >= retries) throw serverConnectionError();
      await delay(retryDelayMs);
    }
  }

  if (!response) throw serverConnectionError();
  if (!response.ok) {
    throw new AxiError(`Shiny AXI Editor request failed: ${response.status}`, "SERVER_ERROR");
  }
  try {
    return await response.json();
  } catch {
    throw pollResponseInterruptedError();
  }
}

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw serverConnectionError();
  }
  if (!response.ok) {
    throw new AxiError(`Shiny AXI Editor request failed: ${response.status}`, "SERVER_ERROR");
  }
  return response.json();
}

function serverConnectionError() {
  return new AxiError("Shiny AXI Editor server connection failed", "SERVER_ERROR", [
    "Run `shiny-axi server --verbose` or inspect `~/.shiny-axi/server.log` (`SHINY_AXI_STATE_DIR/server.log` when set) for server startup or crash diagnostics",
    "Re-run the last `shiny-axi poll <html-file>` command after the server is healthy",
  ]);
}

function pollResponseInterruptedError() {
  return new AxiError("Shiny AXI Editor poll response was interrupted", "SERVER_ERROR", [
    "Run `shiny-axi server --verbose` or inspect `~/.shiny-axi/server.log` (`SHINY_AXI_STATE_DIR/server.log` when set) for server startup or crash diagnostics",
    "Re-run the last `shiny-axi poll <html-file>` command after the server is healthy",
  ]);
}

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return args[index + 1] || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Produce a portable copy of an artifact: one HTML file with its LOCAL assets (relative-path
// stylesheets, scripts, images, fonts) inlined as data URIs. Remote CDN/font references are left
// as-is for the browser to load, so the export needs network to render those. Shiny AXI makes no
// outbound requests - export is a pure local file transform, server-independent.
async function exportCommand(args) {
  const file = firstPositionalArg(args, ["--out"]);
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `shiny-axi export <html-file>`"]);
  }
  await assertHtmlFile(file);
  const absolute = await canonicalFile(file);
  const root = path.dirname(absolute);
  const output = path.resolve(flagValue(args, "--out") || path.join(root, exportFileName(absolute)));
  const source = await readFile(absolute, "utf8");
  const { html, warnings } = await buildSelfContainedHtml(source, {
    baseDir: root,
    confineDir: root,
    resolveAbsolute: resolveDesignAssetPath,
  });
  await writeFile(output, html);
  return createExportOutput({ source: absolute, output, html, warnings });
}

export function createExportOutput({ source, output, html, warnings }) {
  const allWarnings = Array.isArray(warnings) ? warnings : [];
  const { unresolved, notices } = splitExportWarnings(allWarnings);
  const result = {
    export: {
      source,
      output,
      bytes: Buffer.byteLength(html),
      unresolved_local_assets: unresolved.length,
      notices: notices.length,
    },
  };
  if (allWarnings.length) result.warnings = exportWarningSummaries(allWarnings);
  if (unresolved.length) result.unresolved_local_assets = exportWarningSummaries(unresolved);
  if (notices.length) result.notices = exportWarningSummaries(notices);
  if (unresolved.length) {
    result.next_step =
      "Some LOCAL assets could not be inlined and were left as references (see unresolved_local_assets); they will break once the file is moved. Remote CDN/font references are intentionally left as links and render where there is network access.";
  } else if (notices.length) {
    result.next_step = `Wrote ${output} with export notices (see notices). Open it directly or host it anywhere - it needs no Shiny AXI server. Local assets are inlined; remote CDN/font references are left as links, so it needs network to render those.`;
  } else {
    result.next_step = `Wrote ${output}. Open it directly or host it anywhere - it needs no Shiny AXI server. Local assets are inlined; remote CDN/font references are left as links, so it needs network to render those.`;
  }
  return result;
}

function assetWarningSummaries(warnings) {
  return exportWarningSummaries(warnings);
}

// Publish the artifact as a visitable page on third-party ht-ml.app. Builds the same local-inlined
// HTML as `export` (remote refs left as links), then POSTs it to ht-ml.app's `/v1/sites` API,
// sending the artifact to ht-ml.app's servers. The service is not part of Shiny AXI, needs no
// account or API key, and returns the share URL plus the secret update_key for
// managing the page later. Server-independent.
async function shareCommand(args) {
  const file = firstPositionalArg(args, ["--password", "--token"]);
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `shiny-axi share <html-file>`"]);
  }
  await assertHtmlFile(file);
  const absolute = await canonicalFile(file);
  const password = optionalFlagString(flagValue(args, "--password"));
  const token = optionalFlagString(flagValue(args, "--token"));
  const root = path.dirname(absolute);
  const source = await readFile(absolute, "utf8");
  const { html, warnings } = await buildSelfContainedHtml(source, {
    baseDir: root,
    confineDir: root,
    resolveAbsolute: resolveDesignAssetPath,
  });
  const site = await publishToHtmlApp(html, { password, token });
  return createShareOutput({ source: absolute, site, warnings, passwordProtected: Boolean(password) });
}

export function createShareOutput({ source, site, warnings, passwordProtected = false }) {
  const allWarnings = Array.isArray(warnings) ? warnings : [];
  const { unresolved, notices } = splitExportWarnings(allWarnings);
  const isPasswordProtected = Boolean(passwordProtected);
  const result = {
    share: {
      source,
      url: site.url,
      site_id: site.site_id,
      update_key: site.update_key,
      status: site.status || "active",
      public: !isPasswordProtected,
      visibility: isPasswordProtected ? "private" : "public",
      password_protected: isPasswordProtected,
      unresolved_local_assets: unresolved.length,
      notices: notices.length,
    },
  };
  const passwordNote = isPasswordProtected ? " This page is PASSWORD-PROTECTED; viewers also need the password." : "";
  if (allWarnings.length) result.warnings = exportWarningSummaries(allWarnings);
  if (unresolved.length) result.unresolved_local_assets = assetWarningSummaries(unresolved);
  if (notices.length) result.notices = assetWarningSummaries(notices);
  const noticeNote = notices.length ? " Export notices are available in notices." : "";
  const hostNote =
    "ht-ml.app (https://ht-ml.app), a third-party host not part of Shiny AXI, hosts the page, so it needs no Shiny AXI server.";
  if (unresolved.length) {
    result.next_step =
      `Published ${isPasswordProtected ? "a PASSWORD-PROTECTED page at " : ""}${site.url}, but some LOCAL assets could not be inlined and were left as references (see unresolved_local_assets); inspect the hosted page and fix missing local assets before sharing it.${passwordNote}${noticeNote} ` +
      `Remote CDN/font references are intentionally left as links and render where there is network access. ` +
      `The update_key is a secret shown only once; keep it to update or delete the page later (there is no recovery). ` +
      hostNote;
  } else if (isPasswordProtected) {
    result.next_step =
      `Published a PASSWORD-PROTECTED page: ${site.url} - share this URL with the user and provide the password separately; viewers also need the password. ` +
      `${noticeNote ? `${noticeNote} ` : ""}` +
      `The update_key is a secret shown only once; keep it to update or delete the page later (there is no recovery). ` +
      hostNote;
  } else {
    result.next_step =
      `Published a PUBLIC page that anyone with the link can view: ${site.url} - share this URL with the user. ` +
      `${noticeNote ? `${noticeNote} ` : ""}` +
      `The update_key is a secret shown only once; keep it to update or delete the page later (there is no recovery). ` +
      hostNote;
  }
  return result;
}

export function resolveCopilotHookDir(env = process.env, homeDir = resolveHookHomeDir(env)) {
  return path.join(env.COPILOT_HOME || path.join(homeDir, ".copilot"), "hooks");
}

export function createCopilotCliAmbientContextScript(command = "shiny-axi") {
  return [
    'const { spawnSync } = require("node:child_process");',
    `const command = ${JSON.stringify(command)};`,
    'const result = spawnSync(command, [], { encoding: "utf8", shell: true });',
    'const detail = result.error ? result.error.message : (result.stderr || result.stdout || "exit " + (result.status ?? "unknown"));',
    "const text = String(result.status === 0 ? result.stdout : detail).trim();",
    'if (!text) { console.log("{}"); process.exit(0); }',
    `const prefix = result.status === 0 ? "## AXI ambient context: shiny-axi\\n" : "## AXI ambient context: shiny-axi\\nerror: shiny-axi ambient context failed: ";`,
    "console.log(JSON.stringify({ additionalContext: prefix + text }));",
  ].join(" ");
}

export function createCopilotCliSessionStartHook(command = "shiny-axi", timeoutSec = 10) {
  const script = createCopilotCliAmbientContextScript(command);
  return {
    type: "command",
    bash: `node -e ${quoteForPosixShell(script)}`,
    powershell: `node -e ${quoteForPowerShell(script)}`,
    timeoutSec,
  };
}

export function computeCopilotCliHookUpdate(settings, hook = createCopilotCliSessionStartHook()) {
  const updated = structuredClone(settings && typeof settings === "object" ? settings : {});
  let changed = false;

  if (updated.version !== 1) {
    updated.version = 1;
    changed = true;
  }
  if (!updated.hooks || typeof updated.hooks !== "object" || Array.isArray(updated.hooks)) {
    updated.hooks = {};
    changed = true;
  }

  const current = Array.isArray(updated.hooks.sessionStart) ? updated.hooks.sessionStart : [];
  const unmanaged = current.filter((entry) => !isManagedCopilotCliHook(entry));
  const next = [...unmanaged, hook];

  if (!deepEqual(current, next)) {
    updated.hooks.sessionStart = next;
    changed = true;
  }

  return [changed ? updated : settings, changed];
}

export function installCopilotCliSessionStartHook({
  hookDir = resolveCopilotHookDir(),
  command = "shiny-axi",
  timeoutSec = 10,
  onError = undefined,
} = {}) {
  const target = path.join(hookDir, "shiny-axi.json");
  try {
    mkdirSync(path.dirname(target), { recursive: true });
    const current = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
    const [updated, changed] = computeCopilotCliHookUpdate(
      current,
      createCopilotCliSessionStartHook(command, timeoutSec),
    );
    if (changed) {
      writeFileSync(target, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onError?.(`${target}: ${message}`);
  }
}

function isManagedCopilotCliHook(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    (typeof entry.bash === "string" || typeof entry.powershell === "string" || typeof entry.command === "string") &&
    [entry.bash, entry.powershell, entry.command].some(
      (value) => typeof value === "string" && (value.includes("shiny-axi") || value.includes("lavish-axi")),
    )
  );
}

function quoteForPosixShell(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function quoteForPowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function firstPositionalArg(args, valueFlags = []) {
  const flags = new Set(valueFlags);
  let positionalMode = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!positionalMode && arg === "--") {
      positionalMode = true;
      continue;
    }
    if (!positionalMode && isValueFlagToken(arg, flags)) {
      if (!arg.includes("=")) i += 1;
      continue;
    }
    if (!positionalMode && arg.startsWith("-")) {
      continue;
    }
    return arg;
  }
  return null;
}

function optionalFlagString(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || undefined;
}

function isValueFlagToken(arg, flags) {
  for (const flag of flags) {
    if (arg === flag || arg.startsWith(`${flag}=`)) return true;
  }
  return false;
}

export function getCommandHelp(command) {
  return COMMAND_HELP[command] || null;
}

const TOP_LEVEL_HELP = `shiny-axi - Shiny AXI Editor

Usage:
  shiny-axi
  shiny-axi <html-file> [--no-open] [--no-gate] [--reopen]
  shiny-axi poll <html-file> [--agent-reply "..."]
  shiny-axi end <html-file>
  shiny-axi export <html-file> [--out <path>]
  shiny-axi share <html-file> [--password <pw>] [--token <t>]
  shiny-axi stop
  shiny-axi playbook [playbook_id]
  shiny-axi design
  shiny-axi setup hooks

${DESIGN_SYSTEM_HINT}

Note: poll long-polls indefinitely by default until the user sends feedback, ends the session, or the browser reports fresh layout_warnings, staying silent while it waits - never kill it. Fix and re-check fresh error-severity layout_warnings before involving the human; persistent or low-severity findings may be surfaced with a note when the cause is not obvious. Do not pass --timeout-ms during normal agent use; it is for tests and debugging only. If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost. When the user ends a session from the browser, stop polling and do not reopen it uninvited - pass --reopen to <html-file> only when the user asks for further review or something important needs their visual attention.

`;

const COMMAND_HELP = {
  open: `Usage: shiny-axi <html-file> [--no-open] [--no-gate] [--reopen]

Open or resume a Shiny AXI Editor review session for an HTML artifact. Use --no-open when you need to ensure the server/session exists without opening another browser window. Use --no-gate to skip the open-time layout curtain for this browser open. If the user explicitly ended the session from the browser, this refuses to reopen it and returns guidance instead - pass --reopen to force it open when the user asks for further review or something important needs their visual attention. Sessions ended by the agent (\`shiny-axi end\`) reopen normally without the flag.
`,
  shiny: `Usage: shiny-axi shiny [app-dir] [--url <url>] [--no-open] [--reopen]

Open a Shiny app interactive annotation session. It spawns the R/Shiny process automatically in the background (managed mode), unless --url is provided to proxy an already running Shiny app (attached mode). If the user ended the session from the browser, this refuses to reopen it - pass --reopen to force it open.
`,
  quarto: `Usage: shiny-axi quarto <file.qmd> [--no-open] [--reopen]

Open a Quarto document interactive annotation session. It automatically renders the QMD/RMD/MD file to HTML using 'quarto render' and sets up a session for live-reload. If the user ended the session from the browser, this refuses to reopen it - pass --reopen to force it open.
`,
  poll: `Usage: shiny-axi poll <html-file> [--agent-reply "..."]

This command long-polls indefinitely for queued user prompts and browser-reported layout_warnings, then returns them to the agent. It stays silent while it waits - that is normal, never kill it. Fix and re-check fresh error-severity layout_warnings before involving the human; persistent or low-severity findings may be surfaced with a note when the cause is not obvious. Do not pass --timeout-ms during normal agent use; it is for tests and debugging only. If your harness limits how long a foreground command may run, run the poll as a background task and wait for it to finish; if it still gets killed or times out, just re-run it - queued feedback is never lost. Use --agent-reply after applying prior feedback to display your response in Shiny AXI Editor before waiting again. When status is ended, stop polling and do not reopen the session uninvited - deliver remaining updates directly in this conversation instead.
`,
  end: `Usage: shiny-axi end <html-file>

End a Shiny AXI Editor session as the agent. A session ended this way still reopens normally on the next \`shiny-axi <html-file>\`, unlike a user ending it from the browser, which requires --reopen.
`,
  export: `Usage: shiny-axi export <html-file> [--out <path>]

Write a portable copy of an artifact: one HTML file with its LOCAL assets inlined (relative-path stylesheets, scripts, images, and fonts become inline <style>/<script> blocks and data URIs). Remote CDN/font references (https URLs) are left as links for the browser to load, so the file needs network to render those. Shiny AXI makes no outbound requests - it only reads local files, confined to the artifact's directory. Defaults to writing <name>.export.html next to the source; pass --out to choose a path. The Shiny AXI annotation SDK is never included in an export.
`,
  share: `Usage: shiny-axi share <html-file> [--password <pw>] [--token <t>]

Publish the artifact on ht-ml.app (https://ht-ml.app), a third-party hosting service not part of Shiny AXI, and print a visitable URL. Shares are PUBLIC by default: anyone with the link can open the page, and it may be indexed or scraped. Pass --password to publish a PRIVATE password-protected page; viewers must supply the password to view. Builds the same local-inlined HTML as 'export' (local assets inlined; remote CDN/font URLs left as links and are not blocked by CSP on ht-ml.app, but still load over the viewer's network), then POSTs it to ht-ml.app's /v1 API. Creating a site needs no account or API key. The response includes the url plus a secret update_key (shown once) for updating or deleting the page later. Set SHINY_AXI_HTML_APP_TOKEN (or pass --token) to attach an optional bearer token; it is never required. The annotation SDK is never included.
`,
  stop: `Usage: shiny-axi stop [--port <port>]

Shut down the background Shiny AXI Editor server. The server also stops itself when no browser or poll has been connected for a while (SHINY_AXI_IDLE_TIMEOUT_MS, default 30m) and immediately when the last session ends with nothing connected.
`,
  playbook: `Usage: shiny-axi playbook [playbook_id]

List focused artifact guidance playbooks, or show one playbook by ID. Known IDs: diagram, table, comparison, plan, code, input, slides.

${PLAYBOOK_ROUTER_HELP}

Examples:
  shiny-axi playbook
  shiny-axi playbook diagram
  shiny-axi playbook input
`,
  design: `Usage: shiny-axi design

Show a copy-pasteable CDN snippet for Tailwind CSS browser runtime v4 + DaisyUI v5 + themes, Mermaid diagram tooling, a content-to-playbook router, an optional layout safety CSS snippet, plus technical reference for DaisyUI components. ${PLAYBOOK_ROUTER_HELP} Shiny AXI artifacts stay portable HTML. This CDN snippet is the design fallback, not the default: inspect the subject project before falling back, and paste the layout safety CSS only when useful for dense nested grid/flex layouts, badges, wide fonts, or local media. The strict priority order is: (1) if the user asked for a specific look or named design system, follow that; (2) otherwise, match the design system of the project the artifact is about, not necessarily your current working directory. If the artifact previews, proposes, or mocks a specific app's UI, use that app's own design system; (3) only when both come up empty, prefer the Shiny AXI-recommended Tailwind + DaisyUI CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user.
`,
  setup: `Usage: shiny-axi setup hooks

Install or repair agent SessionStart hooks for shiny-axi ambient context in Claude Code, Codex, OpenCode, and GitHub Copilot CLI. Restart your agent session afterward to receive the context.
`,
  server: `Usage: shiny-axi server [--port 4387] [--verbose]

Run the local Shiny AXI Editor server. Pass --verbose (or set SHINY_AXI_DEBUG=1) to log session and watcher events to stderr. Detached server output is appended to ~/.shiny-axi/server.log, or SHINY_AXI_STATE_DIR/server.log when set, for startup and crash diagnostics.

SHINY_AXI_HOST sets the bind address (default 127.0.0.1; a wildcard 0.0.0.0 or :: binds every interface). Binding beyond loopback exposes an unauthenticated server that can read and serve arbitrary local files to anything that can reach it, so only do so on a trusted network. SHINY_AXI_LINK_HOST sets the hostname written into generated session links (default: the bind address, or loopback when bound to a wildcard). SHINY_AXI_NO_OPEN=1 (or --no-open) suppresses the local browser launch.
`,
};

export { createDesignOutput };
