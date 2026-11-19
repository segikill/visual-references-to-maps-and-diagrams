(() => {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const control = document.getElementById("motion-toggle");
  const gallery = document.getElementById("cards");
  const collection = document.getElementById("collection");
  const hero = document.getElementById("hero-map");
  const nav = document.querySelector(".mast nav");
  const indicator = document.createElement("span");
  indicator.className = "motion-nav-indicator";
  indicator.setAttribute("aria-hidden", "true");
  nav.prepend(indicator);
  const animations = new Set();
  const seen = new WeakSet();
  const flowEntry = entries.find(entry => entry.id === "flows");
  let manualPause = false;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  let lastPaint = 0;
  let heroVisible = false;
  let preview = null;
  let transition = null;
  let navigationVersion = 0;
  try { manualPause = localStorage.getItem("archive-motion-paused") === "true"; } catch {}
  const paused = () => preference.matches || manualPause;

  function animate(element, frames, options) {
    if (paused()) return;
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation)).catch(() => animations.delete(animation));
  }
  function enter(element, delay = 0) {
    animate(element, [
      { opacity: 0, transform: "translateY(28px) scale(.985)" },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ], { duration: 650, delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
  }
  const entrances = new IntersectionObserver(items => {
    let stagger = 0;
    for (const item of items) {
      if (!item.isIntersecting) continue;
      enter(item.target, stagger * 70);
      stagger = (stagger + 1) % 3;
      entrances.unobserve(item.target);
    }
  }, { threshold: .08 });
  function observeCards(mutations = []) {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (removed.nodeType === 1) entrances.unobserve(removed);
      }
    }
    if (preview && !preview.button.isConnected) stopPreview();
    for (const child of gallery.children) {
      if (seen.has(child)) continue;
      seen.add(child);
      entrances.observe(child);
    }
  }
  new MutationObserver(observeCards).observe(gallery, { childList: true });
  observeCards();

  function updateIndicator() {
    const selected = nav.querySelector('a[data-section][aria-current="page"]');
    indicator.hidden = !selected;
    if (!selected) return;
    indicator.style.width = selected.offsetWidth + "px";
    indicator.style.height = selected.offsetHeight + "px";
    indicator.style.transform = "translate(" + selected.offsetLeft + "px," + selected.offsetTop + "px)";
  }
  new ResizeObserver(updateIndicator).observe(nav);
  new MutationObserver(updateIndicator).observe(nav, {
    subtree: true, attributes: true, attributeFilter: ["aria-current"]
  });
  updateIndicator();

  function navigate(link) {
    const version = ++navigationVersion;
    transition?.skipTransition();
    stopPreview();
    const update = () => {
      if (version !== navigationVersion) return;
      if (location.hash !== link.hash) history.pushState(null, "", link.hash);
      selectSection(link.dataset.section);
      updateIndicator();
    };
    if (paused() || !document.startViewTransition || section === link.dataset.section) {
      update();
      if (!paused()) animate(collection, [
        { opacity: .3, transform: "translateY(24px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" });
      return;
    }
    transition = document.startViewTransition(update);
    transition.finished.catch(() => {}).finally(() => {
      if (version === navigationVersion) transition = null;
    });
  }
  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-section]");
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(link);
  }, true);
  // History restoration remains synchronous in the existing app.
  function historyChanged() {
    ++navigationVersion;
    transition?.skipTransition();
    stopPreview();
    requestAnimationFrame(() => {
      updateIndicator();
      if (!document.querySelector("dialog[open]")) enter(collection);
    });
  }
  window.addEventListener("popstate", historyChanged);
  window.addEventListener("hashchange", historyChanged);

  const previewVisibility = new IntersectionObserver(items => {
    if (items.some(item => !item.isIntersecting && preview?.button === item.target)) stopPreview();
  });
  function stopPreview() {
    if (!preview) return;
    const current = preview;
    preview = null;
    previewVisibility.unobserve(current.button);
    current.button.classList.remove("motion-preview-active");
    if (current.entry && current.button.isConnected) paint(current.canvas, current.entry, {}, true);
  }
  function activatePreview(button) {
    if (paused() || document.hidden || document.querySelector("dialog[open]")) return;
    if (preview?.button === button) return;
    stopPreview();
    const entry = button.matches(".card") ? entries.find(item => item.id === button.dataset.open) : null;
    preview = { button, entry, canvas: entry ? button.querySelector("canvas") : null, elapsed: 0 };
    button.dataset.previewKind = button.dataset.chartReference ? "chart" : "map";
    button.classList.add("motion-preview-active");
    previewVisibility.observe(button);
    start();
  }
  const previewSelector = ".reference-preview,.card[data-open]";
  gallery.addEventListener("pointerover", event => {
    if (event.pointerType !== "mouse") return;
    const button = event.target.closest(previewSelector);
    if (button && !button.contains(event.relatedTarget)) activatePreview(button);
  });
  gallery.addEventListener("pointerout", event => {
    const button = event.target.closest(previewSelector);
    if (button && !button.contains(event.relatedTarget) && !button.contains(document.activeElement)) stopPreview();
  });
  gallery.addEventListener("focusin", event => {
    const button = event.target.closest(previewSelector);
    if (button) activatePreview(button);
  });
  gallery.addEventListener("focusout", event => {
    if (preview && !preview.button.contains(event.relatedTarget)) stopPreview();
  });

  function tick(time) {
    frame = 0;
    if (paused() || document.hidden || (!heroVisible && !preview?.entry)) return;
    const delta = previous ? Math.min(time - previous, 50) : 0;
    elapsed += delta;
    previous = time;
    if (preview) preview.elapsed += delta;
    if (time - lastPaint >= 40 && !document.querySelector("dialog[open]")) {
      lastPaint = time;
      if (heroVisible) paint(hero, flowEntry, { phase: (elapsed / 160) % 100 }, true);
      if (preview?.entry) {
        paint(preview.canvas, preview.entry, {
          phase: 35 + Math.sin(preview.elapsed / 1800) * 30,
          lon: 12 + preview.elapsed / 90,
          lat: 23
        }, true);
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (!frame && !paused() && !document.hidden && (heroVisible || preview?.entry)) {
      previous = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  function sync() {
    document.documentElement.classList.toggle("motion-paused", paused());
    control.setAttribute("aria-pressed", String(!paused()));
    control.textContent = paused() ? "Движение выключено" : "Приостановить движение";
    if (paused()) {
      transition?.skipTransition();
      cancelAnimationFrame(frame);
      frame = 0;
      stopPreview();
      for (const animation of animations) animation.cancel();
      if (typeof timer !== "undefined" && timer) document.getElementById("play").click();
    } else start();
  }
  control.addEventListener("click", () => {
    manualPause = !paused();
    try { localStorage.setItem("archive-motion-paused", String(manualPause)); } catch {}
    sync();
  });
  preference.addEventListener("change", sync);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      stopPreview();
    } else start();
  });
  new IntersectionObserver(items => {
    heroVisible = items[0].isIntersecting;
    if (heroVisible) start();
    else if (!preview?.entry) { cancelAnimationFrame(frame); frame = 0; }
  }).observe(hero);
  for (const dialog of document.querySelectorAll("dialog")) {
    new MutationObserver(() => {
      if (dialog.open) {
        stopPreview();
        enter(dialog);
      }
    }).observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }
  sync();
  enter(document.querySelector(".hero-copy"));
  enter(document.querySelector(".feature"), 140);
})();
