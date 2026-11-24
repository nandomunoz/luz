/**
 * The four agents of luz-ai, run on a page with faults seeded in it: how many it finds (recall), whether it flags what is
 * right (false positives), and whether it used a tool its front matter does not list. A fault carries the pattern that
 * says the agent named it; a clean part carries the pattern that says it was wrongly flagged. The agent's tools are read
 * from its own file, so a case cannot drift from the agent.
 */
const PAGE = (head, body) => `<!doctype html>\n${head}\n<body>\n${body}\n</body>\n</html>\n`;

export const AGENT_CASES = [
  {
    agent: "luz-accessibility-auditor",
    brief: "The project is a plain HTML site for the general public. Target: WCAG 2.2 AA.",
    fixture: {
      "site/index.html": PAGE('<html>\n<head><meta charset="utf-8"><title>Reservo</title></head>', '<nav aria-label="Main"><a href="/">Home</a> <a href="/prices/">Prices</a></nav>\n<main>\n<h1>Reservo</h1>\n<img src="/hero.png">\n<div class="btn" onclick="join()">Join the waitlist</div>\n<form><label for="mail">Email</label> <input id="mail" type="email" autocomplete="email"></form>\n</main>'),
    },
    faults: [
      { id: "no-alt", found: "\\balt\\b" },
      { id: "no-lang", found: "\\blang\\b" },
      { id: "div-button", found: "(div|click|keyboard|button)[^.]*(button|keyboard|focus|role)" },
    ],
    clean: [
      { id: "nav", flagged: "nav[^.]*(has no|lacks|missing)[^.]*(label|name)" },
      { id: "email-label", flagged: "(email|mail)[^.]*(has no|lacks|missing)[^.]*label" },
    ],
  },
  {
    agent: "luz-seo-geo-specialist",
    brief: "The project is a plain HTML landing page for a booking app, in English, published at https://reservo.example/.",
    fixture: {
      "site/index.html": PAGE('<html lang="en">\n<head><meta charset="utf-8"><title>Home</title></head>', '<main>\n<h2>Bookings without the phone calls</h2>\n<p>Live availability and reminders.</p>\n<img src="/hero.png" alt="Calendar with three free slots">\n<a href="/prices/">Prices</a>\n</main>'),
    },
    faults: [
      { id: "no-description", found: "meta description|description" },
      { id: "no-h1", found: "\\bh1\\b" },
      { id: "generic-title", found: "title[^.]*(generic|vague|descriptive|\"Home\"|Home)" },
    ],
    clean: [
      { id: "alt", flagged: "alt[^.]*(missing|lacks|has no)" },
      { id: "lang", flagged: "lang[^.]*(missing|lacks|has no)" },
    ],
  },
  {
    agent: "luz-core-web-vitals-optimizer",
    brief: "The project is a plain HTML landing page. Look at loading performance only.",
    fixture: {
      "site/index.html": PAGE('<html lang="en">\n<head><meta charset="utf-8"><title>Reservo</title>\n<script src="/vendor/slider.js"></script></head>', '<main>\n<h1>Reservo</h1>\n<img src="/hero.jpg">\n<img src="/footer-photo.jpg" loading="lazy" width="800" height="400" alt="">\n</main>'),
    },
    faults: [
      { id: "blocking-script", found: "(render-)?block|defer|async" },
      { id: "no-size", found: "width|height|layout shift|CLS" },
      { id: "hero-priority", found: "LCP|priority|preload|largest" },
    ],
    clean: [{ id: "lazy-footer", flagged: "footer[^.]*(should be|needs|must)[^.]*lazy" }],
  },
  {
    agent: "luz-ai-auditor",
    brief: "The project is a plain HTML site with a chat box that answers customers with a language model.",
    fixture: {
      "site/chat.js": 'const KEY = "sk-FAKE-0123456789abcdef";\nasync function ask(question) {\n  const prompt = "You are the shop assistant. " + question;\n  return post("https://api.llm.example/v1", { Authorization: "Bearer " + KEY }, { prompt });\n}\n',
      "site/index.html": PAGE('<html lang="en">\n<head><meta charset="utf-8"><title>Reservo</title></head>', '<main>\n<h1>Reservo</h1>\n<div id="chat"></div>\n<script src="chat.js"></script>\n</main>'),
    },
    faults: [
      { id: "key-in-client", found: "key|secret|credential" },
      { id: "no-disclosure", found: "disclos|transparen|tell[^.]*(user|visitor|customer)[^.]*(AI|bot|machine)|AI Act" },
      { id: "prompt-injection", found: "inject|untrusted|sanitis|sanitiz|user input" },
    ],
    clean: [{ id: "lang-attr", flagged: "lang[^.]*(missing|lacks|has no)" }],
  },
];

/** The tools an agent lists in its front matter. */
export function agentTools(md) {
  const m = /^tools:\s*(.+)$/m.exec(String(md).split(/^---$/m)[1] ?? "");
  return m ? m[1].split(",").map((t) => t.trim()).filter(Boolean) : [];
}

const HELPERS = new Set(["Agent", "Task", "Skill", "ToolSearch"]);

export function scoreAgent(c, { text, toolUses }) {
  const found = c.faults.filter((f) => new RegExp(f.found, "i").test(text));
  const falsePositives = c.clean.filter((x) => new RegExp(x.flagged, "i").test(text)).map((x) => x.id);
  const outside = toolUses.map((u) => u.name).filter((n) => !c.tools.includes(n) && !HELPERS.has(n));
  const recall = c.faults.length ? found.length / c.faults.length : 1;
  const respectsTools = outside.length === 0;
  return { recall, found: found.map((f) => f.id), missed: c.faults.filter((f) => !found.includes(f)).map((f) => f.id), falsePositives, respectsTools, outside, ok: recall >= 0.75 && falsePositives.length === 0 && respectsTools };
}
