/**
 * LUZ landing — the terminal of the luz-start skill (the home's fourth level and the hero of /ai/).
 *
 * An emulation of a session with the skill, written by scripts/docs-site/cli-demo.js. The markup holds every
 * variant of the session; an element with `data-when` ("kind=blog stack=astro", "agent=<name>") belongs to some
 * answers only. Without JavaScript the session of the default answers shows, whole: nothing here runs.
 *
 * With it, the terminal starts at its first line and the visitor brings the next one: Enter on its button (which a
 * click or a tap anywhere in the terminal focuses and presses). A question comes with its answers
 * (`.landing-cli__choices`, the item after it) and waits: its buttons take the place of Enter, the first one focused; a question with `data-multi` toggles its
 * buttons (aria-pressed) and goes on with its Continue button. Each answer shows only the lines of that answer from
 * then on. After the last line, the button plays the session again from the start, with the default answers.
 *
 * The screen is a polite live region, so each line is read out as it comes; lines not shown are `hidden`, never
 * only transparent. The screen keeps one height and scrolls to its last line, like a terminal, so the page under it
 * never moves.
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

export function initCli(root = document) {
  for (const cli of root.querySelectorAll("[data-landing-cli]")) {
    const screen = cli.querySelector(".landing-cli__screen");
    const next = cli.querySelector(".landing-cli__next");
    const caret = cli.querySelector(".landing-cli__caret");
    const items = screen ? [...screen.children] : [];
    if (items.length < 2 || !next) continue;
    const label = next.querySelector("[data-cli-next]");
    const again = next.querySelector("[data-cli-replay]");
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
    let answers = defaults();
    const shown = new Set();
    const answered = new Set();
    let waiting = null;

    const belongs = (item) => !item.dataset.when || meets(item.dataset.when, answers);
    /** Every element with `data-when` inside a line, and the "none" of an empty choice, follows the answers. */
    const paint = () => {
      for (const item of items) {
        item.hidden = !(shown.has(item) && belongs(item) && !answered.has(item));
        if (item.hidden) continue;
        for (const part of item.querySelectorAll("[data-when]")) part.hidden = !meets(part.dataset.when, answers);
        for (const none of item.querySelectorAll("[data-when-none]")) none.hidden = answers[none.dataset.whenNone].size > 0;
      }
      const last = items.filter((item) => !item.hidden).at(-1);
      caret?.remove();
      if (caret && last?.matches(".landing-cli__line")) last.append(caret);
      screen.scrollTop = screen.scrollHeight;
    };

    const upcoming = () => items.find((item) => !shown.has(item) && belongs(item));

    const step = () => {
      if (waiting) return;
      const item = upcoming();
      if (!item) {
        restart();
        return;
      }
      for (const old of items) old.classList.remove("is-new");
      shown.add(item);
      item.classList.add("is-new");
      // A question comes with its answers: the buttons show with it, in the place of Enter
      const ask = item.matches(".landing-cli__choices") ? item : upcoming()?.matches(".landing-cli__choices") ? upcoming() : null;
      if (ask) {
        shown.add(ask);
        waiting = ask;
        // Out of sight and out of the focus order, but keeping its room: the terminal keeps its height
        cli.dataset.waiting = "";
      }
      paint();
      if (waiting) waiting.querySelector("button")?.focus({ preventScroll: true });
      const done = !waiting && !upcoming();
      label.hidden = done;
      again.hidden = !done;
    };

    const answer = (ask) => {
      answered.add(ask);
      waiting = null;
      delete cli.dataset.waiting;
      next.focus({ preventScroll: true });
      step();
    };

    for (const ask of asks) {
      ask.hidden = true;
      ask.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || waiting !== ask) return;
        if (button.hasAttribute("data-done")) {
          answer(ask);
          return;
        }
        const { value } = button.dataset;
        if (ask.hasAttribute("data-multi")) {
          const on = button.getAttribute("aria-pressed") !== "true";
          button.setAttribute("aria-pressed", String(on));
          if (on) answers.agent.add(value);
          else answers.agent.delete(value);
          return;
        }
        for (const other of ask.querySelectorAll("[data-value]")) other.setAttribute("aria-pressed", String(other === button));
        answers[ask.dataset.ask] = value;
        answer(ask);
      });
    }

    const restart = () => {
      answers = defaults();
      shown.clear();
      answered.clear();
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
    screen.tabIndex = 0;
    cli.dataset.cli = "step";
    step();
  }
}
