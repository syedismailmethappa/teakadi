/* ==========================================================================
   KŌCHA & CO. — shared site runtime
   Nav, scroll reveal, toast, cart (localStorage), RESTful Table API helpers
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const money = (n) => "$" + Number(n).toFixed(2);

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  /* ------------------------------------------------------------- toast UI */
  let toastStack = null;
  function toast(message) {
    if (!toastStack) {
      toastStack = document.createElement("div");
      toastStack.className = "toast-stack";
      toastStack.setAttribute("role", "status");
      toastStack.setAttribute("aria-live", "polite");
      document.body.appendChild(toastStack);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .35s ease, transform .35s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      setTimeout(() => el.remove(), 380);
    }, 2200);
  }

  /* ------------------------------------------------------------------ nav */
  function initHeader() {
    const header = $(".site-header");
    if (header) {
      const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 18);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    const toggle = $(".nav__toggle");
    const links = $("#primary-nav");
    if (toggle && links) {
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        links.classList.toggle("is-open", !open);
      });
      links.addEventListener("click", (e) => {
        if (e.target.closest("a")) {
          toggle.setAttribute("aria-expanded", "false");
          links.classList.remove("is-open");
        }
      });
    }

    // mark current page
    const here = location.pathname.split("/").pop() || "index.html";
    $$("#primary-nav a").forEach((a) => {
      const target = a.getAttribute("href");
      if (target === here || (here === "" && target === "index.html")) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /* --------------------------------------------------------- scroll reveal */
  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach((el, i) => {
      el.style.transitionDelay = Math.min(i % 6, 5) * 70 + "ms";
      io.observe(el);
    });
  }

  /* ------------------------------------------------- table API (relative) */
  async function apiGet(path) {
    const res = await fetch(path, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Request failed (" + res.status + ")");
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Request failed (" + res.status + ")");
    return res.json();
  }

  /* ----------------------------------------------------------------- cart */
  const CART_KEY = "kocha-cart-v1";
  let cart = [];

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];
    } catch (e) {
      cart = [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      /* storage blocked — cart stays in memory for this session */
    }
    renderCart();
  }

  const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);
  const cartSubtotal = () => cart.reduce((n, l) => n + l.qty * l.price, 0);

  function addToCart(item) {
    const existing = cart.find((l) => l.id === item.id);
    if (existing) existing.qty += 1;
    else
      cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        image_url: item.image_url || "",
        qty: 1
      });
    saveCart();
    toast(item.name + " added to your tray");
    openDrawer();
  }

  function setQty(id, delta) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) cart = cart.filter((l) => l.id !== id);
    saveCart();
  }

  function renderCart() {
    const count = cartCount();
    $$("[data-cart-count]").forEach((el) => {
      el.textContent = String(count);
      el.dataset.empty = String(count === 0);
    });

    const body = $("#cart-lines");
    if (!body) return;

    if (!cart.length) {
      body.innerHTML =
        '<div class="drawer__empty"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i>' +
        "Your tray is empty.<br />Browse the menu and add a tea you love.</div>";
    } else {
      body.innerHTML = cart
        .map(
          (l) =>
            '<article class="cart-line">' +
            '<img src="' + esc(l.image_url) + '" alt="" loading="lazy" />' +
            "<div><p class=\"cart-line__name\">" + esc(l.name) + "</p>" +
            '<p class="cart-line__price">' + money(l.price) + " each</p></div>" +
            '<div class="qty">' +
            '<button type="button" data-qty-down="' + esc(l.id) + '" aria-label="Remove one ' + esc(l.name) + '">&minus;</button>' +
            "<span>" + l.qty + "</span>" +
            '<button type="button" data-qty-up="' + esc(l.id) + '" aria-label="Add one ' + esc(l.name) + '">+</button>' +
            "</div></article>"
        )
        .join("");
    }

    const sub = cartSubtotal();
    const tax = sub * 0.0825;
    const total = sub + tax;
    const subEl = $("#cart-subtotal");
    const taxEl = $("#cart-tax");
    const totalEl = $("#cart-total");
    if (subEl) subEl.textContent = money(sub);
    if (taxEl) taxEl.textContent = money(tax);
    if (totalEl) totalEl.textContent = money(total);

    const checkout = $("#cart-checkout");
    if (checkout) checkout.disabled = cart.length === 0;
  }

  /* --------------------------------------------------------------- drawer */
  let lastFocus = null;

  function openDrawer() {
    const drawer = $("#cart-drawer");
    const scrim = $("#drawer-scrim");
    if (!drawer || !scrim) return;
    lastFocus = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.classList.add("is-open");
    const closeBtn = $(".drawer__head .icon-btn", drawer);
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    const drawer = $("#cart-drawer");
    const scrim = $("#drawer-scrim");
    if (!drawer || !scrim) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.classList.remove("is-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function initCartUI() {
    loadCart();
    renderCart();

    document.addEventListener("click", (e) => {
      const openBtn = e.target.closest("[data-cart-open]");
      if (openBtn) { e.preventDefault(); openDrawer(); return; }

      const closeBtn = e.target.closest("[data-cart-close]");
      if (closeBtn) { e.preventDefault(); closeDrawer(); return; }

      const up = e.target.closest("[data-qty-up]");
      if (up) { setQty(up.dataset.qtyUp, 1); return; }

      const down = e.target.closest("[data-qty-down]");
      if (down) { setQty(down.dataset.qtyDown, -1); return; }

      const add = e.target.closest("[data-add-to-cart]");
      if (add) {
        addToCart({
          id: add.dataset.addToCart,
          name: add.dataset.name,
          price: add.dataset.price,
          image_url: add.dataset.image
        });
        add.classList.add("is-added");
        setTimeout(() => add.classList.remove("is-added"), 900);
      }
    });

    const checkout = $("#cart-checkout");
    if (checkout) {
      checkout.addEventListener("click", () => {
        if (!cart.length) return;
        toast("Order request noted — we'll confirm at the counter ☕");
        cart = [];
        saveCart();
        closeDrawer();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* ------------------------------------------------------------- card view */
  function teaCard(item) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const badges = [
      item.badge
        ? '<span class="tea-card__badge">' + esc(item.badge) + "</span>"
        : "",
      '<span class="tea-card__price">' + money(item.price) + "</span>"
    ]
      .filter(Boolean)
      .join("");

    const meta = tags
      .slice(0, 2)
      .map((t) => '<span class="pill">' + esc(t) + "</span>")
      .join("");

    return (
      '<article class="tea-card reveal">' +
      '<div class="tea-card__media">' + badges +
      '<img src="' + esc(item.image_url) + '" alt="' + esc(item.name) + '" loading="lazy" /></div>' +
      '<div class="tea-card__body">' +
      '<p class="tea-card__cat">' + esc(item.category) + "</p>" +
      '<h3 class="tea-card__title">' + esc(item.name) + "</h3>" +
      '<p class="tea-card__desc">' + esc(item.description) + "</p>" +
      '<div class="tea-card__meta">' + meta +
      (item.caffeine
        ? '<span class="pill pill--gold">' + esc(item.caffeine) + " caffeine</span>"
        : "") +
      "</div>" +
      '<div class="tea-card__foot">' +
      '<span class="rating"><i class="fa-solid fa-star" aria-hidden="true"></i>' +
      Number(item.rating || 0).toFixed(1) + "</span>" +
      '<button type="button" class="btn btn--ghost btn--small tea-card__add" ' +
      'data-add-to-cart="' + esc(item.id) + '" data-name="' + esc(item.name) + '" ' +
      'data-price="' + esc(item.price) + '" data-image="' + esc(item.image_url) + '">' +
      '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add</button>' +
      "</div></div></article>"
    );
  }

  function skeletonCards(n) {
    return Array.from({ length: n })
      .map(() => '<div class="skeleton"></div>')
      .join("");
  }

  /* ------------------------------------------------------------ expose API */
  window.Kocha = {
    $, $$, money, esc, toast,
    apiGet, apiPost,
    addToCart, teaCard, skeletonCards,
    initHeader, initReveal, initCartUI, renderCart
  };
})();
