/**
 * The texts that follow the legal audit of 2026-11-27 (site side): what the site says must be what the code does.
 *
 * - R-02  The Marquee entry of the accessibility statement says there is no control to pause it, with a pointer or
 *         without, and names the home's Built with LUZ band, where the names and links are only there.
 * - R-03  Nothing on the site says the home has a slider of the day: the row `luz-light` of the privacy page and the
 *         Theme mode entry say it is written by <luz-theme-time> when a visitor fixes an hour with a slider
 *         (`variant="bar"`), which no page of this site has now (English and Spanish).
 * - R-04  luz-readme is not sold as "not written by an AI": a README that is specific and true, and says an AI drafted it.
 * - R-08  The COAC of the band is an unofficial fan site; the home's footer and /docs/ai/ say LUZ is not affiliated with
 *         the companies it names (en, es, ar on the home; en, es on the docs).
 * - R-10  The Arabic home does not say more than the English: "Accessible, always", not "accessible to everyone, always".
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const flat = (s) => s.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));
const docsStrings = (code) => JSON.parse(read(`apps/docs/i18n/${code}/strings.json`));
const CODES = ["en", "es", "ar"];

/** The text of the `<li>` of a statement that starts with `<strong>label` */
const item = (html, label) => {
  const start = html.indexOf(`<strong>${label}`);
  expect(start, `an entry ${label}`).toBeGreaterThan(-1);
  return flat(html.slice(start, html.indexOf("</li>", start)));
};

const ACCESSIBILITY = {
  en: read("apps/docs/pages/accessibility.html"),
  es: read("apps/docs/i18n/es/pages/accessibility.html"),
};
const PRIVACY = {
  en: read("apps/docs/pages/privacy.html"),
  es: read("apps/docs/i18n/es/pages/privacy.html"),
};

describe("R-02: the accessibility statement was reviewed on 27 November 2026", () => {
  it("says so in the description and in the lead, in English and in Spanish", () => {
    expect((ACCESSIBILITY.en.match(/Last reviewed on 27 November 2026\./g) ?? []).length).toBe(2);
    expect((ACCESSIBILITY.es.match(/Última revisión: 27 de noviembre de 2026\./g) ?? []).length).toBe(2);
    expect(ACCESSIBILITY.en).not.toMatch(/(?<!2)7 November 2026/);
    expect(ACCESSIBILITY.es).not.toMatch(/(?<!2)7 de noviembre de 2026/);
  });
});

describe("R-02: the Marquee entry", () => {
  const en = item(ACCESSIBILITY.en, "Marquee");
  const es = item(ACCESSIBILITY.es, "Rótulo");

  it("says there is no button or control to pause it, with a pointer or without, and that 2.2.2 is not met", () => {
    expect(en).toMatch(/no (?:button|control)[^.]*\bpause\b/i);
    expect(en).toMatch(/with or without a pointer|pointer or not/i);
    expect(en).toMatch(/2\.2\.2[^.]*\bnot met\b/);
    expect(en).not.toMatch(/on a touch screen there is no pointer/i);
  });

  it("names the Built with LUZ band of the home page, where the names and the links are only in the band", () => {
    expect(en).toContain("Built with LUZ");
    expect(en).toMatch(/home page/);
    expect(en).toMatch(/only in the band/);
    expect(en).not.toMatch(/also elsewhere on the page\. Not tested/);
  });

  it("says the same in Spanish", () => {
    expect(es).toMatch(/ningún (?:botón|control)[^.]*paus/i);
    expect(es).toMatch(/con o sin puntero/i);
    expect(es).toMatch(/2\.2\.2[\s\S]{0,80}\bno se cumple\b/);
    expect(es).toContain("Hecho con LUZ");
    expect(es).toMatch(/página de inicio/);
    expect(es).toMatch(/solo están en la banda/);
  });
});

describe("R-03: no page of this site has the slider of the day, and the texts do not say it", () => {
  for (const code of ["en", "es"]) {
    it(`${code}: the statement does not name the slider of the home page`, () => {
      const t = flat(ACCESSIBILITY[code]);
      expect(t).not.toMatch(/slider of the home page|bar of the home page|home page[’']s bar/i);
      expect(t).not.toMatch(/deslizador de la página de inicio|barra de la página de inicio/i);
    });
  }

  it("en: the Theme mode entry says the hour applies only when a slider picks it, and that no page of this site has one", () => {
    const t = item(ACCESSIBILITY.en, "Theme mode and theme time");
    expect(t).toMatch(/\bhour\b[^.]*\bonly when\b[^.]*\bslider\b/i);
    expect(t).toMatch(/no page of this site has (?:a|the) slider/i);
    expect(t).toContain('variant="bar"');
  });

  it("es: the same", () => {
    const t = item(ACCESSIBILITY.es, "Modo del tema y hora del tema");
    expect(t).toMatch(/hora[^.]*\bsolo\b[^.]*\bdeslizador\b/i);
    expect(t).toMatch(/ninguna página de este sitio tiene (?:un|el) deslizador/i);
    expect(t).toContain('variant="bar"');
  });

  for (const code of ["en", "es"]) {
    it(`${code}: the row luz-light of the privacy page says who writes it, and not the home page`, () => {
      const html = PRIVACY[code];
      const start = html.indexOf("<code>luz-light</code>");
      const row = flat(html.slice(html.lastIndexOf("<tr>", start), html.indexOf("</tr>", start)));
      expect(row).toContain("<luz-theme-time");
      expect(row).toContain('variant="bar"');
      expect(row).not.toMatch(/home page|página de inicio/i);
      expect(row).toMatch(code === "en" ? /no page of this site has/i : /ninguna página de este sitio tiene/i);
    });
  }

  it("the privacy page was reviewed on 27 November 2026, in English and in Spanish", () => {
    expect((PRIVACY.en.match(/Last reviewed on 27 November 2026\./g) ?? []).length).toBe(2);
    expect(PRIVACY.es).toContain("Última revisión del texto en inglés: 27 de noviembre de 2026.");
    expect(PRIVACY.en).not.toContain("1 November 2026");
    expect(PRIVACY.es).not.toContain("1 de noviembre de 2026");
  });
});

describe("R-04: luz-readme is a README that is specific and true, and says an AI drafted it", () => {
  const NOT_AI = /written by a person|escrito por una persona|كأن شخصًا كتبه|machine writing|escritura de máquina|not written by an AI/i;

  it.each(CODES)("%s: the home's card of luz-readme does not sell it as written by a person", (code) => {
    const text = catalog(code)["level.ai.skills.luz-readme.text"];
    expect(text).not.toMatch(NOT_AI);
    expect(text).toMatch(code === "en" ? /\bAI\b/ : code === "es" ? /\bIA\b/ : /الذكاء الاصطناعي/);
  });

  it.each(["en", "es"])("%s: the docs' need of luz-readme and its line on the agents page say an AI drafted it", (code) => {
    const need = docsStrings(code)["ai.agents.need.luz-readme"];
    const page = code === "en" ? read("apps/docs/pages/ai/agents.html") : read("apps/docs/i18n/es/pages/ai/agents.html");
    const line = page.split("\n").find((l) => /^\s*<li><code>luz-readme<\/code>/.test(l));
    expect(line, "the list item of luz-readme").toBeTruthy();
    for (const text of [need, flat(line)]) {
      expect(text).not.toMatch(NOT_AI);
      expect(text).toMatch(code === "en" ? /says an AI drafted it/ : /dice que lo redactó una IA/);
    }
  });

  it("en: the card says specific and true", () => {
    expect(catalog("en")["level.ai.skills.luz-readme.text"]).toMatch(/specific and true/);
    expect(docsStrings("en")["ai.agents.need.luz-readme"]).toBe("A README that is specific and true, and says an AI drafted it");
  });
});

describe("R-08: Built with LUZ and the names of other companies", () => {
  it.each(CODES)("%s: the title of the COAC link says it is an unofficial fan site", (code) => {
    const text = catalog(code)["users.coac"];
    expect(text).toMatch(code === "en" ? /^COAC \(unofficial fan site\): / : code === "es" ? /^COAC \(sitio no oficial de aficionados\): / : /^COAC \(موقع معجبين غير رسمي\): /);
  });

  const EN = "LUZ is not affiliated with Anthropic, OpenAI, Google, Anysphere, Adobe or YouTube; their names belong to their owners.";
  const ES = "LUZ no tiene ninguna afiliación con Anthropic, OpenAI, Google, Anysphere, Adobe ni YouTube; sus nombres pertenecen a sus dueños.";

  it.each(CODES)("%s: the home's catalog has footer.affiliation, with the six names", (code) => {
    const text = catalog(code)["footer.affiliation"];
    expect(text, "footer.affiliation").toBeTruthy();
    for (const name of ["Anthropic", "OpenAI", "Google", "Anysphere", "Adobe", "YouTube"]) expect(text).toContain(name);
    if (code === "en") expect(text).toBe(EN);
    if (code === "es") expect(text).toBe(ES);
  });

  it("the home's footer writes it, after the legal line", () => {
    const html = read("apps/landing/index.html");
    expect(html).toMatch(/\{\{t:footer\.affiliation\}\}/);
    expect(html.indexOf("footer.affiliation")).toBeGreaterThan(html.indexOf("footer.legal"));
  });

  it("/docs/ai/ says it, in English and in Spanish", () => {
    expect(flat(read("apps/docs/pages/ai/index.html"))).toContain(EN);
    expect(flat(read("apps/docs/i18n/es/pages/ai/index.html"))).toContain(ES);
  });
});

describe("R-10: the Arabic home does not say more than the English", () => {
  it("who.m2.title is Accessible, always", () => {
    expect(catalog("ar")["who.m2.title"]).toBe("إمكانية الوصول دائمًا.");
    expect(catalog("en")["who.m2.title"]).toBe("Accessible, always.");
  });
});

/* ---- The three leftovers of that audit ---- */

describe("the leftovers of the audit of 2026-11-27", () => {
  it("the manifesto says Accessible, always in Arabic as the home does, in MANIFESTO.md and on its page", () => {
    for (const file of ["MANIFESTO.md", "apps/site/manifesto/index.html"]) {
      const text = read(file);
      expect(text, file).not.toContain("متاح للجميع دائمًا");
      expect(text, file).toContain("إمكانية الوصول دائمًا.");
    }
  });

  it("the page of <luz-theme-time> does not send to a bar on the home, which has none (en and es)", () => {
    for (const file of ["apps/docs/pages/catalog/theme-time.html", "apps/docs/i18n/es/pages/catalog/theme-time.html"]) {
      const text = read(file);
      expect(text, file).not.toMatch(/working bar is on the|barra que funciona está en la/i);
    }
  });

  it("luz-license asks the question of the rights in step 3 with the same words as principle 2", () => {
    const skill = read("packages/ai/skills/luz/assets/skills/luz-license/SKILL.md");
    const question = skill.match(/ask one question: "([^"]+)"/)?.[1];
    expect(question, "principle 2 has the question").toBeTruthy();
    const step = skill.slice(skill.indexOf("### 3. Ask only what is missing"), skill.indexOf("### 4."));
    expect(step).toContain(question);
  });
});
