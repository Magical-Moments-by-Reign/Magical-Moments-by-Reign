# Magical Moments by Reign

A bespoke event-styling & celebrations website — elegant, responsive, and built with plain HTML, CSS, and JavaScript (no build step required).

## ✨ Features

- **Fully responsive** layout with a mobile navigation menu
- **Animated hero** with count-up statistics
- **Scroll-reveal** animations (respects `prefers-reduced-motion`)
- **Sections:** Hero · About · Services · Gallery · Testimonials · Booking form
- **Front-end booking form** with inline validation
- Accessible markup, semantic HTML, and a soft blush-and-gold theme

## 📁 Structure

```
.
├── index.html    # Page markup and content
├── styles.css    # Theme, layout, and responsive styles
└── script.js     # Nav, scroll reveals, counters, form handling
```

## 🚀 Run locally

No dependencies needed — just open the file, or serve it:

```bash
# Option A: open directly
open index.html

# Option B: local server (recommended)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🎨 Customizing

- **Colors & fonts:** edit the `:root` CSS variables at the top of `styles.css`.
- **Content:** all copy, services, and testimonials live in `index.html`.
- **Booking form:** `script.js` currently handles submissions on the front end
  only. Wire it to an email service or form backend (e.g. Formspree, Netlify
  Forms, or a custom endpoint) to receive real inquiries.

---

_Where every moment becomes magical._
