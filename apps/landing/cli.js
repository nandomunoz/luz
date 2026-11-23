/**
 * LUZ landing — the terminal of the fourth level.
 *
 * The whole conversation is in the markup, and it stays there whole without
 * JavaScript. With it, the terminal starts at its first line and the visitor
 * brings the next one: Enter on its button (which a click or a tap anywhere
 * in the terminal focuses and presses), one line each time. After the last,
 * the button plays it again from the start. The screen is a polite live
 * region, so each line is read out as it comes; hidden lines are `hidden`,
 * never only transparent. The screen keeps the height of the whole
 * conversation, so nothing under the terminal moves.
 */

export function initCli(root = document) {
  for (const cli of root.querySelectorAll("[data-landing-cli]")) {
    const lines = [...cli.querySelectorAll(".landing-cli__line")];
    const next = cli.querySelector(".landing-cli__next");
    const caret = cli.querySelector(".landing-cli__caret");
    if (lines.length < 2 || !next) continue;
    const label = next.querySelector("[data-cli-next]");
    const again = next.querySelector("[data-cli-replay]");
    let shown = 0;
    const show = (count) => {
      shown = count;
      lines.forEach((line, index) => {
        line.hidden = index >= count;
        line.classList.toggle("is-new", index === count - 1);
      });
      // The caret waits at the end of the last line in
      caret?.remove();
      if (caret) lines[count - 1].append(caret);
      const done = count === lines.length;
      label.hidden = done;
      again.hidden = !done;
    };
    // The screen keeps the height of the whole conversation, so the page under it never moves as the lines come
    // in. Measured on a copy out of sight (never by showing the lines of the live region, which would read them)
    const screen = cli.querySelector(".landing-cli__screen");
    let width = 0;
    const hold = () => {
      if (screen.clientWidth === width) return;
      width = screen.clientWidth;
      const ghost = screen.cloneNode(true);
      ghost.removeAttribute("aria-live");
      ghost.setAttribute("aria-hidden", "true");
      for (const line of ghost.children) line.hidden = false;
      Object.assign(ghost.style, { position: "absolute", visibility: "hidden", inlineSize: `${screen.getBoundingClientRect().width}px`, minBlockSize: "" });
      cli.append(ghost);
      screen.style.minBlockSize = `${ghost.getBoundingClientRect().height}px`;
      ghost.remove();
    };
    const step = () => show(shown === lines.length ? 1 : shown + 1);
    next.addEventListener("click", step);
    // A click or a tap anywhere else in the terminal is Enter too, and leaves the focus on the button for the next one
    cli.addEventListener("click", (event) => {
      if (event.target.closest("button, a")) return;
      next.focus({ preventScroll: true });
      step();
    });
    next.hidden = false;
    cli.dataset.cli = "step";
    show(1);
    hold();
    new ResizeObserver(hold).observe(cli);
  }
}
