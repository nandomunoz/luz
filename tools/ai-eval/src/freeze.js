/**
 * Freezes a conversation of a green run as an example for the docs (`tools/ai-eval/cases/examples/<example>.json`): what the
 * person and the assistant said, and where it came from. The docs render it, so it is real text, never typed. The path of the
 * run's temporary folder is replaced by the project's own, and text that is not plain is refused.
 */
const RANGES = [[0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff], [0xe0000, 0xe007f], [0xad, 0xad], [0x34f, 0x34f], [0x61c, 0x61c], [0x115f, 0x1160], [0x180e, 0x180e], [0x3164, 0x3164], [0xffa0, 0xffa0], [0xfff9, 0xfffb]];
export const HIDDEN = { test: (text) => [...text].some((ch) => RANGES.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b)) };
const MACHINE = /\/(?:home|Users)\/[A-Za-z0-9._-]+/;
const SANDBOX = /\/[^\s"'`]*luz-lab-run-[A-Za-z0-9]+(\/?)/g;

export const cleanPaths = (text) => String(text).replace(SANDBOX, (_, slash) => (slash ? "" : "."));

export function makeExample({ example, caseId, state, transcript, skillVersion, now = new Date(), allowUnscripted = false }) {
  const entry = state.cases?.[caseId];
  if (!entry) throw new Error(`${caseId} is not a case of run ${state.runId}`);
  if (entry.status !== "pass") throw new Error(`${caseId} did not pass in run ${state.runId} (${entry.status}): only a green run is frozen`);
  const convo = transcript.convo;
  if (convo.ended !== "done") throw new Error(`${caseId} did not end by itself (${convo.ended}): a conversation cut short is not an example`);
  if (convo.unscripted?.length && !allowUnscripted) throw new Error(`${caseId} has ${convo.unscripted.length} unscripted question(s): the answer map must cover what the assistant asks`);
  const turns = convo.turns.map((t) => ({ user: cleanPaths(t.user), assistant: cleanPaths(t.assistant) }));
  for (const t of turns) if (MACHINE.test(`${t.user}\n${t.assistant}`)) throw new Error(`${caseId}: a turn names a path of this machine`);
  for (const t of turns) if (HIDDEN.test(t.user) || HIDDEN.test(t.assistant)) throw new Error(`${caseId}: a turn has a hidden, bidi or control character`);
  return { example, case: caseId, model: state.meta?.model ?? "unknown", date: now.toISOString().slice(0, 10), skillVersion, turns };
}

/**
 * Freezes the conversation of a green automatic run as a scripted case (`cases/frozen/<id>.json`): the opening message and
 * the replies of the person, in order. It replays with no model and no persona, so it is the cheap regression of what the
 * persona found. The same refusals as an example apply: only a green run, one that ended by itself, plain text.
 */
export function freezeCase({ id, autoCase, state, transcript }) {
  const entry = state.cases?.[autoCase.id];
  if (entry?.status !== "pass") throw new Error(`${autoCase.id} did not pass in run ${state.runId} (${entry?.status}): only a green run is frozen`);
  const convo = transcript.convo;
  if (convo.ended !== "done") throw new Error(`${autoCase.id} did not end by itself (${convo.ended}): a conversation cut short is not a case`);
  const said = convo.turns.map((t) => cleanPaths(t.user));
  for (const text of said) if (MACHINE.test(text) || HIDDEN.test(text)) throw new Error(`${autoCase.id}: a reply names a path of this machine or has a hidden character`);
  const rest = Object.fromEntries(Object.entries(autoCase).filter(([k]) => !["persona", "goal", "id", "prompt"].includes(k)));
  return { ...rest, id, prompt: said[0], script: said.slice(1) };
}
