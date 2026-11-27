/**
 * The agents of luz-ai, run on a page with faults seeded in it: how many it finds (recall), whether it flags what is
 * right (false positives), and whether it used a tool its front matter does not list. A fault carries the pattern that
 * says the agent named it; a clean part carries the pattern that says it was wrongly flagged. The agent's tools are read
 * from its own file, so a case cannot drift from the agent.
 */
const PAGE = (head, body) => `<!doctype html>\n${head}\n<body>\n${body}\n</body>\n</html>\n`;

export const AGENT_CASES = [
  {
    agent: "luz-agent-accessibility",
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
    agent: "luz-agent-seogeo",
    brief: "The goal is bookings from a plain HTML landing page for a booking app, in English, for the United Kingdom; people search for 'online booking for hairdressers'. Allow AI search crawlers, block training.",
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
    agent: "luz-agent-optimiza",
    brief: "Key page: the home. Visitors: mid-range phones on mobile data. Scripts that stay: none. Look at loading performance only.",
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
    agent: "luz-agent-legal",
    brief: "Published by a small company established in Spain, for visitors in Spain; it shows information and has a contact form.",
    fixture: {
      "site/index.html": PAGE('<html lang="es">\n<head><meta charset="utf-8"><title>Reservo</title>\n<script src="https://analytics.example/tag.js"></script>\n<script>document.cookie = "visitor=" + Math.random() + "; max-age=31536000";</script></head>', '<main>\n<h1>Reservo</h1>\n<form action="/contact" method="post"><label for="n">Nombre</label> <input id="n" name="name"> <label for="t">Teléfono</label> <input id="t" name="phone" type="tel"> <button>Enviar</button></form>\n</main>\n<footer><p>© Reservo</p></footer>'),
    },
    faults: [
      { id: "no-consent", found: "consent" },
      { id: "no-privacy-notice", found: "privacy (notice|policy|information)|information[^.]*(form|data)" },
      { id: "no-site-notice", found: "site notice|legal notice|publisher|identity|LSSI|aviso legal" },
    ],
    clean: [{ id: "lang", flagged: "lang[^.]*(missing|lacks|has no)" }],
  },
  {
    agent: "luz-agent-ux",
    brief: "Visitors: customers of a dental clinic, mostly on a phone. Main task: book an appointment.",
    fixture: {
      "site/index.html": PAGE('<html lang="en">\n<head><meta charset="utf-8"><title>Smile clinic</title></head>', '<main>\n<h1>Smile clinic</h1>\n<form><input type="text" placeholder="Name"> <input type="tel" placeholder="Phone"> <button>Submit</button></form>\n<p>To see our prices <a href="/prices/">click here</a>.</p>\n</main>'),
    },
    faults: [
      { id: "placeholder-label", found: "placeholder|label" },
      { id: "vague-button", found: "Submit|button[^.]*(vague|generic|says what|name)" },
      { id: "click-here", found: "click here|link text" },
    ],
    clean: [{ id: "h1", flagged: "h1[^.]*(missing|lacks|has no)" }],
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
