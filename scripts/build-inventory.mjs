// Dependency-free module-graph generator (landing-dxp-builder, admin-shell.md).
//
// Walks `src/`, regex-scans static `import`/`export … from` specifiers, resolves
// the `@/` alias (→ src/) and relative paths, classifies each module by its
// top-level folder, and writes a sorted `{ generatedAt, counts, nodes, edges }`
// graph to `src/content/inventory.json` (consumed by the admin InventoryPage).
//
// Regenerate whenever a file under `src/` is added, removed, or renamed:
//   node scripts/build-inventory.mjs
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "src");
const OUT = path.resolve(SRC, "content/inventory.json");

const IMPORT_RE = /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/g;
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".json"];

function classify(id) {
  if (id.startsWith("pages/")) return "page";
  if (id.startsWith("components/")) return "component";
  if (id.startsWith("repositories/")) return "repository";
  if (id.startsWith("services/")) return "service";
  if (id.startsWith("content/") || id.startsWith("translations/")) return "content";
  if (id.startsWith("hooks/")) return "hook";
  if (id.startsWith("contexts/")) return "context";
  return "lib";
}

async function walk(dir, acc = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, acc);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

// Map a module id (relative to src, no extension) → does a file exist?
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveSpec(spec, fromFile) {
  let abs;
  if (spec.startsWith("@/")) abs = path.resolve(SRC, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) abs = path.resolve(path.dirname(fromFile), spec);
  else return null; // node_modules / bare import — not a graph node
  // try direct file, then with extensions, then index files
  if (await exists(abs)) {
    const st = await fs.stat(abs);
    if (st.isFile()) return abs;
  }
  for (const ext of EXTS) if (await exists(abs + ext)) return abs + ext;
  for (const ext of EXTS) if (await exists(path.join(abs, "index" + ext))) return path.join(abs, "index" + ext);
  return null;
}

function idOf(absFile) {
  return path.relative(SRC, absFile).replace(/\\/g, "/").replace(/\.(tsx?|jsx?|json)$/, "");
}
function labelOf(id) {
  return id.split("/").pop();
}

async function main() {
  const files = await walk(SRC);
  const nodeMap = new Map();
  const register = (absFile) => {
    const id = idOf(absFile);
    if (!nodeMap.has(id)) {
      const type = classify(id);
      nodeMap.set(id, { id, label: labelOf(id), type, group: type, path: path.relative(ROOT, absFile).replace(/\\/g, "/") });
    }
    return id;
  };

  // Pre-register content/translation JSON so they appear as data nodes.
  const contentDir = path.resolve(SRC, "content");
  for (const f of await fs.readdir(contentDir)) if (f.endsWith(".json")) register(path.join(contentDir, f));
  const trDir = path.resolve(SRC, "translations");
  for (const f of await fs.readdir(trDir)) if (f.endsWith(".json")) register(path.join(trDir, f));

  const edges = [];
  for (const file of files) {
    const fromId = register(file);
    const code = await fs.readFile(file, "utf8");
    IMPORT_RE.lastIndex = 0;
    let m;
    const seen = new Set();
    while ((m = IMPORT_RE.exec(code))) {
      const resolved = await resolveSpec(m[1], file);
      if (!resolved) continue;
      const toId = register(resolved);
      const key = fromId + "→" + toId;
      if (fromId !== toId && !seen.has(key)) {
        seen.add(key);
        edges.push({ from: fromId, to: toId, kind: "imports" });
      }
    }
  }

  const nodes = [...nodeMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
  const counts = nodes.reduce((acc, n) => ((acc[n.type] = (acc[n.type] ?? 0) + 1), acc), {});

  const out = { generatedAt: new Date().toISOString(), counts, nodes, edges };
  await fs.writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`[inventory] ${nodes.length} nodes, ${edges.length} edges → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
