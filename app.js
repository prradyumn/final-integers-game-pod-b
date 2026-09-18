/* The Village Water Tank - one continuous scrolling storybook.
   Scroll position drives the art, the voiceover and the typewriter captions. */

(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const layersEl = $("#layers");
  const overlay = $("#overlay");
  const beatsEl = $("#beats");
  const canvas = $("#rainCanvas");
  const ctx = canvas.getContext("2d");
  const vo = $("#vo");
  const music = $("#music");
  const rain = $("#rain");
  const gate = $("#gate");
  const hud = $("#hud");
  const hudBar = $("#hudBar");
  const soundBtn = $("#soundBtn");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LEVELS = { music: 0.30, rain: 0.26, duckMusic: 0.09, duckRain: 0.12 };

  let started = false;
  let muted = false;
  let current = 0;
  let autoPlaying = false;
  /* The story plays itself: there is no Auto button any more, so a reader who
     scrolls must only PAUSE it, never end it - with nothing to press, ending
     it would strand them. Any manual input hands control over for
     AUTO_RESUME_MS and then the story carries on from wherever they are.
     `autoHeld` is the one thing that stops it for good: the game overlay sets
     it while it is up, and the space bar toggles it as a real pause. */
  const AUTO_RESUME_MS = 2600;
  let autoHeld = false;
  let autoResumeTimer = 0;
  let autoRAF = 0;
  let speakTimer = 0;
  let beatTops = [];
  let beatHeights = [];

  const layers = [];
  const bubbles = [];
  const carets = [];
  const chars = [];          // chars[sceneIndex] = [{el, at}]
  const lastLit = [];

  /* ---------------------------------------------------------------- build */
  function pickSrc(sc) {
    const need = window.innerWidth * Math.min(devicePixelRatio || 1, 2);
    return need <= 1000 ? sc.imgSm : sc.img;
  }

  function buildCaption(sc) {
    const isNarr = !sc.bubble;
    const box = document.createElement("div");
    box.className = isNarr
      ? "narration"
      : "bubble " + (sc.bubble[3] === "left" ? "tail-left" : "tail-right");

    if (!isNarr) {
      const [l, t, w] = sc.bubble;
      box.style.left = l + "%";
      box.style.top = t + "%";
      box.style.width = w + "%";
      // the speech-bubble artwork already includes the tail
      const skin = document.createElement("span");
      skin.className = "skin";
      box.appendChild(skin);
    }

    const tx = document.createElement("span");
    tx.className = "tx";
    const list = [];

    sc.words.forEach((word, wi) => {
      const span = Math.max(0.04, word.e - word.s);
      const letters = [...word.t];
      const wEl = document.createElement("span");
      wEl.className = "wd";
      letters.forEach((chr, j) => {
        const c = document.createElement("span");
        c.className = "ch";
        c.textContent = chr;
        wEl.appendChild(c);
        // each letter lands inside its own word's slot -> perfectly lip-synced
        list.push({ el: c, at: word.s + span * (j / letters.length) });
      });
      tx.appendChild(wEl);
      if (wi < sc.words.length - 1) {
        const sp = document.createElement("span");
        sp.className = "ch sp";
        sp.textContent = " ";
        tx.appendChild(sp);
        list.push({ el: sp, at: word.e });
      }
    });

    const caret = document.createElement("span");
    caret.className = "caret";
    box.appendChild(tx);
    tx.appendChild(caret);
    overlay.appendChild(box);

    chars.push(list);
    carets.push(caret);
    lastLit.push(-1);
    return box;
  }

  STORY.forEach((sc, i) => {
    const img = document.createElement("img");
    img.className = "layer";
    img.src = pickSrc(sc);
    img.alt = "";
    img.decoding = "async";
    if (i > 1) img.loading = "lazy";
    layersEl.appendChild(img);
    layers.push(img);

    const beat = document.createElement("section");
    beat.className = "beat";
    beatsEl.appendChild(beat);

    bubbles.push(buildCaption(sc));
  });

  /* ------------------------------------------------------------- geometry */
  function fitStage() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ar = 16 / 9;
    let w, h;
    if (vw < 760) {
      // phones: give the art a taller window and let object-fit crop the sides,
      // otherwise a 16:9 frame is a thin sliver on a portrait screen
      w = vw;
      h = Math.min(vh * 0.60, vw * 1.15);
    } else {
      // letterbox rather than crop, so no speech bubble falls outside the frame
      w = vw; h = vw / ar;
      if (h > vh) { h = vh; w = vh * ar; }
    }
    const root = document.documentElement.style;
    root.setProperty("--stage-w", w + "px");
    root.setProperty("--stage-h", h + "px");
    // 32pt on Canva's 1280-wide board == 2.5% of the frame width;
    // phones get a larger ratio so the dialogue stays readable
    const ratio = w < 700 ? 0.038 : 0.025;
    root.setProperty("--fs", Math.max(13, w * ratio).toFixed(2) + "px");
    sizeCanvas(w, h);
    layoutBeats();
    bubbles.forEach((b, i) => applyLayout(i));
  }

  /* ---------------------------------------------------------------- layout */
  // The placements as they were tuned in Studio - this is exactly what
  // "Copy all JSON" hands back, so a new export can be pasted straight in.
  // Anything a row leaves out falls back to the seed derived from story.js.
  const PLACED = [
    { kind: "narration", bottom: 13, width: 76, size: 0.86, align: "center" },
    { kind: "bubble", left: 50, top: 5, width: 46, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 58, top: 4, width: 40, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 37.73, top: 7.87, width: 25.73, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 40.14, top: 2.66, width: 37.90, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 1.93, top: 4.64, width: 39.45, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 58.19, top: 37.78, width: 41.22, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 26.83, top: 13, width: 31.93, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 29.15, top: 3.78, width: 34.02, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 57, top: 5, width: 41, size: 1, align: "left", tailFlip: true },
    { kind: "bubble", left: 62, top: 3, width: 36, size: 1, align: "left", tailFlip: true },
    { kind: "narration", bottom: 13, width: 76, size: 0.86, align: "center" },
  ];

  // every visual property of a caption lives here so Studio mode can edit it
  const LAYOUT = STORY.map((sc, i) => {
    let base;
    if (!sc.bubble) {
      base = { kind: "narration", bottom: 13, width: 76, size: 0.86, align: "center" };
    } else {
      const [left, top, width] = sc.bubble;
      const a = sc.anchor;
      // the tail is baked into the artwork near the right edge, so the only choice
      // left is which side it comes out of - pick whichever is nearer the speaker
      const anchorPct = a == null ? 0 : ((a - left) / width) * 100;
      base = {
        kind: "bubble",
        left, top, width,
        size: 1,          // multiplier on the base 32pt
        align: "left",
        tailFlip: a == null ? true : anchorPct < 50,
      };
    }
    // a stale row (story.js regenerated with different scenes) is ignored
    const p = PLACED[i];
    if (p && p.kind === base.kind) {
      Object.keys(base).forEach((k) => { if (p[k] !== undefined) base[k] = p[k]; });
    }
    return base;
  });

  function applyLayout(i) {
    const L = LAYOUT[i];
    const box = bubbles[i];
    if (L.kind === "narration") {
      box.style.bottom = L.bottom + "%";
      box.style.width = "min(" + L.width + "%, 50em)";
      box.style.fontSize = "calc(var(--fs) * " + L.size + ")";
      box.style.textAlign = L.align;
      return;
    }
    box.style.left = L.left + "%";
    box.style.top = L.top + "%";
    box.style.width = L.width + "%";
    box.style.fontSize = "calc(var(--fs) * " + L.size + ")";
    box.style.textAlign = L.align;
    // mirroring the artwork is what moves the tail to the other side
    const skin = box.querySelector(".skin");
    if (skin) skin.style.transform = L.tailFlip ? "scaleX(-1)" : "";
    box.classList.toggle("tail-left", !!L.tailFlip);
    box.classList.toggle("tail-right", !L.tailFlip);
  }

  function layoutBeats() {
    const vh = window.innerHeight;
    const pps = vh * 0.17;                 // scroll px per second of narration
    let top = 0;
    beatTops = []; beatHeights = [];
    [...beatsEl.children].forEach((el, i) => {
      const h = Math.max(vh * 0.62, STORY[i].dur * pps);
      el.style.height = h + "px";
      beatTops.push(top); beatHeights.push(h);
      top += h;
    });
  }

  /* ------------------------------------------------------------ narration */
  function setScene(i) {
    if (i === current) return;
    current = i;
    bubbles.forEach((b, k) => {
      b.classList.toggle("is-in", k === i);
      if (k !== i) { b.style.opacity = ""; resetType(k); }
    });
    clearTimeout(speakTimer);
    speakTimer = setTimeout(() => speak(i), 130);
  }

  // if the voiceover can't load or is slow, the captions still type on their own clock
  let clockBase = null;
  let clockWatch = 0;

  function speak(i) {
    if (!started || i !== current) return;
    resetType(i);
    clockBase = null;
    clearTimeout(clockWatch);
    vo.pause();
    vo.src = STORY[i].audio;
    vo.currentTime = 0;
    bubbles[i].classList.add("is-typing");
    vo.play().catch(() => { clockBase = performance.now(); });
    clockWatch = setTimeout(() => {
      if (vo.paused || vo.readyState < 2) clockBase = performance.now();
    }, 900);
  }

  vo.addEventListener("playing", () => { clockBase = null; });
  vo.addEventListener("error", () => { clockBase = performance.now(); });

  function resetType(i) {
    if (lastLit[i] === -1) return;
    chars[i].forEach((c) => c.el.classList.remove("on"));
    lastLit[i] = -1;
    bubbles[i].classList.remove("is-typing");
    const tx = bubbles[i].querySelector(".tx");
    if (tx) tx.appendChild(carets[i]);
  }

  function paintType() {
    // Studio mode shows the whole line - don't let the audio clock re-hide it
    if (document.body.classList.contains("studio")) return;
    const i = current;
    const list = chars[i];
    if (!list) return;
    const t = !started ? -1
      : clockBase !== null ? (performance.now() - clockBase) / 1000
      : vo.currentTime;
    let lit = -1;
    for (let k = 0; k < list.length; k++) {
      if (t >= list[k].at) lit = k; else break;
    }
    if (lit === lastLit[i]) return;

    const from = Math.min(lastLit[i], lit);
    for (let k = Math.max(0, from); k < list.length; k++) {
      list[k].el.classList.toggle("on", k <= lit);
    }
    lastLit[i] = lit;

    // park the caret exactly where the next letter will appear
    const next = list[lit + 1];
    const caret = carets[i];
    if (next && next.el.parentNode) next.el.parentNode.insertBefore(caret, next.el);
    else bubbles[i].querySelector(".tx").appendChild(caret);
    bubbles[i].classList.toggle("is-typing", !!next && !vo.paused);
  }

  /* ---------------------------------------------------------------- audio */
  function ramp(el, to, ms) {
    const from = el.volume;
    if (Math.abs(from - to) < 0.004) return;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function duck(on) {
    ramp(music, on ? LEVELS.duckMusic : LEVELS.music, 420);
    ramp(rain, on ? LEVELS.duckRain : LEVELS.rain, 420);
  }

  vo.addEventListener("play", () => duck(true));
  vo.addEventListener("pause", () => duck(false));
  vo.addEventListener("ended", () => {
    duck(false);
    const list = chars[current];
    list.forEach((c) => c.el.classList.add("on"));
    lastLit[current] = list.length - 1;
    bubbles[current].classList.remove("is-typing");
  });

  function applyMute() {
    [vo, music, rain].forEach((a) => { a.muted = muted; });
    hud.classList.toggle("is-muted", muted);
    soundBtn.setAttribute("aria-label", muted ? "Unmute all sound" : "Mute all sound");
  }

  /* --------------------------------------------------------------- scroll */
  function totalScroll() {
    return beatTops[beatTops.length - 1] + beatHeights[beatHeights.length - 1];
  }

  function onScroll() {
    const head = window.scrollY + window.innerHeight * 0.34;
    let i = 0;
    for (let k = 0; k < beatTops.length; k++) if (head >= beatTops[k]) i = k;
    const frac = Math.max(0, Math.min(1, (head - beatTops[i]) / beatHeights[i]));
    setScene(i);

    const f = layers[i + 1] ? Math.max(0, (frac - 0.84) / 0.16) : 0;
    for (let k = 0; k < layers.length; k++) {
      layers[k].style.opacity = k === i ? (1 - f * 0.5).toFixed(3)
        : k === i + 1 ? f.toFixed(3) : "0";
    }
    bubbles[i].style.opacity = f > 0 ? String(Math.max(0, 1 - f * 1.5)) : "";

    hudBar.style.width = (Math.min(1, head / totalScroll()) * 100).toFixed(1) + "%";
  }

  /* -------------------------------------------------------------- autoplay */
  function startAuto() {
    if (autoHeld) return;
    clearTimeout(autoResumeTimer);
    autoPlaying = true;
    hud.classList.add("is-playing");
    let last = performance.now();
    const pps = window.innerHeight * 0.17;
    const tick = (now) => {
      if (!autoPlaying) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      window.scrollBy(0, pps * dt);
      if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 4) return stopAuto();
      autoRAF = requestAnimationFrame(tick);
    };
    autoRAF = requestAnimationFrame(tick);
  }

  function stopAuto() {
    autoPlaying = false;
    cancelAnimationFrame(autoRAF);
    hud.classList.remove("is-playing");
  }

  /* the reader took the wheel - give it back after a beat */
  function nudgeAuto() {
    if (!started || autoHeld) return;
    stopAuto();
    clearTimeout(autoResumeTimer);
    autoResumeTimer = setTimeout(() => {
      if (started && !autoHeld) startAuto();
    }, AUTO_RESUME_MS);
  }

  /* ------------------------------------------------------------------ rain */
  let drops = [];
  let lastFrame = performance.now();
  let cw = 0, ch = 0;

  function sizeCanvas(w, h) {
    const r = Math.min(devicePixelRatio || 1, 2);
    cw = w; ch = h;
    canvas.width = Math.round(w * r);
    canvas.height = Math.round(h * r);
    ctx.setTransform(r, 0, 0, r, 0, 0);
    const n = Math.round(w / (reduceMotion ? 26 : 9));
    drops = Array.from({ length: n }, () => newDrop(true));
  }

  function newDrop(seed) {
    return {
      x: Math.random() * (cw + 140) - 70,
      y: seed ? Math.random() * ch : -20 - Math.random() * 140,
      len: 10 + Math.random() * 24,
      sp: 250 + Math.random() * 320,
      a: 0.14 + Math.random() * 0.36,
    };
  }

  function drawRain(now) {
    const dt = Math.min(0.04, (now - lastFrame) / 1000);
    lastFrame = now;
    ctx.clearRect(0, 0, cw, ch);
    ctx.lineCap = "round";
    for (const d of drops) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(206,246,255,${d.a})`;
      ctx.lineWidth = 0.7 + d.a;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.18, d.y + d.len);
      ctx.stroke();
      if (!reduceMotion) {
        d.y += d.sp * dt;
        d.x -= d.sp * 0.045 * dt;
        if (d.y > ch + 30) Object.assign(d, newDrop(false));
      }
    }
  }

  function frame(now) {
    if (!document.hidden) { drawRain(now); paintType(); }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- events */
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { fitStage(); onScroll(); });

  soundBtn.addEventListener("click", () => { muted = !muted; applyMute(); });
  $("#replay").addEventListener("click", () => {
    stopAuto();
    autoHeld = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => startAuto(), 700);       // read it again, and it plays again
  });

  ["wheel", "touchstart", "pointerdown"].forEach((ev) =>
    window.addEventListener(ev, nudgeAuto, { passive: true }));

  document.addEventListener("keydown", (e) => {
    /* keydown can arrive with the Document itself as the target, which has no
       .matches - without this guard the handler throws and every shortcut
       below it (including the space pause) silently stops working. */
    if (e.target && e.target.matches && e.target.matches("input,textarea")) return;
    if (e.key === "m" || e.key === "M") { muted = !muted; applyMute(); }
    /* space is now a real pause, since nothing else can stop it for good */
    if (e.key === " " && started) {
      e.preventDefault();
      autoHeld = !autoHeld;
      if (autoHeld) stopAuto(); else startAuto();
    }
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) nudgeAuto();
  });

  $("#beginBtn").addEventListener("click", () => {
    started = true;
    gate.classList.add("is-gone");
    hud.classList.add("is-on");
    music.volume = 0; rain.volume = 0;
    music.play().catch(() => {});
    rain.play().catch(() => {});
    ramp(music, LEVELS.music, 1600);
    ramp(rain, LEVELS.rain, 1600);
    speak(current);
    startAuto();                 // the story plays itself from here
  });

  /* ------------------------------------------------------------------ boot */
  fitStage();
  bubbles[0].classList.add("is-in");
  onScroll();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => bubbles.forEach((b, i) => applyLayout(i)));
  }

  /* -------------------------------------------------- api for Studio mode */
  window.__book = {
    STORY, LAYOUT, bubbles, applyLayout,
    scene: () => current,
    gotoScene(i) {
      stopAuto();
      const top = beatTops[i] + beatHeights[i] * 0.35 - window.innerHeight * 0.34;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      onScroll();
      if (started) speak(i);
    },
    freeze() { stopAuto(); vo.pause(); },
    /* the game overlay holds autoplay while it is on screen, and releases it
       on the way out - see bridge.js */
    holdAuto(on) {
      autoHeld = !!on;
      clearTimeout(autoResumeTimer);
      if (autoHeld) stopAuto();
      else if (started) startAuto();
    },
    revealAll(i) {
      chars[i].forEach((c) => c.el.classList.add("on"));
      lastLit[i] = chars[i].length - 1;
      bubbles[i].classList.remove("is-typing");
    },
    replay(i) { speak(i); },
  };
  requestAnimationFrame(frame);
})();
