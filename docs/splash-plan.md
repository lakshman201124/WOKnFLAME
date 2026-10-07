# Splash Screen — Plan (V1)

Reference: `assets/reference/frame_0000–0160.png` (humbleteam coffee app). What we take from it:
- Hand-inked, slightly wobbly single-colour line illustrations.
- Type pairing: clean grotesk headline + marker-style handwritten accent word.
- A loader scene with an illustration + handwritten `%` counter.
- A horizontal push into the welcome screen, where elements arrive one by one with a lag.
- A tilted cup erupting with a splash, info block on the left, round arrow CTA bottom-left.

What we change: **cream background, bottle-green ink lines** (reference is the inverse), and the story is ours —
a multi-cuisine kitchen, not coffee.

## Palette & type
| Token | Value | Use |
|---|---|---|
| `--cream` | `#F5EEDF` | background |
| `--ink` | `#006A4E` (bottle green) | every line, all text |
| `--ink-soft` | ink @ 10% | splat fills, hover tints |

- Sans: **Familjen Grotesk** (headline, body).
- Hand: **Gochi Hand** (brand word, `%` counter, hours), same role as "haven!" in the reference.

## Storyboard (~7s, one GSAP master timeline)

| Time | Scene | What happens |
|---|---|---|
| 0.0–1.5s | **1 · Loader / Chef** | Chef engraving (`assets/illustrations/chef-cooking.svg`) inks in from his face via a wobbly blob mask. `0%` counter starts. Caption: "Warming up the kitchen". |
| 1.1–3.6s | Pour | The tin pulses in his hand, cream glints run down the oil stream, ripples spread in the pan. Hot oil spits, steam wisps rise. |
| 2.45s, 3.05s | Sauté shake | The pan rocks around the chef's grip. |
| 3.65s | Final flick | Bigger shake; steam whooshes up and away. |
| 4.2s | **Push transition** | Loader scene slides out left; welcome elements slide in from the right one after another (reference's lag effect). |
| 4.5s | Mug enters | The tea mug rises in from the bottom-right, slightly tilted. "Wok & Flame!" writes itself (clip reveal). |
| 5.2s | **2 · Tea splash** | Steam curls up out of the line-drawn tea mug (mask reveal from the rim); the tea inside settles with a slosh. |
| 6.0s | **3 · CTA** | Pill outline draws on, arrow slides in, "Open the menu" rises. |
| idle | Loop | Arrow nudges, mug lines "boil", steam sways, tea ripples. "give it a tap!" note bobs next to the mug. |
| tap mug | Interaction | Mug wobbles on its foot, tea sloshes (damped spring keeps the surface level), steam puffs. With a mouse the mug leans toward the cursor. Enter/Space work too. |

Tapping during the loader fast-forwards (×4) to the welcome screen. `prefers-reduced-motion` jumps straight
to the final frame with no loops.

## Techniques
- **GSAP 3.13 master timeline** with labels (`welcome`, `splash`, `cta`) → one seekable playhead.
- **Stroke draw-on**: `getTotalLength()` → `strokeDasharray/offset` tweened to 0.
- **Line boil** (hand-drawn life): SVG `feTurbulence + feDisplacementMap`, seed stepped every 140ms (classic
  animation "boil"). Applied only to illustrations.
- **Animating a traced engraving**: the chef SVG is one auto-trace (502 filled shapes, one giant outline), so
  moving parts are cut out with `clipPath` (tin, pan) and masked out of a base layer; all three layers `<use>`
  the same inlined art. Tin pivots at the wrist, pan at the grip.
- **Ink-spread reveal**: a JS-built wobbly blob in a `<mask>` scales up (no per-frame filter); mask is removed
  once revealed.
- **Splash**: crown `scaleY` from the rim with `back.out`; droplets tween from the rim to their resting spot.
- **Screen splats**: `back.out(2)` pop → drip `y` + fade.
- **CTA exit**: ink circle `clip-path` wipe from the button (hand-off point to the menu).
- Ambient loops (float, nudge) live **outside** the master timeline so its duration stays finite.
- Debug: `?t=5.4` freezes the timeline at 5.4s for screenshots.

## Files
```
splash/
├── index.html   # markup + inline SVG illustrations
├── splash.css   # tokens, layout
└── splash.js    # GSAP timeline
```
Mobile-first; stage is capped at 440px wide and centred on desktop.

## Placeholders to confirm
- Opening hours (`12 pm – 11 pm`) and the cuisine list (Indian / Chinese / Thai / Continental).
- CTA currently plays the wipe and returns, because the menu isn't built yet (`TODO` in `splash.js`).
- Brand spelling "Wok & Flame".
