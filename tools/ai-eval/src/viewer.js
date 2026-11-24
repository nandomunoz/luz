/**
 * The viewer of a run: one static page, `index.html`, in the run's folder, styled by LUZ's own stylesheet copied beside it
 * (`luz.css` of packages/core/dist), so it opens offline from the folder with no server and no CDN. It lists the cases, the
 * checks that failed with their rule, and every transcript, and says the command that fixes one.
 */
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function buildViewer({ out, state, root, details }) {
  const css = join(root, "packages/core/dist/luz.css");
  const hasCss = existsSync(css);
  if (hasCss) copyFileSync(css, join(out, "luz.css"));
  const rows = Object.entries(state.cases).map(([id, c]) => {
    const d = details[id];
    const failed = (d?.checks ?? []).filter((k) => !k.ok);
    const checks = (d?.checks ?? []).map((k) => `<li>${k.ok ? "ok" : "<strong>FAIL</strong>"} <code>${esc(k.id)}</code>${k.rule ? ` · ${esc(k.rule)}` : ""}${k.turn !== undefined ? ` · turn ${k.turn}` : ""}: ${esc(k.detail)}</li>`).join("");
    const turns = (d?.convo?.turns ?? []).map((t) => `<p><strong>Person:</strong> ${esc(t.user)}</p><p><strong>Assistant:</strong> ${esc(t.assistant || "(no text)")}</p>${t.toolUses.length ? `<p><small>Tools: ${esc(t.toolUses.map((u) => u.name).join(", "))}</small></p>` : ""}`).join("<hr>");
    return `<tr><th scope="row">${esc(id)}</th><td>${esc(c.status)}</td><td>${c.runs.length}</td><td>${failed.length ? esc(failed.map((k) => k.id).join(", ")) : "none"}</td></tr><tr><td colspan="4"><details${c.status === "pass" ? "" : " open"}><summary>Checks and transcript</summary><ul>${checks}</ul>${turns}<p>Fix: <code>/skill-fix ${esc(state.runId)} ${esc(id)}</code></p></details></td></tr>`;
  });
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Run ${esc(state.runId)}</title>
${hasCss ? '<link rel="stylesheet" href="luz.css">' : ""}
</head>
<body>
<main>
<h1>Run ${esc(state.runId)}</h1>
<p>Layer ${esc(state.meta?.layer ?? "?")}, model ${esc(state.meta?.model ?? "?")}. ${rows.length} case${rows.length === 1 ? "" : "s"}.</p>
<table>
<thead><tr><th scope="col">Case</th><th scope="col">Status</th><th scope="col">Runs</th><th scope="col">Failed checks</th></tr></thead>
<tbody>${rows.join("")}</tbody>
</table>
</main>
</body>
</html>
`;
  writeFileSync(join(out, "index.html"), html);
  return join(out, "index.html");
}
