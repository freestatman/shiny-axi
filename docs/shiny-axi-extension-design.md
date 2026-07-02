# shiny-axi Extension Design Proposal

## 1. Core Concept

`shiny-axi` is a standalone AXI extension for the R ecosystem (R Shiny & Quarto). 
It **depends on** `lavish-axi` to reuse the browser chrome client, stylesheet, and layout audit SDK, while adding process management, WebSocket/HTTP proxying, and R-specific session handling.

---

## 2. Dependency Architecture

Instead of duplicating the lavish server, chrome, CSS, and SDK files, `shiny-axi` imports them dynamically from `lavish-axi` as a standard npm dependency.

### `package.json` setup
```json
{
  "name": "shiny-axi",
  "version": "0.1.0",
  "dependencies": {
    "lavish-axi": "^0.1.31",
    "axi-sdk-js": "^0.1.7",
    "chokidar": "^4.0.3",
    "express": "^5.2.1",
    "open": "^10.2.0"
  }
}
```

### Resolving Lavish Assets Dynamically
In `src/server.js` or path helpers, `shiny-axi` resolves the files owned by `lavish-axi` using Node's resolution mechanism:

```javascript
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);

// Locate the installed lavish-axi package root
const lavishAxiRoot = path.dirname(require.resolve("lavish-axi/package.json"));

// Resolve assets directly from the dependency
export const chromeClientUrl = new URL(
  path.join(lavishAxiRoot, "dist/chrome-client.js"), 
  import.meta.url
);
export const chromeCssUrl = new URL(
  path.join(lavishAxiRoot, "dist/chrome.css"), 
  import.meta.url
);
```

This keeps `shiny-axi` extremely lightweight and ensures any bug fixes or style improvements in `lavish-axi`'s chrome interface are automatically inherited when upgrading the dependency.

---

## 3. CLI API Specification

`shiny-axi` wraps all commands of `lavish-axi`, making it a drop-in replacement that adds the R-specific workflows.

| Command | Handled By | Description |
|---|---|---|
| `shiny-axi <html-file>` | Passed to `lavish-axi` logic | Static HTML review (standard Lavish behavior) |
| `shiny-axi shiny <dir>` | **`shiny-axi`** | Launch/manage active R Shiny visual review |
| `shiny-axi quarto <file>` | **`shiny-axi`** | Render and launch Quarto document review |
| `shiny-axi poll <path>` | **`shiny-axi`** / Shared state | Wait for annotations (loads same `state.json`) |
| `shiny-axi end <path>` | **`shiny-axi`** / Shared state | End review session |
| `shiny-axi stop` | Passed to `lavish-axi` stop | Shut down the background server |
| `shiny-axi design` | Passed to `lavish-axi` design | Copy-pasteable Tailwind/DaisyUI CDN fallback |
| `shiny-axi playbook [id]` | Passed to `lavish-axi` playbook | Show playbooks |

---

## 4. Skill Files Organization

The skills are organized as separate outcome-focused skill files inside the package:

```
shiny-axi/
├── skills/
│   ├── shiny/
│   │   └── SKILL.md      # Workflow for R Shiny visual iteration
│   └── quarto/
│       └── SKILL.md      # Workflow for Quarto rendering & annotation
```

### `skills/shiny/SKILL.md`
- **Trigger**: When the agent needs to build, modify, or debug R Shiny applications.
- **Action**: Runs `npx -y shiny-axi shiny <app-dir>` and `npx -y shiny-axi poll <app-dir>`.
- **Value**: The agent gets active DOM snapshots, element-level annotations, and live-reload updates as they edit `.R` source files.

### `skills/quarto/SKILL.md`
- **Trigger**: When the agent needs to render or review Quarto documents (`.qmd`, `.rmd`, `.md`).
- **Action**: Runs `npx -y shiny-axi quarto <qmd-file>` and `npx -y shiny-axi poll <qmd-file>`.
- **Value**: Automates rendering, serves interactive preview, handles Quarto Shiny apps, and re-renders on save.

---

## 5. Implementation Roadmap & Next Steps

1. **Update `package.json`**: Done. Point metadata to `freestatman/shiny-axi`.
2. **Move Skill Folders**:
   - `skills/lavish-shiny` → `skills/shiny`
   - `skills/lavish-quarto` → `skills/quarto`
   - Delete/Exclude `skills/lavish` (or rename it to `skills/shiny-axi` if general R-analysis support is added).
3. **Clean up source code references**: Replace all occurrences of `lavish-axi` with `shiny-axi` inside `src/` and `test/` for consistent CLI instructions and command execution.
4. **Rewrite `README.md`**: Focus completely on R Shiny and Quarto features, demonstrating how `shiny-axi` acts as the definitive R visual review tool.
