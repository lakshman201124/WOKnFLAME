# Design

Wok & Flame's visual world, as built in `splash/` and `menu/`. Reference: humbleteam coffee app (`assets/reference/`), re-inked in our colours.

## Colour
| Token | Value | Role |
|---|---|---|
| `--cream` | `#F5EEDF` | page ground |
| `--paper` | `#FBF6EB` | outlined card stock |
| `--ink` | `#006A4E` | every line, all text, filled panels |
| `--chili` | `#B23E27` | non-veg mark, sold-out pill, tab underline, list badge. Use sparingly. |
| `--egg` | `#B07514` | egg mark only |

One ink colour carries the whole UI. Selection is shown by **inverting**: outlined card → solid ink card with cream lines.

## Type
- **Familjen Grotesk** 400/500/600: headlines, UI, prices in the grid.
- **Gochi Hand**: one handwritten word per moment (headline end, category names, dish names, combo prices, sheet titles).

## Shapes
- Cards 14–16px radius, 1.5px ink border, no shadow. Pills only for small controls (nav, stepper, CTA, toggle).
- Plates: circle with an inner ring at 50% opacity. Photo plates drop the rings.
- Painted brush stamp (`#brush`) behind combo prices, tilted −7°.

## Line art
- Food drawings live as `<symbol id="art-*">` in `menu/index.html` (120×120 grid) and are cloned inline by JS.
- `class="o"` shapes are filled with `--art-bg` to hide the lines behind them; set `--art-bg` to the surface colour wherever art sits.
- Strokes use `vector-effect: non-scaling-stroke`: 2.1px on cards, 1.4px in the category band.
- `.steam` / `.flame` groups animate when their card is selected.

## Motion (GSAP 3.13)
- Expo-out for arrivals, power-in for exits. Elements are visible by default; motion is layered on.
- Signature: the Top dishes rail fans its cards, the centred card inks in, and its price paints on and rolls.
- Feedback: the dish plate arcs into the list button, then the badge springs.
- `prefers-reduced-motion`: no GSAP, no CSS loops.
