(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // GSAP drives every authored motion; without it (or with reduced motion) the page is static but complete.
  const G = window.gsap && !reduceMotion ? window.gsap : null;

  const LIST_KEY = "wf:list";
  const VEG_KEY = "wf:veg";
  const DIET = { veg: "Veg", nonveg: "Non-veg", egg: "Contains egg" };
  const SPICE = ["Not spicy", "Mild", "Medium", "Hot"];

  const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "ico") => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: list just won't persist */ }
    },
  };

  const el = {
    app: $("#app"),
    dock: $("#dock"),
    cover: $("#cover"),
    rail: $("#rail"),
    band: $("#bandTrack"),
    bandPill: $("#bandPill"),
    title: $("#catTitle"),
    tabs: $("#tabs"),
    tabsLine: $("#tabsLine"),
    grid: $("#grid"),
    dishes: $("#catView"),
    topView: $("#topView"),
    tiles: $("#tiles"),
    badge: $("#badge"),
    listBtn: $("#listBtn"),
    veg: $("#vegToggle"),
    detail: $("#detail"),
    detailPanel: $("#detailPanel"),
    listSheet: $("#listSheet"),
    listBody: $("#listBody"),
    listFoot: $("#listFoot"),
    total: $("#total"),
    totalCount: $("#totalCount"),
    searchSheet: $("#searchSheet"),
    searchInput: $("#searchInput"),
    searchBody: $("#searchBody"),
    toast: $("#toast"),
  };

  const state = {
    cats: [],
    catById: new Map(),
    dishes: [],
    items: new Map(), // dishes + combos, by id
    cat: null,
    tab: "all",
    veg: store.get(VEG_KEY, false) === true,
    list: new Map(),
    cards: [],
    bandBtns: [],
    visIdx: -1,
  };

  // ── data ──────────────────────────────────────────────
  async function loadMenu() {
    const res = await fetch("../data/menu.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`menu.json ${res.status}`);
    return res.json();
  }

  function ingest(data) {
    state.cats = (data.categories || []).map((c) => ({ ...c, art: c.art || "wok" }));
    state.catById = new Map(state.cats.map((c) => [c.id, c]));
    state.dishes = (data.dishes || [])
      .filter((d) => state.catById.has(d.category))
      .map((d) => ({
        kind: "dish",
        available: d.available !== false,
        diet: DIET[d.diet] ? d.diet : "veg",
        spice: Math.max(0, Math.min(3, d.spice | 0)),
        portion: d.portion || "",
        ingredients: d.ingredients || "",
        ...d,
      }));
    state.items = new Map(state.dishes.map((d) => [d.id, d]));
    for (const c of state.cats) {
      if (!c.combo) continue;
      const id = `combo-${c.id}`;
      state.items.set(id, {
        id,
        kind: "combo",
        category: c.id,
        name: c.combo.name,
        price: c.combo.price,
        includes: c.combo.includes || [],
        diet: DIET[c.combo.diet] ? c.combo.diet : "veg",
        portion: plural((c.combo.includes || []).length, "item", "items"),
        available: c.combo.available !== false,
        image: c.combo.image || null,
      });
    }
    const saved = store.get(LIST_KEY, []);
    state.list = new Map(Array.isArray(saved) ? saved.filter(([id, q]) => state.items.has(id) && q > 0) : []);

  }

  const catOf = (item) => state.catById.get(item.category);
  const passesVeg = (it) => !state.veg || it.diet === "veg";
  const dishesIn = (catId) => state.dishes.filter((d) => d.category === catId && passesVeg(d));

  // ── markup helpers ────────────────────────────────────
  // Clone a food drawing inline (not <use>) so steam and flames can be styled per card.
  function art(name, cls = "art") {
    const sym = document.getElementById(`art-${name}`) || document.getElementById("art-wok");
    return `<svg class="${cls}" viewBox="${sym.getAttribute("viewBox")}" aria-hidden="true" focusable="false">${sym.innerHTML}</svg>`;
  }

  function plate(item) {
    const c = catOf(item);
    if (item.image) {
      return `<div class="plate plate--photo"><img src="${esc(item.image)}" alt="" loading="lazy" decoding="async" data-art="${esc(c.art)}"></div>`;
    }
    return `<div class="plate">${art(c.art)}</div>`;
  }

  const mark = (diet) => `<span class="mark mark--${diet}" role="img" aria-label="${DIET[diet]}"></span>`;

  function rollDigits(n) {
    const digits = "01234567890123456789".split("").map((x) => `<span>${x}</span>`).join("");
    return "₹" + String(n).split("").map((d) =>
      /\d/.test(d)
        ? `<span class="roll"><span class="roll__col" data-d="${d}" style="transform:translateY(-${d}em)">${digits}</span></span>`
        : d
    ).join("");
  }

  function addBtn(it, q) {
    return q
      ? `<button class="add is-in" type="button" data-add="${esc(it.id)}" aria-label="Add one more ${esc(it.name)}, ${q} in your list"><span class="add__n">${q}</span></button>`
      : `<button class="add" type="button" data-add="${esc(it.id)}" aria-label="Add ${esc(it.name)} to my list">${icon("plus")}</button>`;
  }

  // ── top dishes rail ───────────────────────────────────
  const TOP = "top";

  // Chef's picks and combos, interleaved so the row alternates dish / deal.
  function topItems() {
    const picks = state.dishes.filter((d) => d.chefPick && d.available && passesVeg(d));
    const combos = state.cats
      .map((c) => state.items.get(`combo-${c.id}`))
      .filter((it) => it && it.available && passesVeg(it));
    const out = [];
    for (let i = 0; i < Math.max(picks.length, combos.length); i++) {
      if (picks[i]) out.push(picks[i]);
      if (combos[i]) out.push(combos[i]);
    }
    return out;
  }

  function topCard(it) {
    const c = catOf(it);
    const combo = it.kind === "combo";
    return `
      <div class="card" role="listitem" data-id="${esc(it.id)}">
        <button class="card__hit" type="button" data-open="${esc(it.id)}" aria-label="${esc(it.name)}${combo ? " combo" : ""}, ${rupee(it.price)}. See details"></button>
        <p class="card__lead" aria-hidden="true">${combo ? `${esc(c.name)} combo` : esc(c.name)}</p>
        <p class="card__name" aria-hidden="true">${esc(it.name)}</p>
        <div class="card__art">${plate(it)}</div>
        <span class="stamp" aria-hidden="true">
          ${combo ? `<span class="stamp__label">combo</span>` : ""}
          <span class="stamp__ink">
            <svg viewBox="0 0 130 54"><use href="#brush"/></svg>
            <span class="stamp__price">${rollDigits(it.price)}</span>
          </span>
        </span>
        <div class="card__foot">
          <span class="card__tag">${mark(it.diet)}${combo ? esc(it.portion) : "chef’s pick"}</span>
          ${addBtn(it, state.list.get(it.id) || 0)}
        </div>
      </div>`;
  }

  // keepId re-renders in place: the rail stays on that item (or the same slot if it was
  // filtered out) and it is marked active directly, so the price doesn't repaint and roll.
  function renderRail(keepId) {
    const prevIdx = state.visIdx;
    const items = topItems();
    el.rail.removeAttribute("aria-busy");
    el.rail.innerHTML = items.length
      ? items.map(topCard).join("")
      : `<p class="rail__status">No veg picks today.<br><button type="button" data-veg-off>Show all dishes</button></p>`;
    state.cards = $$(".card", el.rail);
    state.visIdx = -1;
    let i = -1;
    if (keepId && !el.topView.hidden && state.cards.length) {
      i = state.cards.findIndex((c) => c.dataset.id === keepId);
      if (i < 0) i = Math.min(Math.max(prevIdx, 0), state.cards.length - 1);
    }
    if (i >= 0) {
      state.visIdx = i;
      state.cards[i].classList.add("is-active");
      el.rail.scrollLeft = state.cards[i].offsetLeft - railPad();
    } else {
      el.rail.scrollLeft = 0;
    }
    paintRail();
  }

  function renderTiles() {
    el.tiles.innerHTML = state.cats.map((c) => `
      <button class="tile" type="button" data-cat="${esc(c.id)}">
        ${art(c.art)}
        <span class="tile__name">${esc(c.name)}</span>
        <span class="tile__count">${plural(dishesIn(c.id).length, "dish", "dishes")}</span>
      </button>`).join("");
  }

  let railRaf = 0;
  function onRailScroll() {
    if (!railRaf) railRaf = requestAnimationFrame(paintRail);
  }

  // The focus point is the snap position: centre on phones, the left gutter on wide screens.
  const railPad = () => parseFloat(getComputedStyle(el.rail).paddingLeft) || 0;

  // Cards fan out from the focused one, which inks itself in.
  function paintRail() {
    railRaf = 0;
    if (!state.cards.length || el.topView.hidden) return;
    const w = state.cards[0].offsetWidth;
    const mid = el.rail.scrollLeft + railPad() + w / 2;
    let best = 0;
    let bestD = Infinity;
    state.cards.forEach((card, i) => {
      const d = (card.offsetLeft + card.offsetWidth / 2 - mid) / (card.offsetWidth + 14);
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
      if (!reduceMotion) {
        const c = Math.max(-1.6, Math.min(1.6, d));
        const a = Math.abs(c);
        card.style.transform = `translateY(${(a * 14).toFixed(1)}px) rotate(${(c * 3).toFixed(2)}deg) scale(${(1 - a * 0.05).toFixed(3)})`;
      }
    });
    if (best !== state.visIdx) {
      state.cards[state.visIdx]?.classList.remove("is-active");
      state.visIdx = best;
      state.cards[best].classList.add("is-active");
      inkStamp(state.cards[best]);
    }
  }

  function scrollRailToIndex(i, smooth) {
    const card = state.cards[i];
    if (!card) return;
    el.rail.scrollTo({ left: card.offsetLeft - railPad(), behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  }

  function stepRail(dir) {
    scrollRailToIndex(Math.max(0, Math.min(state.cards.length - 1, state.visIdx + dir)), true);
  }

  // The price paints on with a brush, then its digits roll.
  function inkStamp(card) {
    if (!G) return;
    const svg = $(".stamp__ink svg", card);
    if (!svg) return;
    G.fromTo(svg, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power2.out" });
    const cols = $$(".roll__col", card);
    const h = cols[0]?.firstElementChild.offsetHeight || 30;
    cols.forEach((col, i) => {
      const d = Number(col.dataset.d);
      G.fromTo(col, { y: -d * h }, { y: -(10 + d) * h, duration: 0.9 + i * 0.18, ease: "expo.out", delay: 0.12 });
    });
  }

  // ── band, tabs, grid ──────────────────────────────────
  function renderBand() {
    const entries = [{ id: TOP, name: "Top dishes", art: "top" }, ...state.cats];
    el.band.insertAdjacentHTML("beforeend", entries.map((c) => `
      <button class="band__btn" type="button" data-cat="${esc(c.id)}" aria-current="false">${art(c.art)}<span>${esc(c.name)}</span></button>`).join(""));
    state.bandBtns = $$(".band__btn", el.band);
  }

  function move(node, x, width, animate) {
    if (G) G[animate ? "to" : "set"](node, { x, width, duration: 0.55, ease: "expo.out" });
    else { node.style.transform = `translateX(${x}px)`; node.style.width = `${width}px`; }
  }

  function syncBand(animate) {
    const btn = state.bandBtns.find((b) => b.dataset.cat === state.cat);
    if (!btn) return;
    state.bandBtns.forEach((b) => b.setAttribute("aria-current", String(b === btn)));
    move(el.bandPill, btn.offsetLeft, btn.offsetWidth, animate);
    el.band.scrollTo({
      left: btn.offsetLeft - el.band.clientWidth / 2 + btn.offsetWidth / 2,
      behavior: animate && !reduceMotion ? "smooth" : "auto",
    });
  }

  function renderTabs(animate) {
    const all = dishesIn(state.cat);
    const veg = all.filter((d) => d.diet === "veg").length;
    const non = all.length - veg;
    const tabs = [["all", "All", all.length]];
    if (veg && non) tabs.push(["veg", "Veg", veg], ["nonveg", "Non-veg", non]);
    if (!tabs.some(([k]) => k === state.tab)) state.tab = "all";
    $$(".tab", el.tabs).forEach((b) => b.remove());
    el.tabs.insertAdjacentHTML("beforeend", tabs.map(([k, label, n]) => `
      <button class="tab" type="button" data-tab="${k}" aria-pressed="${k === state.tab}">${label}<small>${n}</small></button>`).join(""));
    // The row always keeps its height (even with only "All"), so the grid never jumps.
    moveTabLine(animate);
  }

  function moveTabLine(animate) {
    const b = $('.tab[aria-pressed="true"]', el.tabs);
    if (!b || el.tabs.hidden) return;
    move(el.tabsLine, b.offsetLeft + 12, b.offsetWidth - 24, animate);
  }

  function visibleDishes() {
    let list = dishesIn(state.cat);
    if (state.tab === "veg") list = list.filter((d) => d.diet === "veg");
    if (state.tab === "nonveg") list = list.filter((d) => d.diet !== "veg");
    return list.sort((a, b) => Number(b.available) - Number(a.available));
  }

  function dishCard(d) {
    const q = state.list.get(d.id) || 0;
    return `
      <article class="dish${d.available ? "" : " is-out"}" data-id="${esc(d.id)}">
        <div class="dish__panel">
          <span class="dish__status">${d.available ? "Available" : "Sold out"}</span>
          <span class="dish__price">${rupee(d.price)}</span>
          ${plate(d)}
          ${d.chefPick ? `<span class="pick">${icon("star")}chef’s pick</span>` : ""}
          ${d.available ? addBtn(d, q) : ""}
        </div>
        <h3 class="dish__name"><button class="dish__open" type="button" data-open="${esc(d.id)}">${mark(d.diet)}${esc(d.name)}</button></h3>
        <p class="dish__desc">${esc(d.description)}</p>
      </article>`;
  }

  function renderGrid(animate) {
    const list = visibleDishes();
    const c = state.catById.get(state.cat);
    if (list.length) {
      el.grid.innerHTML = list.map(dishCard).join("");
    } else if (state.veg) {
      el.grid.innerHTML = `
        <div class="empty">
          <div class="plate">${art(c.art)}</div>
          <p class="empty__title">No veg dishes here</p>
          <p>Everything in ${esc(c.name)} has meat, fish or egg.</p>
          <button type="button" data-veg-off>Show all dishes</button>
        </div>`;
    } else {
      el.grid.innerHTML = `
        <div class="empty">
          <div class="plate">${art(c.art)}</div>
          <p class="empty__title">Nothing here yet</p>
          <p>The kitchen is still writing this part of the menu.</p>
        </div>`;
    }
    if (G && animate) {
      G.fromTo(el.grid.children, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.045, clearProps: "transform,opacity" });
    }
  }

  function renderHead(c, animate) {
    el.title.textContent = c.name;
    let line = $(".combo-line", el.dishes);
    if (!line) {
      line = document.createElement("button");
      line.type = "button";
      line.className = "combo-line";
      el.title.after(line);
    }
    line.hidden = !c.combo;
    if (c.combo) {
      line.dataset.open = `combo-${c.id}`;
      line.innerHTML = `${esc(c.combo.name)} combo · ${rupee(c.combo.price)}${icon("chev")}`;
    }
    if (G && animate) G.fromTo([el.title, line], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "expo.out", stagger: 0.06 });
  }

  // TOP shows the swipe cards + category tiles; any other id shows that category's grid.
  function selectCategory(id, source) {
    const isTop = id === TOP;
    const c = state.catById.get(id);
    if (!isTop && !c) return;
    const changed = id !== state.cat;
    const animate = source !== "init";
    state.cat = id;
    if (changed) state.tab = "all";
    el.topView.hidden = !isTop;
    el.dishes.hidden = isTop;
    syncBand(animate);
    if (!changed) return;
    // Jump (not glide) to the top so the swapped-in view starts at its heading.
    if (animate) window.scrollTo({ top: 0, behavior: "instant" });
    if (isTop) {
      paintRail();
      if (G && animate) {
        G.fromTo([$(".view__head", el.topView), el.rail, $(".explore", el.topView)], { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.07, clearProps: "transform,opacity" });
      }
    } else {
      renderHead(c, animate);
      renderTabs(animate);
      renderGrid(animate);
    }
  }

  function setTab(tab) {
    if (tab === state.tab) return;
    state.tab = tab;
    $$(".tab", el.tabs).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
    moveTabLine(true);
    renderGrid(true);
  }

  function setVeg(on) {
    state.veg = on;
    store.set(VEG_KEY, on);
    el.veg.setAttribute("aria-pressed", String(on));
    // Filter in place: no entrance animations, no scroll jumps.
    renderRail(state.cards[state.visIdx]?.dataset.id);
    $$(".tile", el.tiles).forEach((t) => {
      $(".tile__count", t).textContent = plural(dishesIn(t.dataset.cat).length, "dish", "dishes");
    });
    if (state.cat !== TOP) {
      renderTabs(true);
      renderGrid(false);
      if (G) G.fromTo(el.grid, { opacity: 0.4 }, { opacity: 1, duration: 0.3, ease: "power2.out", clearProps: "opacity" });
    }
    if (!el.searchSheet.hidden) renderSearch();
    toast(on ? "Showing veg dishes only" : "Showing all dishes");
  }

  // ── my list ───────────────────────────────────────────
  const listCount = () => [...state.list.values()].reduce((a, b) => a + b, 0);

  function persist() {
    store.set(LIST_KEY, [...state.list]);
  }

  function updateBadge(bump) {
    const n = listCount();
    el.badge.hidden = n === 0;
    el.badge.textContent = n;
    el.listBtn.setAttribute("aria-label", n ? `My list, ${plural(n, "item", "items")}` : "My list, empty");
    if (bump && G && n) {
      G.fromTo(el.badge, { scale: 1.8 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.45)" });
      G.fromTo(el.listBtn, { rotate: -16 }, { rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.35)" });
    }
  }

  function refreshAdd(id) {
    const it = state.items.get(id);
    const q = state.list.get(id) || 0;
    $$(".add").filter((b) => b.dataset.add === id).forEach((b) => {
      const hadFocus = document.activeElement === b;
      b.insertAdjacentHTML("afterend", addBtn(it, q));
      const next = b.nextElementSibling;
      b.remove();
      if (hadFocus) next.focus({ preventScroll: true });
    });
  }

  function setQty(id, q, { badge = true } = {}) {
    if (q > 0) state.list.set(id, q);
    else state.list.delete(id);
    persist();
    refreshAdd(id);
    if (badge) updateBadge(false);
    if (!el.listSheet.hidden) renderList();
  }

  // A copy of the plate arcs into the list button; the badge ticks up when it lands.
  function fly(src, done) {
    if (!G || !src) return done();
    const r = src.getBoundingClientRect();
    const t = el.listBtn.getBoundingClientRect();
    const clone = src.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("flyer");
    Object.assign(clone.style, {
      left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: "50%",
    });
    document.body.appendChild(clone);
    const dx = t.left + t.width / 2 - (r.left + r.width / 2);
    const dy = t.top + t.height / 2 - (r.top + r.height / 2);
    G.timeline({ onComplete() { clone.remove(); done(); } })
      .to(clone, { x: dx, duration: 0.75, ease: "power1.in" }, 0)
      .to(clone, { y: dy, duration: 0.75, ease: "back.in(2.4)" }, 0)
      .to(clone, { scale: Math.min(1, 20 / r.width), rotate: 220, duration: 0.75, ease: "power2.in" }, 0);
  }

  function addOne(id, src) {
    const it = state.items.get(id);
    if (!it || !it.available) return;
    setQty(id, (state.list.get(id) || 0) + 1, { badge: false });
    fly(src, () => updateBadge(true));
  }

  function renderList(focusSel) {
    const rows = [...state.list].map(([id, q]) => [state.items.get(id), q]).filter(([it]) => it);
    const n = rows.reduce((a, [, q]) => a + q, 0);
    const sum = rows.reduce((a, [it, q]) => a + it.price * q, 0);
    el.listFoot.hidden = !rows.length;
    $(".sheet__sub", el.listSheet).hidden = !rows.length;
    el.listBody.innerHTML = rows.length
      ? `<ul class="lines">${rows.map(([it, q]) => `
          <li class="line">
            ${mark(it.diet)}
            <div>
              <p class="line__name">${esc(it.name)}</p>
              <p class="line__meta">${it.kind === "combo" ? "Combo · " : ""}${rupee(it.price)} each${q > 1 ? ` · ${rupee(it.price * q)}` : ""}</p>
            </div>
            <div class="stepper" role="group" aria-label="${esc(it.name)} quantity">
              <button type="button" data-line="${esc(it.id)}" data-step="-1" aria-label="${q === 1 ? "Remove" : "One less"} ${esc(it.name)}">${icon("minus")}</button>
              <output>${q}</output>
              <button type="button" data-line="${esc(it.id)}" data-step="1" aria-label="One more ${esc(it.name)}">${icon("plus")}</button>
            </div>
          </li>`).join("")}</ul>`
      : `<div class="empty">
          <div class="plate">${art("wok")}</div>
          <p class="empty__title">Nothing picked yet</p>
          <p>Tap + on any dish and it lands here, ready to show your waiter.</p>
          <button type="button" data-close>Browse the menu</button>
        </div>`;
    el.total.textContent = rupee(sum);
    el.totalCount.textContent = plural(n, "item", "items");
    if (focusSel) ($(focusSel, el.listBody) || $("[data-close].round", el.listSheet))?.focus({ preventScroll: true });
  }

  function clearList() {
    const snapshot = new Map(state.list);
    state.list.clear();
    persist();
    snapshot.forEach((_, id) => refreshAdd(id));
    updateBadge(false);
    renderList();
    toast("List cleared", "Undo", () => {
      state.list = snapshot;
      persist();
      snapshot.forEach((_, id) => refreshAdd(id));
      updateBadge(true);
      if (!el.listSheet.hidden) renderList();
    });
  }

  // ── search ────────────────────────────────────────────
  function renderSearch() {
    const raw = el.searchInput.value.trim();
    const terms = raw.toLowerCase().split(/\s+/).filter(Boolean);
    let list;
    let label;
    if (!terms.length) {
      list = state.dishes.filter((d) => d.chefPick && passesVeg(d));
      label = "Chef’s picks";
    } else {
      list = state.dishes.filter((d) => {
        if (!passesVeg(d)) return false;
        const hay = `${d.name} ${d.ingredients} ${catOf(d).lead} ${catOf(d).name}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
      label = plural(list.length, "match", "matches");
    }
    el.searchBody.innerHTML = list.length
      ? `<p class="results__label">${label}</p><ul class="lines">${list.map((d) => `
          <li class="result">
            <button class="result__open" type="button" data-open="${esc(d.id)}">
              <span class="result__name">${mark(d.diet)}${esc(d.name)}</span>
              <span class="result__meta">${esc(catOf(d).name)} · ${rupee(d.price)}${d.available ? "" : " · Sold out"}</span>
            </button>
            ${d.available ? addBtn(d, state.list.get(d.id) || 0) : ""}
          </li>`).join("")}</ul>`
      : `<div class="empty">
          <p class="empty__title">Nothing called “${esc(raw)}”</p>
          <p>Try a dish or an ingredient, like paneer, prawn or momos.</p>
        </div>`;
  }

  // ── layers: detail + sheets share one back-button aware stack ──
  const layers = [];

  function openLayer(node, panel) {
    const returnTo = document.activeElement;
    layers.push({ node, returnTo });
    node.hidden = false;
    el.app.inert = true;
    el.dock.inert = true;
    layers.slice(0, -1).forEach((l) => { l.node.inert = true; });
    document.documentElement.classList.add("locked");
    history.pushState({ wfLayer: layers.length }, "");
    if (G) {
      G.fromTo(node.firstElementChild, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      if (panel) G.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: "expo.out" });
    }
  }

  function closeTop() {
    const layer = layers.pop();
    if (!layer) return;
    const { node, returnTo } = layer;
    const finish = () => {
      node.hidden = true;
      if (G) G.set(node.querySelectorAll(".detail__panel, .sheet__panel, .detail__scrim, .sheet__scrim"), { clearProps: "all" });
      const top = layers[layers.length - 1];
      if (top) top.node.inert = false;
      else {
        el.app.inert = false;
        el.dock.inert = false;
        document.documentElement.classList.remove("locked");
      }
      if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
    };
    if (!G) return finish();
    const panel = node.querySelector(".detail__panel, .sheet__panel");
    const tl = G.timeline({ onComplete: finish });
    tl.to(node.firstElementChild, { opacity: 0, duration: 0.25 }, 0);
    if (node === el.detail) tl.to(panel, { opacity: 0, y: 30, duration: 0.25, ease: "power2.in" }, 0);
    else tl.to(panel, { yPercent: 100, duration: 0.35, ease: "power3.in" }, 0);
  }

  // UI closes act at once and swallow the popstate their history.back() causes,
  // so a quick close-then-open can't pop the wrong layer.
  let skipPop = 0;
  function requestClose() {
    if (!layers.length) return;
    closeTop();
    skipPop++;
    history.back();
  }
  window.addEventListener("popstate", () => {
    if (skipPop) { skipPop--; return; }
    if (layers.length) closeTop();
  });

  // ── detail ────────────────────────────────────────────
  let detailItem = null;
  let detailQty = 1;

  function spiceIcons(level) {
    return [1, 2, 3].map((i) => icon("chili", `ico ${i <= level ? "on" : "off"}`)).join("");
  }

  function detailHTML(it) {
    const c = catOf(it);
    const combo = it.kind === "combo";
    return `
      <div class="detail__bar">
        <button class="round" type="button" data-close aria-label="Back to the menu">${icon("back")}</button>
        <span class="detail__crumb">${combo ? `${esc(c.name)} combo` : `${esc(c.lead)} ${esc(c.name)}`}</span>
        <span class="round" aria-hidden="true" style="visibility:hidden"></span>
      </div>
      <div class="detail__hero">${plate(it)}</div>
      <div class="detail__head">
        <h2 class="detail__title" id="detailTitle">${esc(it.name)}</h2>
        ${mark(it.diet)}
      </div>
      ${it.chefPick ? `<p class="detail__pick">${icon("star")} chef’s pick</p>` : ""}
      <div class="detail__band">
        <ul class="facts">
          ${it.portion ? `<li>${esc(it.portion)}</li>` : ""}
          ${combo ? "" : `<li><span class="sr-spice" aria-hidden="true">${spiceIcons(it.spice)}</span>${SPICE[it.spice]}</li>`}
          <li>${DIET[it.diet]}</li>
        </ul>
        ${it.description ? `<p class="detail__desc">${esc(it.description)}</p>` : ""}
        <div class="detail__ing">
          ${combo
            ? `<b>In this combo</b><ul>${it.includes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
            : `<b>What’s in it</b>${esc(it.ingredients)}`}
        </div>
        <div class="buy">
          <p class="buy__price">${rupee(it.price)}</p>
          ${it.available ? `
          <div class="stepper" role="group" aria-label="Quantity">
            <button type="button" data-step="-1" aria-label="One less">${icon("minus")}</button>
            <output id="qty" aria-live="polite">1</output>
            <button type="button" data-step="1" aria-label="One more">${icon("plus")}</button>
          </div>` : ""}
        </div>
        ${it.available
          ? `<button class="cta" type="button" id="buyBtn"></button>`
          : `<button class="cta" type="button" disabled>Sold out today</button>`}
        <p class="detail__note">Your waiter takes the order. This list is just for you.</p>
      </div>`;
  }

  function updateBuy() {
    const it = detailItem;
    if (!it?.available) return;
    const inList = state.list.get(it.id) || 0;
    const q = detailQty;
    const btn = $("#buyBtn");
    $("#qty").textContent = q;
    $('.detail [data-step="-1"]').disabled = q <= (inList ? 0 : 1);
    btn.classList.toggle("cta--remove", inList > 0 && q === 0);
    if (!inList) btn.textContent = `Add to my list · ${rupee(it.price * q)}`;
    else if (q === 0) btn.textContent = "Remove from my list";
    else if (q === inList) btn.textContent = `In your list · ${q}`;
    else btn.textContent = `Update my list · ${rupee(it.price * q)}`;
  }

  function openDetail(id, origin) {
    const it = state.items.get(id);
    if (!it) return;
    detailItem = it;
    detailQty = state.list.get(id) || 1;
    el.detailPanel.innerHTML = detailHTML(it);
    el.detailPanel.scrollTop = 0;
    updateBuy();
    openLayer(el.detail);
    $("[data-close]", el.detailPanel).focus({ preventScroll: true });

    if (!G) return;
    const hero = $(".detail__hero .plate", el.detailPanel);
    const from = origin?.closest(".dish, .card")?.querySelector(".plate");
    const tl = G.timeline();
    tl.fromTo(el.detailPanel, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
    if (from) {
      const a = from.getBoundingClientRect();
      const b = hero.getBoundingClientRect();
      tl.from(hero, {
        x: a.left + a.width / 2 - (b.left + b.width / 2),
        y: a.top + a.height / 2 - (b.top + b.height / 2),
        scale: a.width / b.width,
        duration: 0.7,
        ease: "expo.out",
      }, 0);
    } else {
      tl.from(hero, { scale: 0.6, opacity: 0, duration: 0.6, ease: "expo.out" }, 0);
    }
    tl.from($(".detail__band", el.detailPanel), { y: 80, opacity: 0, duration: 0.7, ease: "expo.out" }, 0.08)
      .from($$(".detail__head > *, .detail__pick, .detail__crumb", el.detailPanel), { y: 14, opacity: 0, duration: 0.5, ease: "expo.out", stagger: 0.05 }, 0.12);
  }

  function commitDetail() {
    const it = detailItem;
    const inList = state.list.get(it.id) || 0;
    const q = detailQty;
    if (q === inList) return requestClose();
    if (q > inList) {
      setQty(it.id, q, { badge: false });
      fly($(".detail__hero .plate", el.detailPanel), () => { updateBadge(true); requestClose(); });
    } else {
      setQty(it.id, q);
      if (q === 0) toast(`${it.name} removed`);
      requestClose();
    }
  }

  // ── toast ─────────────────────────────────────────────
  let toastTimer = 0;
  function hideToast() {
    clearTimeout(toastTimer);
    if (el.toast.hidden) return;
    if (!G) { el.toast.hidden = true; return; }
    G.to(el.toast, { y: 16, opacity: 0, duration: 0.25, onComplete: () => { el.toast.hidden = true; } });
  }
  function toast(msg, action, fn) {
    el.toast.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ""}`;
    if (action) $("button", el.toast).addEventListener("click", () => { fn(); hideToast(); });
    el.toast.hidden = false;
    if (G) G.fromTo(el.toast, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "expo.out" });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 2600);
  }

  // ── events ────────────────────────────────────────────
  function bind() {
    el.rail.addEventListener("scroll", onRailScroll, { passive: true });

    el.rail.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = state.cards.indexOf(e.target.closest(".card")) + (e.key === "ArrowRight" ? 1 : -1);
      if (i < 0 || i >= state.cards.length) return;
      e.preventDefault();
      scrollRailToIndex(i, true);
      $(".card__hit", state.cards[i]).focus({ preventScroll: true });
    });
    $("#railPrev").addEventListener("click", () => stepRail(-1));
    $("#railNext").addEventListener("click", () => stepRail(1));

    el.veg.addEventListener("click", () => setVeg(!state.veg));
    $("#topBtn").addEventListener("click", () => {
      selectCategory(TOP, "nav");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
    $("#searchBtn").addEventListener("click", () => {
      renderSearch();
      openLayer(el.searchSheet, $(".sheet__panel", el.searchSheet));
      el.searchInput.focus({ preventScroll: true });
    });
    el.searchInput.addEventListener("input", renderSearch);
    $("#clearList").addEventListener("click", clearList);

    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, [data-close]");
      if (!t) return;

      if (t.matches("[data-close]")) return requestClose();
      if (t.matches("[data-add]")) {
        const src = t.closest(".dish, .card")?.querySelector(".plate") || t;
        return addOne(t.dataset.add, src);
      }
      if (t.matches("[data-open]")) return openDetail(t.dataset.open, t);
      if (t.matches(".band__btn, .tile")) return selectCategory(t.dataset.cat, "band");
      if (t.matches(".tab")) return setTab(t.dataset.tab);
      if (t.matches("[data-veg-off]")) return setVeg(false);
      if (t.matches("[data-open-list]")) {
        renderList();
        openLayer(el.listSheet, $(".sheet__panel", el.listSheet));
        return $("[data-close].round", el.listSheet).focus({ preventScroll: true });
      }
      if (t.matches("[data-line]")) {
        const id = t.dataset.line;
        const d = Number(t.dataset.step);
        setQty(id, (state.list.get(id) || 0) + d);
        return renderList(`[data-line="${CSS.escape(id)}"][data-step="${d}"]`);
      }
      if (t.matches(".detail [data-step]")) {
        const inList = state.list.get(detailItem.id) || 0;
        detailQty = Math.max(inList ? 0 : 1, Math.min(20, detailQty + Number(t.dataset.step)));
        if (G) G.fromTo("#qty", { y: Number(t.dataset.step) * -8, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.3, ease: "expo.out" });
        return updateBuy();
      }
      if (t.id === "buyBtn") return commitDetail();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && layers.length) requestClose();
    });

    // A missing photo falls back to the line-art plate.
    document.addEventListener("error", (e) => {
      const img = e.target;
      if (img.tagName !== "IMG" || !img.closest(".plate")) return;
      const p = img.parentElement;
      p.classList.remove("plate--photo");
      p.innerHTML = art(img.dataset.art);
    }, true);

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.visIdx >= 0) scrollRailToIndex(state.visIdx, false);
        paintRail();
        syncBand(false);
        moveTabLine(false);
      }, 120);
    });
  }

  // ── intro ─────────────────────────────────────────────
  function playCover() {
    const root = document.documentElement;
    if (!root.classList.contains("from-splash")) return false;
    history.replaceState(null, "", location.pathname);
    const done = () => root.classList.remove("from-splash");
    if (!G) { done(); return false; }
    const r = $("#topBtn").getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    G.timeline({ onComplete: done })
      .to(el.cover.firstElementChild, { y: -18, opacity: 0, duration: 0.35, ease: "power2.in" }, 0.2)
      .fromTo(el.cover, { clipPath: `circle(${R}px at ${x}px ${y}px)` },
        { clipPath: `circle(0px at ${x}px ${y}px)`, duration: 0.95, ease: "power3.inOut" }, 0.3);
    return true;
  }

  function intro(fromSplash) {
    if (!G) return;
    const tl = G.timeline({ defaults: { ease: "expo.out" }, delay: fromSplash ? 0.55 : 0 });
    tl.from(".band__btn", { y: -18, opacity: 0, duration: 0.6, stagger: 0.035 })
      .from(el.bandPill, { opacity: 0, scale: 0.6, duration: 0.5 }, 0.3)
      .from(".view__head > *", { x: 50, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.1)
      .from(el.rail, { x: () => innerWidth * 0.55, duration: 1.2 }, 0.2)
      .from(".tile", { y: 20, opacity: 0, duration: 0.6, stagger: 0.03 }, 0.55);
    if (!fromSplash) tl.from(el.dock, { y: 110, duration: 0.9 }, 0.5);
  }

  function showLoadError() {
    el.rail.removeAttribute("aria-busy");
    el.rail.innerHTML = `<p class="rail__status" role="alert">The menu didn’t load.<br><button type="button" id="retry">Try again</button></p>`;
    el.dishes.hidden = true;
    $(".explore", el.topView).hidden = true;
    $("#retry").addEventListener("click", () => location.reload());
  }

  // ── start ─────────────────────────────────────────────
  async function boot() {
    const fromSplash = playCover();
    el.veg.setAttribute("aria-pressed", String(state.veg));

    let data;
    try {
      data = await loadMenu();
    } catch (err) {
      console.error(err);
      showLoadError();
      return;
    }
    ingest(data);
    if (!state.cats.length) { showLoadError(); return; }

    renderRail();
    renderBand();
    bind();
    updateBadge(false);
    renderTiles();
    selectCategory(TOP, "init");
    paintRail();
    intro(fromSplash);
  }

  boot();
})();
