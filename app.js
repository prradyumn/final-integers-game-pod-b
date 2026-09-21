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
  /* Which point down the viewport decides "the scene you are on". It was
     written out twice, and the two uses have to agree - see layoutBeats(). */
  const HEAD = 0.34;
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
  const words = [];          // words[sceneIndex] = [{el, s, e}]
  const lastSpoken = [];

  /* The words the lesson turns on. The typewriter used to be what drew the eye
     through a line; it is gone, so the emphasis has to come from the words
     themselves. These are marked once, when the caption is built, and stay
     marked - a reader glancing at scene 6 should see "above zero" and "more"
     before they have read a word of the rest. Deliberately short: it covers
     the five teaching scenes and leaves the seven narrative ones untouched,
     which is what makes it read as emphasis rather than decoration. */
  const KEYWORD = /^(zero|above|below|positive|negative|more|less|reference|[+\u2212-]?\d+)$/i;
  const isKey = (w) => KEYWORD.test(w.replace(/[^\w+\u2212-]/g, ""));

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

    /* One span per word, holding the whole word. There are no per-letter spans
       and no caret any more: the line is fully rendered from the moment the
       scene opens, so its box is the size it will stay and nothing can re-wrap
       or resize underneath the reader. The word timings from the .srt files
       are still used - they now drive which word is lit as it is spoken. */
    sc.words.forEach((word, wi) => {
      const wEl = document.createElement("span");
      wEl.className = isKey(word.t) ? "wd key" : "wd";
      wEl.textContent = word.t;
      tx.appendChild(wEl);
      list.push({ el: wEl, s: word.s, e: word.e });
      if (wi < sc.words.length - 1) tx.appendChild(document.createTextNode(" "));
    });

    box.appendChild(tx);
    overlay.appendChild(box);

    words.push(list);
    lastSpoken.push(-1);
    return box;
  }

  STORY.forEach((sc, i) => {
    const img = document.createElement("img");
    img.className = "layer";
    img.src = pickSrc(sc);
    /* every scene image used to be alt="" - decorative - which is right only
       when the text beside it says the same thing. Here the picture IS the
       lesson, so it gets described. */
    img.alt = sc.text ? "Scene " + (i + 1) + ": " + sc.text : "Scene " + (i + 1);
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
    { kind: "narration", bottom: 13, width: 76, size: 0.86, align: "center", },
    { kind: "bubble", left: 37.44, top: 13.55, width: 25.68, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 33.37, top: 1.81, width: 26.4, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 37.73, top: 7.87, width: 25.73, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 40.14, top: 2.66, width: 37.9, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 1.93, top: 4.64, width: 39.45, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 58.19, top: 37.78, width: 41.22, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 26.83, top: 13, width: 31.93, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 29.15, top: 3.78, width: 34.02, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 34.39, top: 18.82, width: 31.83, size: 1, align: "left", tailFlip: true, },
    { kind: "bubble", left: 62, top: 3, width: 36, size: 1, align: "left", tailFlip: true, },
    { kind: "narration", bottom: 13, width: 76, size: 0.86, align: "center", }
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
      let h = Math.max(vh * 0.62, STORY[i].dur * pps);
      /* The reading head sits HEAD down the viewport, so at scrollY 0 it is
         already that far into the track - and the first beat, alone, has no
         earlier scroll to absorb it. Without this the opening line lost the
         difference: measured 4.86s of screen time for a 6.72s narration, and
         the story moved on mid-sentence. Every later scene is unaffected,
         because the head enters and leaves those beats with the same offset. */
      if (i === 0) h += vh * HEAD;
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
  /* The captions do not read the voice directly - if the audio is slow or
     missing, a wall clock takes over so the text still types. That fallback is
     why pausing `vo` was not enough to stop scene 11 typing itself out behind
     the handoff card: 900ms later clockWatch saw a paused element, decided the
     audio had failed, and typed the whole line on the wall clock. Freezing has
     to stop that clock too. */
  let frozen = false;

  function speak(i) {
    if (!started || i !== current) return;
    frozen = false;
    resetType(i);
    clockBase = null;
    clearTimeout(clockWatch);
    vo.pause();
    vo.src = STORY[i].audio;
    vo.currentTime = 0;

    vo.play().catch(() => { clockBase = performance.now(); });
    clockWatch = setTimeout(() => {
      if (vo.paused || vo.readyState < 2) clockBase = performance.now();
    }, 900);
  }

  vo.addEventListener("playing", () => { clockBase = null; });
  vo.addEventListener("error", () => { clockBase = performance.now(); });

  function resetType(i) {
    if (lastSpoken[i] === -1) return;
    words[i].forEach((w) => w.el.classList.remove("now"));
    lastSpoken[i] = -1;
  }

  /* The line is already on screen; this only says WHERE IN IT the voice is.
     One word at a time, straight from the .srt timings, so a reader who is
     following along can see what is being said without anything moving. */
  function paintType() {
    if (document.body.classList.contains("studio")) return;
    if (frozen) return;
    const i = current;
    const list = words[i];
    if (!list) return;
    const t = !started ? -1
      : clockBase !== null ? (performance.now() - clockBase) / 1000
      : vo.currentTime;

    let idx = -1;
    for (let k = 0; k < list.length; k++) {
      if (t >= list[k].s && t < list[k].e + 0.06) { idx = k; break; }
      if (list[k].s > t) break;
    }
    if (idx === lastSpoken[i]) return;
    if (lastSpoken[i] >= 0 && list[lastSpoken[i]]) list[lastSpoken[i]].el.classList.remove("now");
    if (idx >= 0) list[idx].el.classList.add("now");
    lastSpoken[i] = idx;
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
    resetType(current);          // drop the "speaking now" mark; the text stays
  });

  function applyMute() {
    [vo, music, rain].forEach((a) => { a.muted = muted; });
    hud.classList.toggle("is-muted", muted);
    soundBtn.setAttribute("aria-label", muted ? "Unmute all sound" : "Mute all sound");
    soundBtn.setAttribute("aria-pressed", muted ? "true" : "false");
  }

  /* --------------------------------------------------------------- scroll */
  function totalScroll() {
    return beatTops[beatTops.length - 1] + beatHeights[beatHeights.length - 1];
  }

  function onScroll() {
    const head = window.scrollY + window.innerHeight * HEAD;
    let i = 0;
    for (let k = 0; k < beatTops.length; k++) if (head >= beatTops[k]) i = k;
    const frac = Math.max(0, Math.min(1, (head - beatTops[i]) / beatHeights[i]));
    setScene(i);

    /* The old cross-dissolve ended with the outgoing scene still at 0.5 while
       the incoming one was at 1 - two tanks, two number lines and two Guddus
       on screen at once. On a story about READING a number line that is the
       worst thing the transition could do.

       They now hand over rather than blend: the outgoing scene is most of the
       way gone before the incoming one is anywhere near readable, so they only
       ever coincide at around 9% each, which is a soft cut rather than a
       double exposure. */
    const f = layers[i + 1] ? Math.max(0, (frac - 0.90) / 0.10) : 0;
    const out = Math.min(1, f / 0.55);
    const inn = Math.max(0, Math.min(1, (f - 0.45) / 0.55));
    for (let k = 0; k < layers.length; k++) {
      layers[k].style.opacity = k === i ? (1 - out).toFixed(3)
        : k === i + 1 ? inn.toFixed(3) : "0";
    }
    bubbles[i].style.opacity = f > 0 ? String(Math.max(0, 1 - f * 1.5)) : "";
    /* the bar said "paused" the instant a hand touched the wheel, while the
       line carried on narrating for several more seconds - it now follows the
       voice, which is what a reader is actually waiting on */
    hud.classList.toggle("is-speaking", !vo.paused);

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
    /* A smooth scroll from the end card takes far longer than the 700ms this
       used to wait, so autoplay started part-way up and the reader landed in
       the middle of the story. Jump instead, reset the scene properly, and
       only then start playing. */
    stopAuto();
    autoHeld = false;
    clearTimeout(speakTimer);
    vo.pause();
    window.scrollTo(0, 0);
    current = -1;                 // force setScene(0) to count as a change
    onScroll();
    setTimeout(() => { if (started) startAuto(); }, 260);
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

  /* locked until Begin: see body.gated in styles.css */
  document.documentElement.classList.add("gated");

  $("#beginBtn").addEventListener("click", () => {
    started = true;
    document.documentElement.classList.remove("gated");
    /* whatever happened before this, the story starts at its beginning */
    window.scrollTo(0, 0);
    current = -1;
    onScroll();
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
      const top = beatTops[i] + beatHeights[i] * 0.35 - window.innerHeight * HEAD;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      onScroll();
      if (started) speak(i);
    },
    /* clearTimeout(speakTimer) is the whole fix for scene 11 playing behind
       the handoff card. setScene() does not speak immediately - it arms a
       130ms timer - so pausing `vo` alone stopped the line that was playing
       and then let the NEXT one start a moment later, behind the overlay. */
    freeze() {
      stopAuto();
      clearTimeout(speakTimer);
      clearTimeout(clockWatch);
      clockBase = null;
      frozen = true;
      vo.pause();
    },
    /* The other half of freeze(): picks the line up exactly where it stopped
       rather than starting it again. Leaving the tab must not cost the reader
       the sentence they were half way through, and must not replay it either. */
    thaw() {
      frozen = false;
      if (!started) return;
      if (clockBase !== null) return;          // the wall-clock fallback owns it
      if (vo.src && vo.paused && vo.currentTime > 0 &&
          (!vo.duration || vo.currentTime < vo.duration)) {
        vo.play().catch(() => { clockBase = performance.now(); });
      }
    },
    /* the game overlay holds autoplay while it is on screen, and releases it
       on the way out - see bridge.js */
    holdAuto(on) {
      autoHeld = !!on;
      clearTimeout(autoResumeTimer);
      if (autoHeld) stopAuto();
      else if (started) startAuto();
    },
    /* kept for Studio, which used to need the line forced open. Every line is
       fully rendered now, so this only has to clear the spoken-word mark. */
    revealAll(i) { resetType(i); },
    replay(i) { speak(i); },
  };
  requestAnimationFrame(frame);
})();
