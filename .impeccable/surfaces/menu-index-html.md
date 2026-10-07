---
version: 1
slug: "menu-index-html"
primary_target: "menu/index.html"
related_targets: []
---

# Surface: menu (`menu/index.html`)

Mode: Operate (diner browses and builds a list to show the waiter). Inherits the splash world.

Audience/job: seated diner on a phone, choosing by category, then dish; adds to a view-only list.
Content: sample menu in `data/menu.json` (11 categories, each with a combo price). Dish photos come later; fall back to category line art on a plate.
Layout (user-specified): top = reference's light screen (brand row, mixed grotesk/handwritten headline, swipeable tall category cards with a painted combo price stamp); below = reference image 4 (sticky category icon band, veg/non-veg tabs, 2-column dish cards with Available + price, dish detail with stepper). Bottom pill nav.

## Direction contract

THESIS: one swipe drives the whole page. The centred category card inks itself in and the dish grid below re-plates to match; refuses the static tab-list-of-dishes menu.
OWN-WORLD: cream paper, bottle-green ink only (plus a chili red for the non-veg mark). Outlined 1.5px ink cards, the selected one filled solid ink with cream line art. Prices are hand-lettered on a painted brush stamp.
STORY: diner sees what kinds of food exist, picks one by swiping, scans dishes with veg/available at a glance, taps + and watches it fly into "my list", shows the list to the waiter.
FIRST VIEWPORT: brand row + list button; 3-line headline ending in handwritten "dig right in!"; carousel of ~60vw cards, centred card filled, neighbours peeking; bottom pill nav.
FORM: reference-led app screen (user-pinned), position 1; no concept-seed roll (layout precisely specified by the user).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
