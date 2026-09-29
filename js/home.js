/* Homepage: pull featured drinks from the menu_items table + stat counters */
(function () {
  "use strict";
  const { $, apiGet, teaCard, skeletonCards, initHeader, initReveal, initCartUI } = window.Kocha;

  document.documentElement.style.scrollBehavior = "";

  initHeader();
  initCartUI();

  const grid = $("#featured-grid");
  const featured = [];

  /* ------------------------------------------------------ count-up stats */
  function initCounters() {
    const els = Array.from(document.querySelectorAll("[data-count]"));
    if (!els.length) return;

    const run = (el) => {
      const target = Number(el.dataset.count);
      const dur = 1300;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.round(target * eased);
        el.textContent =
          target >= 1000 ? value.toLocaleString("en-US") + "+" : String(value);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      els.forEach(run);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* --------------------------------------------------------- load menu */
  async function loadFeatured() {
    if (!grid) return;
    grid.innerHTML = skeletonCards(6);

    try {
      const res = await apiGet("tables/menu_items?limit=100");
      const rows = (res && res.data) || [];
      const picks = rows
        .filter((r) => r.featured)
        .sort((a, b) => Number(b.rating) - Number(a.rating))
        .slice(0, 6);

      if (!picks.length) {
        grid.innerHTML =
          '<div class="empty-state"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i>' +
          "Today's menu board is being updated — please check back shortly.</div>";
        return;
      }

      featured.push.apply(featured, picks);
      grid.innerHTML = picks.map(teaCard).join("");
      initReveal();
    } catch (err) {
      grid.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-plug-circle-exclamation" aria-hidden="true"></i>' +
        "We couldn't reach the menu board.<br />Please refresh in a moment.</div>";
    }
  }

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  loadFeatured();
  initCounters();
})();
