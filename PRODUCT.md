# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS + GSAP 3.13 from CDN, matching the splash. No build step. Menu data lives in `data/menu.json` and is fetched at runtime, so the site must be served over HTTP (`python -m http.server 5173`).

## Users

Diners seated at a Wok & Flame table, usually on their own phone after scanning a table QR code. They are hungry, often in a group, and choosing what to eat before the waiter comes back.

## Product Purpose

A digital menu for Wok & Flame, a multi-cuisine restaurant (Indian, Indo-Chinese, Thai, Continental). Diners browse by category, see prices, veg/non-veg and availability, and collect dishes into a personal "my list" that they show to the waiter. Success: a diner can find a category, compare dishes and build a list within a minute, and the waiter can read that list at a glance.

## Positioning

The menu feels hand-drawn and alive, carrying the restaurant's line-art identity from the splash screen into the browsing experience, rather than being a scrolling PDF or a delivery-app clone.

## Operating Context

- Opened at the table from the animated splash (`/splash/` → "Open the menu" → `/menu/`).
- Ordering is verbal: the waiter takes the order by hand. The app never sends anything.
- Mostly phones in portrait; desktop/tablet must still look intentional.

## Capabilities and Constraints

- V1: splash, menu (categories, combos, dishes, dish detail), view-only list.
- Out of scope: ordering, checkout, payment, any order submission.
- Each category carries a combo deal with a price, shown on the category card.
- Dish photos: the owner will supply real photos for dishes; category cards stay line art. Until photos arrive, dishes fall back to the category line art on a plate.
- Menu content in `data/menu.json` is a **sample drafted by Claude** (names, prices, combos are illustrative) for the owner to replace.
- Open: brand spelling "Wok & Flame" vs "Oak & Flame"; real opening hours; real menu.

## Brand Commitments

- Cream `#F5EEDF` ground, bottle-green `#006A4E` ink for all line art and text.
- Familjen Grotesk (UI, headlines) + Gochi Hand (handwritten accent words, prices).
- Hand-inked single-colour line illustrations; visual reference is the humbleteam coffee app (`assets/reference/`).

## Evidence on Hand

- `assets/illustrations/chef-cooking.svg`, `tea-cup.svg` (Vecteezy) used by the splash.
- No real menu, dish photos, address or hours yet. Do not invent ratings, reviews or calorie claims.

## Product Principles

1. The waiter is the checkout: the list must be legible to a second person across a table.
2. Categories first, dishes second: the swipe row answers "what kind of food?", the grid answers "which dish?".
3. Availability and veg/non-veg are never hidden behind a tap.
4. Motion gives feedback (selection, adding to the list), never blocks reading.

## Accessibility & Inclusion

Large tap targets (≥44px), works one-handed, respects `prefers-reduced-motion`, readable in bright restaurant light and dim evening light.
