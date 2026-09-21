/* Studio mode - pause the story, drag / resize / flip every caption,
   then copy the JSON out. Toggle with the Studio button, the E key, or #studio */

(() => {
  "use strict";
  const book = window.__book;
  if (!book) return;
  const { LAYOUT, STORY, bubbles, applyLayout } = book;

  const SAVE_KEY = "vwt-layout-v1";
  let on = false;

  /* ------------------------------------------------------ restore any edits */
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (Array.isArray(saved) && saved.length === LAYOUT.length) {
      // only keys the current layout model knows about - an older save may still
      // carry the tail fields from when the tail was a separate sprite
      saved.forEach((o, i) => {
        Object.keys(LAYOUT[i]).forEach((k) => {
          if (o[k] !== undefined) LAYOUT[i][k] = o[k];
        });
      });
      LAYOUT.forEach((_, i) => applyLayout(i));
    }
  } catch (_) { /* first run, or storage blocked */ }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(LAYOUT)); } catch (_) {}
  }

  /* ------------------------------------------------------------- the panel */
  const panel = document.createElement("aside");
  panel.id = "studio";
  panel.innerHTML = `
    <h3>Studio<button id="stMin" title="Minimise (M)">&#8211;</button></h3>
    <p class="muted">Drag the box, blue grip resizes. The tail is part of the
      bubble art - "Flip tail" swaps the side it comes out of.
      Arrow keys nudge (Shift = 10x).</p>
    <div class="nav">
      <button id="stPrev">&larr;</button><b id="stWho"></b><button id="stNext">&rarr;</button>
    </div>
    <div id="stFields"></div>
    <div class="seg">
      <button id="stFlipTail">Flip tail</button>
      <button id="stHold">&#9208; Held</button>
    </div>
    <div class="seg">
      <button id="stAlign">Align: left</button>
      <button id="stReplay">Replay line</button>
    </div>
    <div class="seg">
      <button id="stCopy" class="primary">Copy all JSON</button>
      <button id="stReset">Reset</button>
    </div>
    <textarea id="stJson" spellcheck="false" placeholder="JSON appears here - you can also paste edited JSON in and press Apply"></textarea>
    <div class="seg"><button id="stApply">Apply pasted JSON</button></div>
    <p class="muted" id="stMsg"></p>`;
  document.body.appendChild(panel);

  const FIELDS = {
    bubble: [
      ["left", "Left %", 0.1], ["top", "Top %", 0.1], ["width", "Width %", 0.1],
      ["size", "Text x", 0.01],
    ],
    narration: [["bottom", "Bottom %", 0.1], ["width", "Width %", 0.5], ["size", "Text x", 0.01]],
  };

  const fieldsEl = panel.querySelector("#stFields");
  const msg = panel.querySelector("#stMsg");
  const jsonEl = panel.querySelector("#stJson");
  let inputs = {};

  function buildFields(L) {
    fieldsEl.innerHTML = "";
    inputs = {};
    FIELDS[L.kind].forEach(([key, label, step]) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<label>${label}</label>`;
      const inp = document.createElement("input");
      inp.type = "number"; inp.step = step; inp.value = L[key];
      inp.addEventListener("input", () => {
        const v = parseFloat(inp.value);
        if (!Number.isNaN(v)) { L[key] = v; applyLayout(book.scene()); save(); dumpJson(); }
      });
      row.appendChild(inp);
      fieldsEl.appendChild(row);
      inputs[key] = inp;
    });
  }

  function syncFields() {
    const L = LAYOUT[book.scene()];
    Object.keys(inputs).forEach((k) => { inputs[k].value = +(+L[k]).toFixed(2); });
  }

  function refresh() {
    const i = book.scene();
    const L = LAYOUT[i];
    panel.querySelector("#stWho").textContent = `${i + 1}/12 · ${STORY[i].speaker}`;
    panel.querySelector("#stAlign").textContent = "Align: " + L.align;
    buildFields(L);
    placeGrips();
    dumpJson();
  }

  function dumpJson() {
    jsonEl.value = JSON.stringify(
      LAYOUT.map((L, i) => Object.assign({ scene: i + 1 }, L)), null, 1);
  }

  /* --------------------------------------------------------------- handles */
  const grip = document.createElement("span");
  grip.className = "grip";

  function placeGrips() {
    bubbles[book.scene()].appendChild(grip);
  }

  /* ------------------------------------------------------------- dragging */
  let mode = null, startX = 0, startY = 0, base = null;

  function pct(px, axis) {
    const host = document.getElementById("overlay").getBoundingClientRect();
    return (px / (axis === "x" ? host.width : host.height)) * 100;
  }

  function down(e, which) {
    if (!on) return;
    const i = book.scene();
    mode = which;
    startX = e.clientX; startY = e.clientY;
    base = Object.assign({}, LAYOUT[i]);
    bubbles[i].classList.add("drag");
    e.preventDefault();
    e.stopPropagation();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  function move(e) {
    const i = book.scene();
    const L = LAYOUT[i];
    const dx = pct(e.clientX - startX, "x");
    const dy = pct(e.clientY - startY, "y");
    if (mode === "move") {
      if (L.kind === "bubble") {
        L.left = +(base.left + dx).toFixed(2);
        L.top = +(base.top + dy).toFixed(2);
      } else {
        L.bottom = +(base.bottom - dy).toFixed(2);
      }
    } else if (mode === "size") {
      L.width = +Math.max(8, base.width + dx).toFixed(2);
    }
    applyLayout(i);
    placeGrips();
    syncFields();
  }

  function up() {
    const i = book.scene();
    bubbles[i].classList.remove("drag");
    mode = null;
    window.removeEventListener("pointermove", move);
    save(); dumpJson();
  }

  bubbles.forEach((b) => b.addEventListener("pointerdown", (e) => {
    if (e.target === grip) return;
    down(e, "move");
  }));
  grip.addEventListener("pointerdown", (e) => down(e, "size"));

  /* ----------------------------------------------------------- minimise
     Collapses to just the title bar so the panel stops covering the frame
     while a caption is being dragged across it. The state is remembered,
     because anyone working on the far side of the frame wants it out of the
     way every time, not once. */
  const MIN_KEY = "vwt-studio-min";
  let mini = false;
  function syncMin() {
    panel.classList.toggle("mini", mini);
    const b = panel.querySelector("#stMin");
    if (b) { b.innerHTML = mini ? "&#43;" : "&#8211;"; b.title = mini ? "Expand (M)" : "Minimise (M)"; }
    try { localStorage.setItem(MIN_KEY, mini ? "1" : "0"); } catch (_) {}
  }
  panel.querySelector("#stMin").onclick = (e) => { e.stopPropagation(); mini = !mini; syncMin(); };
  /* clicking the title bar while collapsed opens it again */
  panel.querySelector("h3").addEventListener("click", () => { if (mini) { mini = false; syncMin(); } });
  try { mini = localStorage.getItem(MIN_KEY) === "1"; } catch (_) {}
  syncMin();

  /* ------------------------------------------------- hold the story still */
  let held = false;
  function syncHold() {
    const b = panel.querySelector("#stHold");
    if (b) b.textContent = held ? "\u23F8 Held" : "\u25B6 Playing";
    if (b) b.classList.toggle("primary", held);
  }
  panel.querySelector("#stHold").onclick = () => {
    held = !held;
    if (book.holdAuto) book.holdAuto(held);
    if (held) book.freeze();
    syncHold();
  };

  /* --------------------------------------------------------------- buttons */
  const step = (d) => {
    const i = Math.max(0, Math.min(STORY.length - 1, book.scene() + d));
    book.gotoScene(i);
    setTimeout(() => { book.revealAll(i); refresh(); }, 60);
  };
  panel.querySelector("#stPrev").onclick = () => step(-1);
  panel.querySelector("#stNext").onclick = () => step(1);

  panel.querySelector("#stFlipTail").onclick = () => {
    const L = LAYOUT[book.scene()];
    if (L.kind !== "bubble") return;
    L.tailFlip = !L.tailFlip; applyLayout(book.scene()); save(); dumpJson();
  };
  panel.querySelector("#stAlign").onclick = (e) => {
    const L = LAYOUT[book.scene()];
    L.align = L.align === "left" ? "center" : L.align === "center" ? "right" : "left";
    e.target.textContent = "Align: " + L.align;
    applyLayout(book.scene()); save(); dumpJson();
  };
  panel.querySelector("#stReplay").onclick = () => book.replay(book.scene());

  panel.querySelector("#stCopy").onclick = async () => {
    dumpJson();
    try {
      await navigator.clipboard.writeText(jsonEl.value);
      flash("Copied - paste it back to me.");
    } catch (_) {
      jsonEl.select(); flash("Select-all done - press Cmd/Ctrl+C.");
    }
  };
  panel.querySelector("#stReset").onclick = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
    flash("Cleared - reload to get the defaults back.");
  };
  panel.querySelector("#stApply").onclick = () => {
    try {
      const arr = JSON.parse(jsonEl.value);
      arr.forEach((o, i) => { delete o.scene; Object.assign(LAYOUT[i], o); });
      LAYOUT.forEach((_, i) => applyLayout(i));
      save(); refresh(); flash("Applied.");
    } catch (err) { flash("Could not parse that JSON."); }
  };

  function flash(t) {
    msg.textContent = t;
    msg.className = "muted ok";
    setTimeout(() => { msg.textContent = ""; msg.className = "muted"; }, 2600);
  }

  /* ------------------------------------------------------------ keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input,textarea")) return;
    if (e.key === "e" || e.key === "E") { toggle(); return; }
    if (on && (e.key === "m" || e.key === "M")) { mini = !mini; syncMin(); return; }
    if (!on) return;
    const i = book.scene();
    const L = LAYOUT[i];
    const d = e.shiftKey ? 1 : 0.1;
    let hit = true;
    if (e.key === "ArrowLeft") { if (L.kind === "bubble") L.left -= d; }
    else if (e.key === "ArrowRight") { if (L.kind === "bubble") L.left += d; }
    else if (e.key === "ArrowUp") { L.kind === "bubble" ? (L.top -= d) : (L.bottom += d); }
    else if (e.key === "ArrowDown") { L.kind === "bubble" ? (L.top += d) : (L.bottom -= d); }
    else if (e.key === "[") { step(-1); hit = false; }
    else if (e.key === "]") { step(1); hit = false; }
    else hit = false;
    if (hit) {
      e.preventDefault();
      ["left", "top", "bottom"].forEach((k) => { if (L[k] != null) L[k] = +L[k].toFixed(2); });
      applyLayout(i); placeGrips(); syncFields(); save(); dumpJson();
    }
  });

  /* -------------------------------------------------------------- toggle */
  function toggle(force) {
    on = force === undefined ? !on : force;
    document.body.classList.toggle("studio", on);
    if (on) {
      book.freeze();
      /* The story plays itself now, and freeze() only stops the current run -
         any pointerdown or wheel while editing would hand it back 2.6s later
         and scroll the scene out from under the box being dragged. holdAuto
         keeps it stopped for as long as Studio is open. */
      if (book.holdAuto) book.holdAuto(true);
      held = true; syncHold();
      const i = book.scene();
      book.revealAll(i);
      refresh();
    } else {
      if (book.holdAuto) book.holdAuto(false);
      held = false;
    }
    const btn = document.getElementById("studioBtn");
    if (btn) btn.classList.toggle("is-on", on);
  }

  const btn = document.createElement("button");
  btn.id = "studioBtn";
  btn.className = "hud-btn";
  btn.type = "button";
  btn.textContent = "Studio";
  btn.onclick = () => toggle();
  document.getElementById("hud").appendChild(btn);

  if (location.hash === "#studio") toggle(true);
})();
