/* Magical Moments by Reign — interactions */
(function () {
  "use strict";

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Scroll reveal
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Animated stat counters
  var counters = document.querySelectorAll("[data-count]");
  var started = false;
  function runCounters() {
    if (started) return;
    started = true;
    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var dur = 1400, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString();
      }
      requestAnimationFrame(step);
    });
  }
  var stats = document.querySelector(".hero-stats");
  if (stats && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { runCounters(); so.disconnect(); }
    }, { threshold: 0.4 });
    so.observe(stats);
  } else {
    runCounters();
  }

  // Booking form (front-end only — no backend wired up yet)
  var form = document.getElementById("booking-form");
  var note = document.getElementById("form-note");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector("#name");
      var email = form.querySelector("#email");
      if (!name.value.trim() || !email.value.trim()) {
        note.textContent = "Please add your name and email so we can reach you.";
        note.style.color = "#b23a5b";
        return;
      }
      note.style.color = "";
      note.textContent = "Thank you, " + name.value.trim().split(" ")[0] +
        "! Your request is on its way — we'll be in touch soon. ✨";
      form.reset();
    });
  }

  // Current year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
