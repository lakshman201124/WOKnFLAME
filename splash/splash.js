(async () => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = $("#stage");
  const loader = $("#loader");
  const welcome = $("#welcome");
  const tin = $("#tin");
  const pan = $("#pan");
  const art = $("#art");
  const flow = $("#flow");
  const ripples = $$("#ripples ellipse");
  const sizzle = $$("#sizzle circle");
  const pct = $("#pct");
  const cta = $("#cta");
  const wipe = $("#wipe");

  const WRIST = "388 262"; // tin pivots in the pouring hand
  const GRIP = "604 394";  // pan pivots in the right hand
  const glass = $("#glass");
  const mugLean = $("#mugLean");
  const mugWobble = $("#mugWobble");
  const steam2 = $("#mugSteam");
  const steamPuff = steam2.parentNode; // masked wrapper, so the puff and the sway don't fight
  const teaPath = $("#tea");
  const hint = $("#mugHint");
  const hintArrow = $("#mugHint path");

  const MUG_FOOT = "150 345";   // the mug rocks on its base
  const STEAM_ROOT = "150 164"; // where the steam leaves the rim
  let hintDone = false;
  let hintBob = null;

  // ── helpers ────────────────────────────────────────────
  // Hide a stroke so it can be drawn on; returns the elements.
  function prepDraw(els) {
    els.forEach((el) => {
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    });
    return els;
  }

  // Line boil: step the noise seed so the ink looks hand-redrawn each frame.
  function startBoil() {
    const noise = $("#boilNoise");
    let seed = 1;
    setInterval(() => noise.setAttribute("seed", (seed = (seed % 3) + 1)), 140);
  }

  // A unit-radius blob with an inky, irregular edge (smooth closed curve through jittered points).
  function inkBlob(points = 26, jitter = 0.16) {
    const pts = Array.from({ length: points }, (_, i) => {
      const a = (i / points) * Math.PI * 2;
      const r = 1 + gsap.utils.random(-jitter, jitter);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    const at = (i) => pts[(i + points) % points];
    let d = `M${at(0)[0].toFixed(3)},${at(0)[1].toFixed(3)}`;
    for (let i = 0; i < points; i++) {
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1.map((v) => v.toFixed(3))} ${c2.map((v) => v.toFixed(3))} ${p2.map((v) => v.toFixed(3))}`;
    }
    return d + "Z";
  }

  // Stagger halo + line of each steam wisp together.
  const pairs = (each) => (i) => Math.floor(i / 2) * each;

  // Sauté shake: the pan rocks in the chef's hand.
  function shake(amount = 1) {
    return gsap.timeline()
      .to(pan, { rotation: -1.6 * amount, y: -3 * amount, svgOrigin: GRIP, duration: 0.12, ease: "power2.out" })
      .to(pan, { rotation: 0.9 * amount, y: 0, svgOrigin: GRIP, duration: 0.14, ease: "power2.inOut" })
      .to(pan, { rotation: 0, svgOrigin: GRIP, duration: 0.5, ease: "elastic.out(1, 0.45)" });
  }

  // Inline the engraving once so the three <use> layers share it and nothing paints blank.
  const ENGRAVING = "../assets/illustrations/chef-cooking.sprite.svg";
  try {
    const markup = await (await fetch(ENGRAVING)).text();
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    holder.innerHTML = markup;
    document.body.prepend(holder);
  } catch (err) {
    console.warn("Chef engraving failed to load", err);
  }

  // ── master timeline ───────────────────────────────────
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // Scene 1: the engraving inks itself in, the chef pours, the pan sizzles
  $$("#steam path").forEach((line) => {
    const halo = line.cloneNode();
    halo.classList.add("halo");
    line.before(halo);
  });
  const steam = prepDraw($$("#steam path"));
  $("#revealBlob").setAttribute("d", inkBlob());
  gsap.set(sizzle, { autoAlpha: 0, transformOrigin: "50% 50%" });
  gsap.set(ripples, { autoAlpha: 0, transformOrigin: "50% 50%" });
  gsap.set(steam, { autoAlpha: 0 }); // round caps would show as dots before drawing

  tl.fromTo(".brand-mark, .loader__meta", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0)
    .fromTo("#revealBlob", { x: 520, y: 180, scale: 0, transformOrigin: "50% 50%" }, { scale: 640, duration: 1.5, ease: "power2.inOut" }, 0.05)
    .call(() => art.removeAttribute("mask"), null, 1.6) // masks re-composite every frame; drop it once revealed
    .to(pct, { innerText: 100, snap: { innerText: 1 }, duration: 3.7, ease: "power1.inOut" }, 0.1)

    // the tin pulses as it pours; glints run down the oil, ripples spread in the pan
    .to(tin, {
      keyframes: [
        { rotation: -2.2, duration: 0.35, ease: "sine.inOut" },
        { rotation: 0.6, duration: 0.35, ease: "sine.inOut" },
        { rotation: 0, duration: 0.3, ease: "sine.inOut" },
      ],
      svgOrigin: WRIST,
      repeat: 1,
    }, 1.2)
    .to(flow, { opacity: 0.9, duration: 0.3 }, 1.1)
    .to(flow, { strokeDashoffset: -150, duration: 2.6, ease: "none" }, 1.1)
    .fromTo(ripples,
      { attr: { rx: 6, ry: 1.5 }, autoAlpha: 1 },
      { attr: { rx: 46, ry: 9 }, autoAlpha: 0, duration: 0.9, ease: "power1.out", stagger: { each: 0.3, repeat: 2 }, immediateRender: false },
      1.3)

    // hot oil spits
    .to(sizzle, {
      keyframes: [
        { autoAlpha: 1, y: () => gsap.utils.random(-14, -26), duration: 0.18, ease: "power2.out" },
        { autoAlpha: 0, y: 0, duration: 0.22, ease: "power2.in" },
      ],
      stagger: { each: 0.07, repeat: 3, from: "random" },
    }, 2.1)
    .set(steam, { autoAlpha: 1 }, 2.2)
    .to(steam, { strokeDashoffset: 0, duration: 0.9, ease: "power1.out", stagger: pairs(0.15) }, 2.2)
    .from(steam, { y: 16, duration: 1, ease: "power1.out", stagger: pairs(0.15) }, 2.2)
    .add(shake(1), 2.45)
    .add(shake(1.2), 3.05)

    // final flick, steam whooshes up
    .to(flow, { opacity: 0, duration: 0.2 }, 3.6)
    .add(shake(1.8), 3.65)
    .to(steam, { y: -60, autoAlpha: 0, scaleY: 1.3, transformOrigin: "50% 100%", duration: 0.7, ease: "power2.in", stagger: pairs(0.05) }, 3.75);

  // Push transition into the welcome screen
  tl.addLabel("welcome", 4.25)
    .set(welcome, { autoAlpha: 1 }, "welcome")
    .to(loader, { xPercent: -105, duration: 0.9, ease: "power3.inOut" }, "welcome")
    .from(".slide", {
      x: () => stage.clientWidth * 1.1,
      duration: 1.05,
      ease: "power3.out",
      stagger: 0.06,
    }, "welcome+=0.15")
    .fromTo(".write",
      { clipPath: "inset(-20% 100% -20% -5%)" },
      { clipPath: "inset(-20% 0% -20% -5%)", duration: 0.9, ease: "steps(14)" },
      "welcome+=0.75")
    .from("#glass", {
      yPercent: 70,
      xPercent: 20,
      rotation: 18,
      transformOrigin: "50% 100%",
      duration: 1,
      ease: "back.out(1.3)",
    }, "welcome+=0.35");

  // Scene 2: steam curls up out of the mug
  tl.addLabel("splash", "welcome+=1.15")
    .to("#steamReveal", { attr: { y: 60 }, duration: 1.2, ease: "power2.out" }, "splash")
    // the tea settles after the mug lands
    .call(() => slosh(1, 2.5), null, "welcome+=1.1");

  // Scene 3: CTA
  const ring = prepDraw($$(".cta__ring rect"));
  tl.addLabel("cta", "splash+=0.85")
    .set(cta, { autoAlpha: 1 }, "cta")
    .to(ring, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, "cta")
    .from(".cta__icon", { scale: 0, duration: 0.5, ease: "back.out(2)" }, "cta+=0.1")
    .from(".cta__icon svg", { x: -14, autoAlpha: 0, duration: 0.4 }, "cta+=0.35")
    .from(".cta__label", { y: 14, autoAlpha: 0, duration: 0.5 }, "cta+=0.3")
    .fromTo(hint, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5 }, "cta+=0.7")
    .to(prepDraw([hintArrow]), { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, "cta+=0.9")
    .call(startIdle);

  gsap.set(cta, { autoAlpha: 0 });

  // ── ambient loops (outside the master timeline) ────────
  let idleStarted = false;
  function startIdle() {
    if (idleStarted || reduceMotion) return;
    idleStarted = true;
    gsap.to(".cta__icon svg", { x: 4, duration: 0.5, ease: "power1.inOut", repeat: -1, yoyo: true, repeatDelay: 1.4 });
    // steam drifts and breathes, pivoting where it leaves the rim
    gsap.to(steam2, { skewX: 6, svgOrigin: STEAM_ROOT, duration: 2.6, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(steam2, { scaleY: 1.06, svgOrigin: STEAM_ROOT, duration: 1.9, ease: "sine.inOut", repeat: -1, yoyo: true });
    if (!hintDone) hintBob = gsap.to(hint, { y: -4, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true });
  }

  // ── the mug ───────────────────────────────────────────
  // Tea surface: a damped spring keeps it level while the mug tilts, so it lags and sloshes.
  const tea = { slope: 0, vel: 0, amp: 0.8, phase: 0 };
  const TEA_LEVEL = 226;
  const mugRotation = () => gsap.getProperty(mugLean, "rotation") + gsap.getProperty(mugWobble, "rotation");

  function drawTea() {
    const y = (x) => TEA_LEVEL + tea.slope * (x - 150)
      + tea.amp * Math.sin(x * 0.06 + tea.phase)
      + tea.amp * 0.45 * Math.sin(x * 0.15 - tea.phase * 1.6);
    let d = `M60,${y(60).toFixed(1)}`;
    for (let x = 65; x <= 240; x += 5) d += `L${x},${y(x).toFixed(1)}`;
    teaPath.setAttribute("d", d + "L240,345L60,345Z");
  }

  function stepTea() {
    const dt = Math.min(gsap.ticker.deltaRatio(60) / 60, 0.05);
    const target = -Math.tan((mugRotation() * Math.PI) / 180);
    tea.vel += (60 * (target - tea.slope) - 3.5 * tea.vel) * dt;
    tea.slope += tea.vel * dt;
    tea.amp += (0.8 - tea.amp) * Math.min(1, dt * 1.1);
    tea.phase += dt * (2.2 + tea.amp * 0.35);
    drawTea();
  }

  // Kick the surface: `amp` makes waves, `push` starts it rocking.
  function slosh(amp, push = 0) {
    tea.amp = Math.min(tea.amp + amp, 9);
    tea.vel += push;
  }

  // Tap: the mug wobbles on its foot, the tea sloshes, the steam puffs up.
  function swirl() {
    if (tl.time() < tl.labels.splash) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    gsap.killTweensOf(mugWobble);
    gsap.timeline()
      .to(mugWobble, { rotation: 8 * dir, svgOrigin: MUG_FOOT, duration: 0.14, ease: "power2.out" })
      .to(mugWobble, { rotation: -4 * dir, svgOrigin: MUG_FOOT, duration: 0.2, ease: "power2.inOut" })
      .to(mugWobble, { rotation: 0, svgOrigin: MUG_FOOT, duration: 1, ease: "elastic.out(1, 0.35)" });
    slosh(5, 1.5 * dir);
    gsap.killTweensOf(steamPuff);
    gsap.timeline()
      .to(steamPuff, { scaleY: 1.3, scaleX: 0.9, y: -10, svgOrigin: STEAM_ROOT, duration: 0.25, ease: "power2.out" })
      .to(steamPuff, { scaleY: 1, scaleX: 1, y: 0, svgOrigin: STEAM_ROOT, duration: 1.1, ease: "elastic.out(1, 0.4)" });
    if (!hintDone) {
      hintDone = true;
      if (hintBob) hintBob.kill();
      gsap.to(hint, { autoAlpha: 0, y: 10, duration: 0.4 });
    }
  }

  drawTea();
  if (!reduceMotion) gsap.ticker.add(stepTea);

  glass.addEventListener("pointerdown", swirl);
  glass.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      swirl();
    }
  });

  // With a mouse, the mug leans a little toward the cursor.
  if (!reduceMotion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    gsap.set(mugLean, { svgOrigin: MUG_FOOT });
    const leanTo = gsap.quickTo(mugLean, "rotation", { duration: 0.7, ease: "power3.out" });
    stage.addEventListener("pointermove", (e) => {
      if (!idleStarted) return;
      const g = glass.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      const dx = (e.clientX - (g.left + g.width / 2)) / (s.width / 2);
      leanTo(gsap.utils.clamp(-1, 1, dx) * 6);
    });
    stage.addEventListener("pointerleave", () => leanTo(0));
  }

  // ── interactions ──────────────────────────────────────
  // Tap during the loader to fast-forward to the welcome screen.
  stage.addEventListener("pointerdown", () => {
    if (tl.time() < tl.labels.welcome) tl.timeScale(4);
  });
  tl.call(() => tl.timeScale(1), null, "welcome");

  let leaving = false;
  cta.addEventListener("click", (e) => {
    e.preventDefault();
    if (leaving) return;
    leaving = true;
    const s = stage.getBoundingClientRect();
    const b = $(".cta__icon").getBoundingClientRect();
    const x = b.left + b.width / 2 - s.left;
    const y = b.top + b.height / 2 - s.top;
    const r = Math.hypot(Math.max(x, s.width - x), Math.max(y, s.height - y));

    gsap.timeline()
      .fromTo(wipe, { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${r}px at ${x}px ${y}px)`, duration: 0.8, ease: "power3.inOut" })
      .from(wipe.firstElementChild, { y: 20, autoAlpha: 0, duration: 0.4 }, "-=0.25")
      // The menu picks up the same ink cover and shrinks it away.
      .call(() => location.assign("../menu/?from=splash"), null, "+=0.35");
  });

  // Back from the menu restores this page from the bfcache with the ink wipe still covering it.
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false;
    gsap.set(wipe, { clipPath: "circle(0px at 50% 100%)" });
    gsap.set(wipe.firstElementChild, { clearProps: "all" });
  });

  // ── start ─────────────────────────────────────────────
  if (reduceMotion) {
    tl.progress(1);
    return;
  }

  startBoil();

  // Debug: ?t=5.4 freezes the timeline at 5.4s for screenshots.
  const t = new URLSearchParams(location.search).get("t");
  if (t !== null) {
    tl.pause().seek(parseFloat(t));
  }

  window.__splash = tl;
})();
