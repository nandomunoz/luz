/**
 * The automatic mode: the cases of persona × goal. A pair is a person (how they talk and decide) with a goal (what they
 * want, tied to a base case of evals.json that says the folder, the checks and the rules to grade). `pairs` is a covering
 * set (every persona and every goal at least once, rotating) or, with `full`, the whole product.
 */
export function pairs({ personas, goals }, { full = false } = {}) {
  const all = personas.flatMap((persona) => goals.map((goal) => ({ persona, goal })));
  if (full) return all;
  const n = Math.max(personas.length, goals.length);
  return Array.from({ length: n }, (_, i) => ({ persona: personas[i % personas.length], goal: goals[i % goals.length] }));
}

/** The case of one pair: the base case's folder and checks, the opening message the person wrote, and no answer map. */
export function autoCase({ persona, goal }, bases, prompt) {
  const base = bases.find((c) => c.id === goal.base);
  if (!base) throw new Error(`${goal.id}: the base case ${goal.base} does not exist`);
  const rest = Object.fromEntries(Object.entries(base).filter(([k]) => !["answers", "example", "prompt", "id"].includes(k)));
  const transcript = [...(base.transcript ?? []), "skill-invoked"].filter((x, i, a) => a.indexOf(x) === i);
  return { ...rest, id: `${goal.id}--${persona.id}`, gradeId: base.id, prompt, transcript, persona: persona.id, goal: goal.id };
}
