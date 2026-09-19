Waste2Worth Offline Demo
===================

What this is
-------------
A self-contained, accessible multi-page prototype for Waste2Worth, a Waste2Worth-style
reuse experience. It helps normal users analyze an item, browse a local-style
marketplace, discover services, view illustrative impact, and follow six
upcycling tutorials.

Run / open
----------
1. Open `offline-demo/index.html` directly in a modern browser (double-click it
   or use File > Open). No installation is required.
2. Alternatively, serve this folder with any static server and visit
   `/offline-demo/`. For example, from the repository root run:
   `python -m http.server`

Pages
-----
- `index.html`       Main landing experience and navigation.
- `analyze.html`     Local image preview and six sample item scenarios.
- `marketplace.html` Realistic fictional exchange listings.
- `services.html`    Repair, pickup, learning, and material services.
- `impact.html`      Illustrative community impact dashboard.
- `upcycle.html`     Searchable/filterable tutorials for plastic bottle, water
                     bottle, chair, mat, hair pins, and clutter.

Shared local files
------------------
- `styles.css`       Shared responsive styles and accessible layout.
- `app.js`           Navigation toggle, local preview, and rendering behavior.
- `data.js`          Local demo scenarios, listings, services, metrics, and
                     complete tutorial content.

Offline/privacy notes
---------------------
There are no fetch calls, APIs, CDNs, external scripts, or required network
requests. The image preview uses the browser's local `URL.createObjectURL`
only; selected files are not uploaded or saved. Tutorial reference URLs are
plain, offline-friendly text links for optional later reference and are not
needed to use the demo.
