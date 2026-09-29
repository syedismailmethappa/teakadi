/* About page: scroll reveals, animated metric counters, footer year */
(function () {
  "use strict";
  const { $, $$, initHeader, initReveal, initCartUI } = window.Kocha;

  initHeader();
  initCartUI();
  initReveal();

  /* Metric counters — supports an optional data-suffix (g, °C, %) */
  function run(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const dur = 1400;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const counters = $$("[data-count]");
  if (!counters.length) return;

  if (!("IntersectionObserver" in window)) {
    counters.forEach(run);
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => io.observe(el));
  }

  $$(".js-year").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
