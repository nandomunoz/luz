/* The mock-up's script. Everything here is an enhancement: the pages read and
   navigate without it. A classic script, not a module, so the mock-up also
   runs when it is opened from the file system. */
(() => {

/* ---- Copy buttons -------------------------------------------------------- */
for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const source = document.querySelector(button.dataset.copy);
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source.textContent);
    } catch {
      return;
    }
    const label = button.textContent;
    button.textContent = "Copied";
    button.dataset.done = "";
    setTimeout(() => {
      button.textContent = label;
      delete button.dataset.done;
    }, 1600);
  });
}

/* ---- "Copy as Markdown": the text of the page, for an agent or a note ---- */
for (const button of document.querySelectorAll("[data-copy-md]")) {
  button.addEventListener("click", async () => {
    const title = document.querySelector("h1")?.textContent ?? "";
    const body = document.querySelector(".prose")?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(`# ${title}\n\n${body}`);
    } catch {
      return;
    }
    const label = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = label), 1600);
  });
}

/* ---- Search: a native dialog over a list the build wrote ----------------- */
const find = document.querySelector(".find");
if (find) {
  const input = find.querySelector("input");
  const items = [...find.querySelectorAll("li")];
  const none = find.querySelector(".find__none");

  const open = () => {
    if (find.open) return;
    input.value = "";
    filter();
    find.showModal();
  };

  function filter() {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const li of items) {
      const hit = li.textContent.toLowerCase().includes(q);
      li.hidden = !hit;
      if (hit) shown++;
    }
    none.hidden = shown > 0;
  }

  input.addEventListener("input", filter);
  find.querySelector("form").addEventListener("submit", (event) => {
    const first = items.find((li) => !li.hidden);
    if (input.value.trim() && first) {
      event.preventDefault();
      first.querySelector("a").click();
    }
  });
  find.addEventListener("click", (event) => {
    if (event.target === find) find.close();
  });
  for (const trigger of document.querySelectorAll("[data-find-open]")) trigger.addEventListener("click", open);
  for (const form of document.querySelectorAll("[data-find-form]")) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const q = form.querySelector("input").value;
      open();
      input.value = q;
      filter();
    });
  }
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      open();
    }
  });
}

/* ---- Docs: the Code / Design tabs ---------------------------------------- */
for (const tabs of document.querySelectorAll("[data-tabs]")) {
  const links = [...tabs.querySelectorAll("a")];
  const panels = links.map((a) => document.querySelector(a.getAttribute("href")));
  const show = (index) => {
    links.forEach((a, i) => {
      a.toggleAttribute("aria-current", i === index);
      panels[i].hidden = i !== index;
    });
  };
  links.forEach((a, i) =>
    a.addEventListener("click", (event) => {
      event.preventDefault();
      show(i);
    }),
  );
  tabs.dataset.on = "";
  show(0);
}

/* ---- Docs: "On this page" follows the scroll ----------------------------- */
const spy = document.querySelector("[data-spy]");
if (spy && "IntersectionObserver" in window) {
  const links = new Map([...spy.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const watch = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const a of links.values()) a.removeAttribute("aria-current");
        links.get(entry.target.id)?.setAttribute("aria-current", "true");
      }
    },
    { rootMargin: "-15% 0px -70% 0px" },
  );
  for (const id of links.keys()) {
    const heading = document.getElementById(id);
    if (heading) watch.observe(heading);
  }
}
})();
