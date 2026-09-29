/* Menu page: search, section filters, sorting, caffeine filter + deep links */
(function () {
  "use strict";
  const {
    $, $$, apiGet, teaCard, skeletonCards, initHeader, initReveal, initCartUI
  } = window.Kocha;

  initHeader();
  initCartUI();

  const grid = $("#menu-grid");
  const emptyBox = $("#menu-empty");
  const countEl = $("#menu-count");
  const activeEl = $("#menu-active-filter");
  const filterBar = $("#menu-filters");
  const searchInput = $("#menu-search");
  const sortSelect = $("#menu-sort");
  const caffeineSelect = $("#menu-caffeine");
  const resetBtn = $("#menu-reset");

  const CAFFEINE_RANK = { None: 0, Low: 1, Medium: 2, High: 3 };

  const state = {
    items: [],
    section: "All",
    query: "",
    sort: "curated",
    caffeine: "all"
  };

  /* -------------------------------------------------------- build chips */
  function buildFilters() {
    const sections = ["All"].concat(
      Array.from(new Set(state.items.map((i) => i.category))).filter(Boolean)
    );

    filterBar.innerHTML = sections
      .map(
        (s) =>
          '<button class="chip" type="button" role="button" aria-pressed="' +
          (s === state.section ? "true" : "false") +
          '" data-section="' + window.Kocha.esc(s) + '">' + window.Kocha.esc(s) + "</button>"
      )
      .join("");
  }

  function syncChips() {
    $$("[data-section]", filterBar).forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.section === state.section));
    });
  }

  /* ---------------------------------------------------------- filtering */
  function visibleItems() {
    const q = state.query.trim().toLowerCase();

    let list = state.items.filter((item) => {
      if (state.section !== "All" && item.category !== state.section) return false;

      if (state.caffeine !== "all" && (item.caffeine || "None") !== state.caffeine) return false;

      if (!q) return true;

      const haystack = [
        item.name,
        item.description,
        item.category,
        item.caffeine,
        Array.isArray(item.tags) ? item.tags.join(" ") : ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.indexOf(q) !== -1;
    });

    list = list.slice();

    switch (state.sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "rating":
        list.sort((a, b) => Number(b.rating) - Number(a.rating));
        break;
      case "caffeine":
        list.sort(
          (a, b) =>
            (CAFFEINE_RANK[a.caffeine] ?? 1) - (CAFFEINE_RANK[b.caffeine] ?? 1) ||
            Number(b.rating) - Number(a.rating)
        );
        break;
      default:
        list.sort((a, b) => (a.__i ?? 0) - (b.__i ?? 0));
    }

    return list;
  }

  function render() {
    const list = visibleItems();

    if (!list.length) {
      grid.innerHTML = "";
      emptyBox.hidden = false;
      countEl.textContent = "0 items";
    } else {
      emptyBox.hidden = true;
      grid.innerHTML = list.map(teaCard).join("");
      countEl.textContent =
        list.length + (list.length === 1 ? " item" : " items") +
        (state.items.length ? " of " + state.items.length : "");
      initReveal();
    }

    const bits = [];
    if (state.section !== "All") bits.push(state.section);
    if (state.caffeine !== "all") bits.push(state.caffeine + " caffeine");
    if (state.query.trim()) bits.push('"' + state.query.trim() + '"');
    activeEl.textContent = bits.length ? "Filtered: " + bits.join(" · ") : "\u00a0";

    syncChips();
  }

  /* -------------------------------------------------------------- events */
  filterBar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-section]");
    if (!chip) return;
    state.section = chip.dataset.section;
    render();
  });

  let debounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.query = searchInput.value;
      render();
    }, 130);
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    render();
  });

  caffeineSelect.addEventListener("change", () => {
    state.caffeine = caffeineSelect.value;
    render();
  });

  function resetAll() {
    state.section = "All";
    state.query = "";
    state.sort = "curated";
    state.caffeine = "all";
    searchInput.value = "";
    sortSelect.value = "curated";
    caffeineSelect.value = "all";
    render();
  }

  resetBtn.addEventListener("click", resetAll);

  /* ------------------------------------------------------- load + init */
  async function load() {
    grid.innerHTML = skeletonCards(6);
    countEl.textContent = "Loading the menu board…";

    try {
      const res = await apiGet("/tables/menu_items?limit=100");
      state.items = ((res && res.data) || []).map((row, i) =>
        Object.assign({}, row, { __i: i })
      );

      if (!state.items.length) {
        grid.innerHTML = "";
        countEl.textContent = "0 items";
        emptyBox.hidden = false;
        return;
      }

      buildFilters();

      // deep link: menu.html#Pure%20Teas
      const rawHash = location.hash ? decodeURIComponent(location.hash.slice(1)) : "";
      if (rawHash) {
        const match = state.items.find((i) => i.category === rawHash);
        if (match) {
          state.section = rawHash;
          setTimeout(() => {
            const chip = filterBar.querySelector('[data-section="' + CSS.escape(rawHash) + '"]');
            if (chip) chip.scrollIntoView({ block: "nearest", inline: "center" });
          }, 60);
        }
      }

      render();
    } catch (err) {
      grid.innerHTML = "";
      countEl.textContent = "Menu unavailable";
      emptyBox.hidden = false;
    }
  }

  load();
})();
