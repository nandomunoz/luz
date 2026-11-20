/* The mock-up's motion and the playground. A classic script, run after the
   page is parsed. What the playground does (meter, dialog, toast) works for
   everyone; everything that moves is skipped under reduced motion. */
(() => {
  const root = document.documentElement;

  /* ---- The header thickens once the page scrolls ------------------------ */
  const head = document.querySelector(".head");
  const scrolled = () => head?.classList.toggle("is-scrolled", window.scrollY > 8);
  addEventListener("scroll", scrolled, { passive: true });
  scrolled();

  /* ---- Playground ------------------------------------------------------- */
  for (const range of document.querySelectorAll("[data-meter]")) {
    const meter = document.querySelector(range.dataset.meter);
    const out = document.querySelector(range.dataset.out);
    range.addEventListener("input", () => {
      meter.value = range.value;
      meter.textContent = `${range.value}%`;
      if (out) out.value = `${range.value}%`;
    });
  }

  for (const button of document.querySelectorAll("[data-open]")) {
    button.addEventListener("click", () => document.querySelector(button.dataset.open)?.showModal());
  }

  const toasts = document.querySelector(".toasts");
  for (const button of document.querySelectorAll("[data-toast]")) {
    button.addEventListener("click", () => {
      if (!toasts) return;
      // It stays until it is dismissed: a message that leaves by itself
      // is missed (GUIA-VISUAL-UX-UI.md, section 15)
      const toast = document.createElement("p");
      toast.className = "toast";
      toast.textContent = button.dataset.toast;
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Dismiss";
      close.addEventListener("click", () => {
        toast.classList.add("is-leaving");
        button.focus();
        setTimeout(() => toast.remove(), 220);
      });
      toast.append(close);
      toasts.replaceChildren(toast);
    });
  }

  /* ---- The marquee's pause button --------------------------------------- */
  for (const pause of document.querySelectorAll(".marq__pause")) {
    pause.addEventListener("click", () => {
      pause.setAttribute("aria-pressed", String(pause.getAttribute("aria-pressed") !== "true"));
    });
  }

  if (!("IntersectionObserver" in window)) return;
  // Reveals run for everyone with the script: a fade with reduced motion,
  // a fade and a short rise without (motion.css decides)
  root.classList.add("motion");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Split headings into words ---------------------------------------- */
  for (const el of document.querySelectorAll("[data-split]")) {
    let i = 0;
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
              frag.append(part);
              continue;
            }
            const outer = document.createElement("span");
            outer.className = "w";
            const inner = document.createElement("span");
            inner.style.setProperty("--wi", i++);
            inner.textContent = part;
            outer.append(inner);
            frag.append(outer);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      }
    };
    walk(el);
  }

  /* ---- Stagger the children of a group ---------------------------------- */
  for (const group of document.querySelectorAll("[data-stagger]")) {
    [...group.children].forEach((child, i) => child.style.setProperty("--si", i));
  }

  /* ---- Docs pages: reveal their blocks without touching the markup ------ */
  for (const el of document.querySelectorAll(".gallery, .plist, .score, .modes, .ramp")) {
    if (!el.hasAttribute("data-stagger")) {
      el.setAttribute("data-stagger", "");
      [...el.children].forEach((child, i) => child.style.setProperty("--si", Math.min(i, 8)));
    }
  }

  /* ---- The terminal: one line at a time --------------------------------- */
  for (const term of document.querySelectorAll("[data-type]")) {
    const code = term.querySelector("code");
    if (!code) continue;
    code.innerHTML = code.innerHTML
      .split("\n")
      .map((line, i) => `<span class="ln" style="--li:${i}">${line}</span>`)
      .join("\n");
  }

  /* ---- Numbers count up ------------------------------------------------- */
  const count = (el) => {
    if (calm) return;
    const target = parseFloat(el.textContent);
    if (!Number.isFinite(target) || target === 0) return;
    const decimals = (el.textContent.split(".")[1] ?? "").length;
    const start = performance.now();
    const time = 1400;
    el.style.minWidth = `${el.offsetWidth}px`;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / time);
      const eased = 1 - (1 - t) ** 4;
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---- One observer brings everything into view ------------------------- */
  const watched = document.querySelectorAll("[data-split], [data-reveal], [data-stagger], [data-type], .facts");
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.classList.add("is-in");
        if (el.matches(".facts")) el.querySelectorAll("[data-count]").forEach(count);
        seen.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  for (const el of watched) seen.observe(el);

  /* ---- The layers story: the pyramid follows the card in view ----------- */
  for (const stack of document.querySelectorAll("[data-stack]")) {
    const layers = [...stack.querySelectorAll("[data-layer]")];
    const num = stack.querySelector("[data-step-num]");
    stack.dataset.step = "0";
    const set = (i) => {
      stack.dataset.step = String(i + 1);
      if (num) num.textContent = String(i + 1);
      layers.forEach((layer, j) => layer.classList.toggle("is-current", j === i));
    };
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) set(layers.indexOf(entry.target));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    layers.forEach((layer) => spy.observe(layer));
  }

  /* ---- The art: the light follows the pointer (brightness, not motion) --- */
  for (const scene of document.querySelectorAll("[data-parallax]")) {
    const host = scene.parentElement;
    host.addEventListener("pointermove", (event) => {
      const rect = host.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      host.style.setProperty("--px", `${(x * 100).toFixed(1)}%`);
      host.style.setProperty("--py", `${(y * 100).toFixed(1)}%`);
      host.style.setProperty("--mx", (x - 0.5).toFixed(3));
    });
  }

  if (calm) return;

  /* ---- Cards lean toward the pointer ------------------------------------ */
  for (const card of document.querySelectorAll(".kind")) {
    const fig = card.querySelector(".kind__fig");
    card.addEventListener("pointermove", (event) => {
      const rect = fig.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      fig.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`);
      fig.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    });
    card.addEventListener("pointerleave", () => {
      fig.style.setProperty("--ry", "0deg");
      fig.style.setProperty("--rx", "0deg");
    });
  }
})();
