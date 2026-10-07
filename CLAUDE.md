# Wok & Flame — Digital Menu

> Source of truth for the project's purpose, scope and architecture. Keep this file up to date as decisions change.

## What this is
A creative, animated **digital menu** for **Wok & Flame**, a multi-cuisine restaurant.
This is **Version 1 (V1)**.

## Scope (V1)
- **Splash screen**: animated intro with creative UI/UX motion.
- **Menu**: static + dynamic content (static layout and branding; dynamic items, categories, prices and availability driven by data).
- **Cart (view-only)**: customers can add items to a cart to review what they picked, then tell the waiter, who takes the order manually.

## Explicitly out of scope (V1)
- No ordering flow and no checkout or payment.
- No order submission: the restaurant cannot receive orders from the app, and customers cannot send them.
- The cart is only a personal "what I've picked" list shown to the waiter.

## Design direction
- Creative and visually rich, not a plain list of items.
- Animation is a core feature: splash screen, transitions, menu interactions, cart feedback.
- Visuals and branding come from supplied assets (see `assets/`).

## Folder structure
```
wok and flame/
├── CLAUDE.md            # this file
├── PRODUCT.md           # product truth (impeccable)
├── DESIGN.md            # visual system: tokens, type, line art, motion
├── docs/splash-plan.md  # splash storyboard + animation plan
├── splash/              # splash screen (index.html, splash.css, splash.js)
├── menu/                # menu (index.html incl. food line-art symbols, menu.css, menu.js)
├── data/menu.json       # categories (+ combo each) and dishes. SAMPLE data, replace with real menu
└── assets/
    ├── illustrations/   # chef-cooking.svg (original trace) + chef-cooking.sprite.svg (used by splash) + tea-cup.svg (Vecteezy, inlined in splash)
    └── reference/       # Pinterest reference frames (humbleteam coffee app), visual reference only
```

## Decisions and notes
- Visual language: cream `#F5EEDF` background, bottle-green ink `#006A4E` hand-drawn line art; Familjen Grotesk + Gochi Hand.
- Splash: vanilla HTML/CSS/JS + GSAP 3.13 (CDN), one master timeline. `?t=N` freezes it at N seconds for review.
- Run locally: `python -m http.server 5173`, then open `/splash/`. The page needs to be served over HTTP; opening the file directly won't work.
- Tech stack for the menu: same as splash, vanilla HTML/CSS/JS + GSAP, data fetched from `data/menu.json`.
- Menu layout: no logo row/headline. Sticky green category bar is the header; first item "Top dishes" (default) shows swipe cards of chef's picks + combos (each with price + add button) and "The full menu" category tiles. Any category in the bar or a tile swaps in that category's 2-col dish grid with All/Veg/Non-veg tabs. Dish detail with stepper, view-only "My list" sheet, search, Veg-only toggle in the bottom dock. List persists in localStorage.
- Splash CTA → `/menu/?from=splash`; the menu continues the ink wipe and shrinks it into the nav.
- Dish photos: set `"image": "../assets/dishes/<file>.jpg"` per dish; without one the dish shows its category line art on a plate.
- No `python` on this Windows machine: use `py -m http.server 5174` (launch config `wok-and-flame-py`).
- Brand name spelling: confirm "Wok & Flame" (folder name) vs "Oak & Flame" (as originally dictated).
- Menu data source: static `data/menu.json` for V1.

## Open items
- [ ] Receive assets from the owner and place them in `assets/`
- [x] Choose tech stack
- [x] Define menu data structure (categories, items, prices, veg/non-veg tags, images)
- [x] Design the splash animation and menu layout
- [ ] Replace sample menu in `data/menu.json` with the real menu, prices and combos
- [ ] Add dish photos to `assets/dishes/`
- [ ] Confirm opening hours
