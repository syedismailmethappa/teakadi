/* Contact page: validated form saved to the contact_messages table */
(function () {
  "use strict";
  const { $, $$, esc, apiPost, initHeader, initReveal, initCartUI } = window.Kocha;

  initHeader();
  initCartUI();
  initReveal();

  $$(".js-year").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  const form = $("#contact-form");
  if (!form) return;

  const note = $("#contact-note");
  const submit = $("#contact-submit");
  const message = $("#cf-message");
  const count = $("#cf-count");

  function showNote(text, kind) {
    note.textContent = text;
    note.className = "form-note is-visible form-note--" + (kind || "ok");
  }

  message.addEventListener("input", () => {
    if (message.value.length > 800) message.value = message.value.slice(0, 800);
    count.textContent = String(message.value.length);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = $("#cf-name").value.trim();
    const email = $("#cf-email").value.trim();
    const topic = $("#cf-topic").value;
    const body = message.value.trim();

    if (!name || !email || !body) {
      showNote("Please fill in your name, email and a short message.", "err");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showNote("That email address doesn't look right — mind checking it?", "err");
      return;
    }

    const original = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = '<span class="spin" aria-hidden="true"></span> Sending…';

    try {
      const saved = await apiPost("/tables/contact_messages", {
        name: name,
        email: email,
        topic: topic,
        message: body,
        submitted_at: new Date().toISOString()
      });

      const ref = saved && saved.id ? String(saved.id).slice(0, 8) : "";
      showNote(
        "Thanks " + name.split(" ")[0] +
          " — your message is with us" + (ref ? " (ref " + esc(ref) + ")" : "") +
          ". We usually reply within one working day.",
        "ok"
      );
      form.reset();
      count.textContent = "0";
    } catch (err) {
      showNote(
        "We couldn't save that just now. Please email hello@kocha.co instead — sorry about that.",
        "err"
      );
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  });
})();
