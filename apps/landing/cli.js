/**
 * LUZ landing — the terminal of the luz skill (the home's fourth level and the hero of /ai/).
 *
 * An emulation of a session with the skill, written by scripts/docs-site/cli-demo.js. The markup holds every
 * variant of the session; an element with `data-when` ("kind=blog stack=astro", "agent=<name>") belongs to some
 * answers only. Without JavaScript the session of the default answers shows, whole: nothing here runs.
 *
 * Two ways to play it, by the figure's `data-landing-cli`:
 *
 * - On the page of the skill (`data-landing-cli`), the visitor plays it: the terminal starts at its first line and
 *   the visitor brings the next one (Enter on its button, which a click or a tap anywhere in the terminal focuses and
 *   presses). A question comes with its answers (`.landing-cli__choices`, the item after it) and waits: its buttons
 *   take the place of Enter, the first one focused; a question with `data-multi` toggles its buttons (aria-pressed)
 *   and goes on with its Continue button. After the last line, the button plays the session again from the start.
 * - On the home (`data-landing-cli="loop"`), nobody answers: the session plays by itself, a line at a time, once it
 *   is in view; at a question its answers show and the animation picks one; at the end it starts over with other
 *   answers, round after round. A button pauses it (WCAG 2.2.2), it stops while it is out of view or the tab is
 *   hidden, and with reduced motion it does not run at all: the session of the default answers stays whole. While it
 *   plays the screen is inert and hidden from a reader, so there is nothing to focus, press or listen to
 *   line by line.
 *
 * Lines not shown are `hidden`, never only transparent. The screen keeps one height and scrolls to its last line,
 * like a terminal, so the page under it never moves.
 */

/** Whether `answers` meet a `data-when`: every condition, `agent=` by membership. */
function meets(when, answers) {
  return when
    .split(/\s+/)
    .filter(Boolean)
    .every((cond) => {
      const [key, value] = cond.split("=");
      return key === "agent" ? answers.agent.has(value) : answers[key] === value;
    });
}

/** What both ways share: the lines, the answers, which lines show. */
function session(cli) {
  const screen = cli.querySelector(".landing-cli__screen");
  const caret = cli.querySelector(".landing-cli__caret");
  const items = screen ? [...screen.children] : [];
  const asks = items.filter((item) => item.matches(".landing-cli__choices"));

  // The default answers are the ones the markup shows without JavaScript: the pressed buttons
  const defaults = () => {
    const answers = { agent: new Set() };
    for (const ask of asks) {
      for (const button of ask.querySelectorAll("[data-value]")) {
        button.dataset.default ??= button.getAttribute("aria-pressed");
        button.setAttribute("aria-pressed", button.dataset.default);
        if (button.dataset.default !== "true") continue;
        if (ask.dataset.ask === "agent") answers.agent.add(button.dataset.value);
        else answers[ask.dataset.ask] = button.dataset.value;
      }
    }
    return answers;
  };

  const s = {
    screen,
    items,
    asks,
    answers: defaults(),
    shown: new Set(),
    answered: new Set(),
    reset() {
      s.answers = defaults();
      s.shown.clear();
      s.answered.clear();
    },
    belongs: (item) => !item.dataset.when || meets(item.dataset.when, s.answers),
    upcoming: () => items.find((item) => !s.shown.has(item) && s.belongs(item)),
    /** Every element with `data-when` inside a line, and the "none" of an empty choice, follows the answers. */
    paint() {
      for (const item of items) {
        item.hidden = !(s.shown.has(item) && s.belongs(item) && !s.answered.has(item));
        if (item.hidden) continue;
        for (const part of item.querySelectorAll("[data-when]")) part.hidden = !meets(part.dataset.when, s.answers);
        for (const none of item.querySelectorAll("[data-when-none]")) none.hidden = s.answers[none.dataset.whenNone].size > 0;
      }
      const last = items.filter((item) => !item.hidden).at(-1);
      caret?.remove();
      if (caret && last?.matches(".landing-cli__line")) last.append(caret);
      screen.scrollTop = screen.scrollHeight;
    },
    /** Shows `item` as the newest line, and the answers of a question with it. Returns the question, if any. */
    reveal(item) {
      for (const old of items) old.classList.remove("is-new");
      s.shown.add(item);
      item.classList.add("is-new");
      const ask = item.matches(".landing-cli__choices") ? item : s.upcoming()?.matches(".landing-cli__choices") ? s.upcoming() : null;
      if (ask) s.shown.add(ask);
      s.paint();
      return ask;
    },
    /** Presses `value` of a single question, the others released. */
    choose(ask, value) {
      for (const other of ask.querySelectorAll("[data-value]")) other.setAttribute("aria-pressed", String(other.dataset.value === value));
      s.answers[ask.dataset.ask] = value;
    },
    /** Toggles one answer of the multiple question. */
    toggle(ask, value) {
      const button = ask.querySelector(`[data-value="${value}"]`);
      const on = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(on));
      if (on) s.answers.agent.add(value);
      else s.answers.agent.delete(value);
    },
  };
  return s;
}

/** The visitor plays: the page of the skill. */
function playByHand(cli) {
  const s = session(cli);
  const next = cli.querySelector(".landing-cli__next");
  if (s.items.length < 2 || !next) return;
  const label = next.querySelector("[data-cli-next]");
  const again = next.querySelector("[data-cli-replay]");
  let waiting = null;

  const step = () => {
    if (waiting) return;
    const item = s.upcoming();
    if (!item) {
      restart();
      return;
    }
    // A question comes with its answers: the buttons show with it, in the place of Enter
    const ask = s.reveal(item);
    if (ask) {
      waiting = ask;
      // Out of sight and out of the focus order, but keeping its room: the terminal keeps its height
      cli.dataset.waiting = "";
      waiting.querySelector("button")?.focus({ preventScroll: true });
    }
    const done = !waiting && !s.upcoming();
    label.hidden = done;
    again.hidden = !done;
  };

  const answer = (ask) => {
    s.answered.add(ask);
    waiting = null;
    delete cli.dataset.waiting;
    next.focus({ preventScroll: true });
    step();
  };

  for (const ask of s.asks) {
    ask.hidden = true;
    ask.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button || waiting !== ask) return;
      if (button.hasAttribute("data-done")) {
        answer(ask);
        return;
      }
      if (ask.hasAttribute("data-multi")) {
        s.toggle(ask, button.dataset.value);
        return;
      }
      s.choose(ask, button.dataset.value);
      answer(ask);
    });
  }

  const restart = () => {
    s.reset();
    waiting = null;
    delete cli.dataset.waiting;
    step();
  };

  next.addEventListener("click", step);
  // A click or a tap anywhere else in the terminal is Enter too, and leaves the focus on the button for the next one
  cli.addEventListener("click", (event) => {
    if (waiting || event.target.closest("button, a")) return;
    next.focus({ preventScroll: true });
    step();
  });
  next.hidden = false;
  // The screen scrolls now, so it takes the focus, and the keyboard scrolls it back to an earlier line
  s.screen.tabIndex = 0;
  cli.dataset.cli = "step";
  step();
}

/** Milliseconds a line stays before the next: what is typed lingers, what the script prints flies by. */
function lingers(item) {
  if (item.matches(".landing-cli__choices")) return 0;
  if (item.matches(".landing-cli__line--out")) return 220;
  if (item.matches(".landing-cli__line--cmd")) return 1100;
  if (item.matches(".landing-cli__line--item")) return 380;
  if (item.matches(".landing-cli__line--banner")) return 900;
  return 800;
}

const PAUSE_AT_END = 6000;
const LOOK_AT_THE_ANSWERS = 1300;
const BETWEEN_PICKS = 650;

/** The animation plays: the home. */
function playByItself(cli) {
  const s = session(cli);
  const pause = cli.querySelector(".landing-cli__pause");
  if (s.items.length < 2 || !pause) return;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Reduced motion: the session of the default answers stays whole, still, with no button
  if (still.matches) return;

  const values = (name) => [...(s.asks.find((ask) => ask.dataset.ask === name)?.querySelectorAll("[data-value]") ?? [])].map((b) => b.dataset.value);
  const kinds = values("kind");
  const stacks = values("stack");
  const agents = values("agent");
  /** Round 0 answers as the defaults do; each round after it answers otherwise (another kind, stack and agent). */
  let round = 0;
  const target = () =>
    round === 0 ? null : { kind: kinds[round % kinds.length], stack: stacks[round % stacks.length], agent: new Set([agents[round % agents.length]]) };

  /** What happens next, in order: [wait in ms, what to do]. Pausing keeps the head, so it goes on from where it was. */
  const queue = [];
  let timer = 0;
  let paused = false;
  let inView = false;
  const running = () => inView && !paused && !document.hidden;
  const run = () => {
    clearTimeout(timer);
    if (!running() || !queue.length) return;
    timer = setTimeout(() => {
      queue.shift()[1]();
      run();
    }, queue[0][0]);
  };

  const finish = (ask) => {
    s.answered.add(ask);
    show();
  };
  const picks = (ask, goal) => {
    const name = ask.dataset.ask;
    let first = true;
    const after = () => {
      const wait = first ? LOOK_AT_THE_ANSWERS : BETWEEN_PICKS;
      first = false;
      return wait;
    };
    if (name === "agent") {
      for (const value of agents) if (s.answers.agent.has(value) !== Boolean(goal?.agent.has(value))) queue.push([after(), () => s.toggle(ask, value)]);
    } else if (goal?.[name] && goal[name] !== s.answers[name]) queue.push([after(), () => s.choose(ask, goal[name])]);
    queue.push([after(), () => finish(ask)]);
  };
  /** Shows the next line, and queues what follows it. */
  const show = () => {
    const item = s.upcoming();
    if (!item) {
      queue.push([PAUSE_AT_END, startOver]);
      return;
    }
    const ask = s.reveal(item);
    if (ask) picks(ask, target());
    else queue.push([lingers(item), show]);
  };
  const startOver = () => {
    round += 1;
    s.reset();
    show();
  };

  // Not a thing to answer or to read line by line: out of the focus order and the reader's, a picture of a terminal
  for (const ask of s.asks) ask.hidden = true;
  s.screen.inert = true;
  s.screen.setAttribute("aria-hidden", "true");
  s.screen.removeAttribute("aria-live");
  cli.dataset.cli = "loop";
  pause.hidden = false;
  const [labelPause, labelPlay] = [pause.querySelector("[data-cli-pause]"), pause.querySelector("[data-cli-play]")];
  pause.addEventListener("click", () => {
    paused = !paused;
    labelPause.hidden = paused;
    labelPlay.hidden = !paused;
    run();
  });

  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      run();
    },
    { threshold: 0.35 },
  ).observe(cli);
  document.addEventListener("visibilitychange", run);

  // The preference may change while the page is open: then the session stands still and whole, the button goes
  still.addEventListener("change", (event) => {
    if (!event.matches) return;
    clearTimeout(timer);
    queue.length = 0;
    paused = true;
    s.reset();
    for (const item of s.items) s.shown.add(item);
    for (const ask of s.asks) s.answered.add(ask);
    s.paint();
    s.screen.inert = false;
    s.screen.removeAttribute("aria-hidden");
    s.screen.setAttribute("aria-live", "polite");
    pause.hidden = true;
  });

  show();
}

export function initCli(root = document) {
  for (const cli of root.querySelectorAll("[data-landing-cli]")) {
    if (cli.dataset.landingCli === "loop") playByItself(cli);
    else playByHand(cli);
  }
}
