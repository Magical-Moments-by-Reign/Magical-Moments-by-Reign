/* ============================================================
   Magical by Reign — gentle, intentional interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---- Nav background on scroll ---- */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Reveal-on-scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
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
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Philosophy lines light up sequentially ---- */
  var lines = document.querySelectorAll(".philosophy .line");
  if ("IntersectionObserver" in window && lines.length) {
    var lio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var idx = Array.prototype.indexOf.call(lines, entry.target);
            setTimeout(function () { entry.target.classList.add("lit"); }, idx * 180);
            lio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    lines.forEach(function (el) { lio.observe(el); });
  }

  /* ---- Floating sparkles in hero ---- */
  var hero = document.querySelector(".hero");
  if (hero && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var count = 14;
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      s.className = "sparkle";
      var size = 4 + Math.random() * 10;
      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = (Math.random() * 9).toFixed(2) + "s";
      s.style.animationDuration = (7 + Math.random() * 6).toFixed(2) + "s";
      hero.appendChild(s);
    }
  }

  /* ---- Waitlist (front-end demo; wire to a backend later) ---- */
  var form = document.getElementById("waitlist-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form-note");
      var input = form.querySelector("input[type='email']");
      var email = (input.value || "").trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        note.textContent = "Please enter a valid email so we can reach you.";
        note.classList.remove("success");
        return;
      }
      note.textContent = "Thank you — you're on the list. Something magical is coming. ✨";
      note.classList.add("success");
      input.value = "";
      /* TODO: POST to a real waitlist endpoint / email service. */
    });
  }

  /* ---- Footer year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
