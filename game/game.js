/* ==========================================================================
   Integers — The Village Water Tank · Pod B
   Engine: fixed-stage scaling, zoom lock, SVG water, sprite characters,
           tab-contained audio, Web-Speech narration, flow controller.
   ========================================================================== */
(() => {
'use strict';

/* ───────────────────────────── geometry ─────────────────────────────── */
const TANK   = { w: 714, h: 1084 };                        // Figma 199,10 723×1084
const INT    = { x: 148.6, y: 112.9, w: 414.3, h: 830.6 };  // glass interior, tank-local
const SVG_W  = 414, SVG_H = 831;
/* The Figma gauge was 11 ticks (+5..−5) at 72.7 apart. The doc's Level 1
   reaches +6, so the scale is 13 ticks (+6..−6) and the spacing closes up to
   fit the same 830.6-tall glass interior: 12 gaps x 63 = 756, centred, which
   leaves a 37.3 margin top and bottom. Everything else — tick rows, marker,
   water levels, hint animations, the ghost nudge — derives from these two
   numbers, so this is the only place the change has to be made. */
const STEP_PX= 63;                                          // tick spacing
const TOP_SVG= 37.3;                                        // svg-y of GAUGE_MAX

const svgYFor  = lv => TOP_SVG + (GAUGE_MAX - lv) * STEP_PX; // inside #waterSvg
const tankYFor = lv => INT.y + svgYFor(lv);                  // tank-local

/* ───────────────────────────── timings ──────────────────────────────── */
const STEP_MS      = 460;    // one level of travel — deliberately unhurried
const SETTLE_MS    = 520;
const INACTIVITY_MS= 15000;
const BEAT         = 700;
/* How long the game waits before moving on by itself. A cutscene has nothing
   to decide, so it just goes. After a correct answer it waits longer, because
   the completed number sentence IS the teaching moment and yanking it away
   would waste it.
   This used to be 2900 with a Continue button beside it for anyone who wanted
   to move sooner. There is no button now, so the wait is the only option there
   is and it has to be one nobody wants out of. */
const AUTO_OBSERVE = 1100;
/* how long the marker must sit still before resting there counts as an answer */
const COMMIT_MS    = 900;
const AUTO_CORRECT = 2200;

/* ─────────────────────── embedded in the storybook? ──────────────────────
   The storybook hosts this game in an iframe, so that each keeps its own
   document. That matters more than it sounds: this file locks scrolling to
   0,0 on every scroll event AND on a 500ms interval, which is right for a
   fixed 1920x1080 stage and fatal for a page the reader is meant to scroll.
   In its own frame the lock only ever applies to the game.

   Everything below is additive. Opened directly, `EMBEDDED` is false and the
   game behaves exactly as it always has. */
const EMBEDDED = (() => { try { return window.parent && window.parent !== window; } catch(_){ return true; } })();
const tellHost = (type, extra) => {
  if (!EMBEDDED) return;
  try { window.parent.postMessage(Object.assign({ source:'integers-game', type }, extra || {}), '*'); } catch(_){}
};

/* ───────────────────────────── dom ──────────────────────────────────── */
const $  = s => document.querySelector(s);
const stage    = $('#stage');
const tankEl   = $('#tank');
const gaugeEl  = $('#gauge');
const markerEl = $('#marker');
const ghostEl  = $('#ghost');
const startPin = $('#startPin');
const hopArcs  = $('#hopArcs');
const hopCount = $('#hopCount');
const hopN     = $('#hopN');
const hopDir   = $('#hopDir');
const waveFront= $('#waveFront');
const waveBack = $('#waveBack');
const waveLine = $('#waveLine');
const bubblesG = $('#bubbles');
const foam     = $('#foam');
const surfFx   = $('#surfFx');
const tickFx   = $('#tickFx');
const colIn    = $('#colIn');
const colInHi  = $('#colInHi');
const dripsIn  = $('#dripsIn');
const colOut   = $('#colOut');
const colOutHi = $('#colOutHi');
const dripsOut = $('#dripsOut');
const riverSplash = $('#riverSplash');
const riverRings  = $('#riverRings');
const pipeIn   = $('#pipeIn');
const pipeOut  = $('#pipeOut');
const valveIn  = $('#valveIn');
const valveOut = $('#valveOut');
const rainSvg  = $('#rainSvg');
const weatherEl= $('#weather');
const bubbleEl = $('#bubble');
const bubbleTx = $('#bubbleText');
const eqPanel  = $('#eqPanel');
const eqA = $('#eqA'), eqOp = $('#eqOp'), eqB = $('#eqB'), eqR = $('#eqR');
const eqABox = $('#eqABox'), eqBBox = $('#eqBBox'), eqRBox = $('#eqRBox');
const eqEq   = $('#eqEq');
const eqPips  = $('#eqPips');
const eqRoles = $('#eqRoles');
const tilesEl = $('#answerTiles');
const surfRing = $('#surfRing');
const nextBtn  = $('#nextBtn');   // the finish screen's Play again, nothing else
const chapterName = $('#chapterName');
const stepTag  = $('#stepTag');
const gate     = $('#gate');
const floodEl  = $('#flood');
const floodBody= $('#floodBody');
const floodFoam= $('#floodFoam');
const floodFoam2=$('#floodFoam2');
const floodBub = $('#floodBubbles');

/* ═══════════════════ 1 · stage fit + zoom lock ═══════════════════════ */
function fit(){
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.setProperty('--s', s);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 120));
fit();

/* Nothing the learner does may zoom or scroll the page. */
const stop = e => { e.preventDefault(); e.stopPropagation(); };
window.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) stop(e); }, { passive:false });
window.addEventListener('scroll', () => window.scrollTo(0,0), { passive:true });
['gesturestart','gesturechange','gestureend'].forEach(t =>
  window.addEventListener(t, stop, { passive:false }));
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && ['+','-','=','0','_'].includes(e.key)) stop(e);
}, { passive:false });
let lastTouch = 0;
window.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouch < 320) stop(e);          // kill double-tap zoom
  lastTouch = now;
}, { passive:false });
window.addEventListener('touchmove', e => { if (e.touches.length > 1) stop(e); }, { passive:false });
document.addEventListener('contextmenu', e => e.preventDefault());

/* Every clip ships as both .ogg (Opus) and .mp3. Opus is about 40% of the
   size, and Safari cannot play it in an Ogg container, so the extension is
   chosen once, here, and everything else keeps naming files as .mp3. */
const AUDIO_EXT = (() => {
  try { return new Audio().canPlayType('audio/ogg; codecs="opus"') ? '.ogg' : '.mp3'; }
  catch(_){ return '.mp3'; }
})();
const audioSrc = p => p.replace(/\.mp3$/, AUDIO_EXT);

/* ═══════════════════ 2 · audio (contained in this tab) ═══════════════ */
const Audio_ = {
  muted:false, ready:false, ctx:null,
  defs:{
    step   : ['assets/sfx/sfx_gauge_ding.mp3',    0.20, false],
    ding   : ['assets/sfx/sfx_gauge_ding.mp3',    0.45, false],
    correct: ['assets/sfx/sfx_success_chime.mp3', 0.55, false],
    fill   : ['assets/sfx/sfx_rain_loop.mp3',     0.32, true ],
    rain   : ['assets/sfx/sfx_rain_loop.mp3',     0.50, true ],
    drain  : ['assets/sfx/sfx_spillway.mp3',      0.40, true ],
    ambient: ['assets/sfx/sfx_lake_lapping.mp3',  0.13, true ]
  },
  el:{},
  init(){
    if (this.ready) return;
    for (const k in this.defs){
      const [src, vol, loop] = this.defs[k];
      const a = new Audio(audioSrc(src));
      a.preload = 'auto'; a.loop = loop; a.volume = vol;
      this.el[k] = a;
    }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_){}
    this.ready = true;
  },
  play(k){
    if (this.muted || !this.el[k]) return;
    const a = this.el[k];
    try { if (!a.loop) { a.currentTime = 0; } a.play().catch(()=>{}); } catch(_){}
  },
  stop(k){
    const a = this.el[k]; if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch(_){}
  },
  fadeIn(k, ms = 300, target = null){
    const a = this.el[k]; if (!a || this.muted) return;
    const to = target !== null ? target : this.defs[k][1];
    a.volume = 0.0001;
    a.play().catch(()=>{});
    const t0 = performance.now();
    const tick = () => {
      if (a.paused) return;
      const p = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.max(0.0001, Math.min(1, to * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  /* flow volume follows how hard the water is running */
  level(k, mul){
    const a = this.el[k]; if (!a || a.paused) return;
    a.volume = Math.max(0.02, Math.min(1, this.defs[k][1] * (0.55 + mul * 0.75)));
  },
  fadeStop(k, ms = 500){
    const a = this.el[k]; if (!a || a.paused) return;
    const v0 = a.volume, t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      a.volume = v0 * (1 - p);
      if (p < 1) requestAnimationFrame(tick);
      else { a.pause(); a.currentTime = 0; a.volume = v0; }
    };
    requestAnimationFrame(tick);
  },
  stopAll(){ for (const k in this.el) this.stop(k); },
  pauseAll(){ for (const k in this.el) { try { this.el[k].pause(); } catch(_){} } },
  resumeLoops(){
    if (this.muted) return;
    for (const k in this.el) if (this.el[k].loop && this.el[k].dataset.want === '1')
      this.el[k].play().catch(()=>{});
  },
  want(k, on){ if (this.el[k]) this.el[k].dataset.want = on ? '1' : '0'; },
  /* small synthesised cues — no downloads, no licences */
  blip(kind){
    if (this.muted || !this.ctx) return;
    const c = this.ctx; if (c.state === 'suspended') c.resume();
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    if (kind === 'valve'){                     // a short metal click
      o.type = 'square'; o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.start(t); o.stop(t + 0.1); return;
    }
    if (kind === 'plip'){                      // the last drop landing
      o.type = 'sine'; o.frequency.setValueAtTime(1500, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.10, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.start(t); o.stop(t + 0.16); return;
    }
    if (kind === 'wrong'){
      o.type = 'sine'; o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(155, t + 0.34);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      o.start(t); o.stop(t + 0.4);
    } else {                                   // soft click for each level
      o.type = 'triangle'; o.frequency.setValueAtTime(680, t);
      o.frequency.exponentialRampToValueAtTime(940, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.start(t); o.stop(t + 0.18);
    }
  }
};

/* ═══════════════════ 3 · narration (Web Speech) ══════════════════════ */
/* Everything on screen shows the signs themselves — +2, −1, (−3) — and never
   the words. A speech engine cannot pronounce a glyph, though: "−1" comes out
   as "one" or as nothing at all, and "+2" is read inconsistently across
   engines. So the signs are spelled out on their way to the engine and ONLY
   there. The bubble keeps the text exactly as the flow doc wrote it. */
const speakable = t => t
  .replace(/\u2212\s*(\d)/g, 'minus $1')
  .replace(/\+\s*(\d)/g,      'plus $1');

/* ═══════ 3b · pre-rendered narration ═════════════════════════════════
   Every spoken line in data.js has an mp3 in assets/vo/, rendered from the
   same Azure neural voices the story VO uses - Prabhat for Guddu, Neerja for
   Pari - and named after its line id by vo-manifest.js.

   A file beats the browser's own engine on every axis that matters here. It
   is the SAME voice on every machine instead of whatever happens to be
   installed; it cannot come out silent because a platform shipped no voices;
   and its progress is measured rather than guessed - `currentTime / duration`
   IS how far through the line we are, which is exactly what the equation
   reveal rides on. Web Speech stays underneath as the fallback, so deleting
   assets/vo/ leaves the game working as it did before.                     */
const Clip = {
  cache: {}, current: null,

  el(id){
    const f = (window.VO_FILES || {})[id];
    if (!f) return null;
    if (!this.cache[id]){
      const a = new Audio(audioSrc('assets/vo/' + f));
      a.preload = 'auto';
      this.cache[id] = a;
    }
    return this.cache[id];
  },

  /* the next few lines a screen will need, fetched while it is still talking */
  warm(step){
    if (!step) return;
    const ids = [step.id + '.vo', step.id + '.correct', step.id + '.idle',
                 step.id + '.wrong1', step.id + '.wrong2', step.id + '.wrong3'];
    ids.forEach(i => { const a = this.el(i); if (a) { try { a.load(); } catch(_){} } });
  },

  stop(){
    const a = this.current; this.current = null;
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch(_){}
  }
};

const VO = {
  voices:[], guddu:null, pari:null, speaking:false, keepAlive:null,
  supported: 'speechSynthesis' in window,

  pick(){
    if (!this.supported) return;
    this.voices = speechSynthesis.getVoices() || [];
    const en = this.voices.filter(v => /^en/i.test(v.lang));
    const pool = en.length ? en : this.voices;
    const by = (...rx) => {
      for (const r of rx){ const v = pool.find(v => r.test(v.name)); if (v) return v; }
      return null;
    };
    // Warmer, less synthetic voices first; Indian English preferred for these two.
    this.guddu = by(/rishi/i, /^Google UK English Male/i, /Daniel/i, /Oliver/i, /Alex/i,
                    /^Google US English/i, /Fred/i) || pool[0] || null;
    this.pari  = by(/veena/i, /kanya/i, /^Google UK English Female/i, /Samantha/i, /Karen/i,
                    /Moira/i, /^Google US English/i) || pool[1] || this.guddu;
  },

  cancel(){
    Clip.stop();
    clearTimeout(this._clipGuard);
    this.speaking = false;
    clearInterval(this.keepAlive);
    Guddu.talk(false);
    if (!this.supported) return;
    try { speechSynthesis.cancel(); } catch(_){}
  },

  /* `onProgress` is called with 0..1 as the line is spoken. It is what keeps
     the number sentence in step with the voice. A pre-rendered clip reports it
     from the audio clock, which is exact; the browser's engine reports it from
     word-boundary events, which is as close as that path can get. */
  speak(text, speaker = 'guddu', onProgress = null, voId = null){
    const who = Guddu;
    return new Promise(resolve => {
      this.cancel();
      let done = false;
      const report = p => {
        if (!onProgress || done) return;
        try { onProgress(Math.max(0, Math.min(1, p))); } catch(_){}
      };
      const settle = () => { if (onProgress) { try { onProgress(1); } catch(_){} } };
      const clip = voId ? Clip.el(voId) : null;

      /* Muted, or nothing at all to speak with: the line still occupies a span
         of time, so progress comes off that and the sentence still builds. */
      if (Audio_.muted || (!clip && !this.supported)){
        who.talk(true);
        const ms = Math.max(1600, text.length * 62);
        const t0 = performance.now();
        const tick = () => {
          if (done) return;
          report((performance.now() - t0) / ms);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        setTimeout(() => { settle(); done = true; who.talk(false); resolve(); }, ms);
        return;
      }

      /* ── the browser's own engine: the fallback, and what runs for any line
            that has no file (there are none today, but data.js may grow) ── */
      const useSpeech = () => {
        if (!this.supported){
          who.talk(true);
          const ms = Math.max(1600, text.length * 62);
          setTimeout(() => { settle(); done = true; who.talk(false); resolve(); }, ms);
          return;
        }
        const u = new SpeechSynthesisUtterance(speakable(text));
        const v = speaker === 'pari' ? this.pari : this.guddu;
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate  = 0.84;
        u.pitch = speaker === 'pari' ? 1.18 : 0.96;
        u.volume= 1;

        let heardBoundary = false, fallback = null;
        const spoken = (u.text || '').length || 1;
        u.onboundary = e => {
          heardBoundary = true;
          if (fallback) { clearInterval(fallback); fallback = null; }
          report((e.charIndex || 0) / spoken);
        };
        const finish = () => {
          if (done) return;
          clearInterval(fallback); settle(); done = true;
          this.speaking = false; clearInterval(this.keepAlive);
          who.talk(false); resolve();
        };
        const est = Math.max(1600, text.length * 68);
        let t0 = performance.now();
        fallback = setInterval(() => {
          if (done || heardBoundary) return clearInterval(fallback);
          report((performance.now() - t0) / est);
        }, 80);
        u.onstart = () => { this.speaking = true; who.talk(true); t0 = performance.now(); };
        u.onend   = finish;
        u.onerror = finish;
        clearInterval(this.keepAlive);
        this.keepAlive = setInterval(() => {
          if (!this.speaking) return clearInterval(this.keepAlive);
          try { speechSynthesis.pause(); speechSynthesis.resume(); } catch(_){}
        }, 8000);
        try { speechSynthesis.speak(u); } catch(_){ finish(); }
        setTimeout(finish, Math.max(5000, text.length * 150));
      };

      if (!clip) return useSpeech();

      /* ── the pre-rendered line ── */
      Clip.stop();
      Clip.current = clip;
      this.speaking = true;
      who.talk(true);

      let raf = 0;
      const endClip = () => {
        if (done) return;
        cancelAnimationFrame(raf);
        clip.onended = clip.onerror = null;
        clearTimeout(this._clipGuard);
        settle(); done = true;
        this.speaking = false;
        if (Clip.current === clip) Clip.current = null;
        who.talk(false); resolve();
      };
      /* the file could not be decoded or is missing off disk: hand the line
         back to the speech engine rather than losing it */
      const bail = () => {
        if (done) return;
        cancelAnimationFrame(raf);
        clip.onended = clip.onerror = null;
        clearTimeout(this._clipGuard);
        this.speaking = false;
        if (Clip.current === clip) Clip.current = null;
        useSpeech();
      };
      const tick = () => {
        if (done) return;
        if (clip.duration) report(clip.currentTime / clip.duration);
        raf = requestAnimationFrame(tick);
      };
      clip.onended = endClip;
      clip.onerror = bail;
      try { clip.currentTime = 0; } catch(_){}
      const played = clip.play();
      if (played && played.catch) played.catch(bail);
      raf = requestAnimationFrame(tick);
      /* never strand a screen on a clip that refuses to fire `ended` */
      clearTimeout(this._clipGuard);
      this._clipGuard = setTimeout(endClip, Math.max(8000, text.length * 160));
    });
  }
};
if (VO.supported){
  VO.pick();
  speechSynthesis.onvoiceschanged = () => VO.pick();
}

/* audio must never keep playing once this tab is in the background */
document.addEventListener('visibilitychange', () => {
  if (document.hidden){
    Audio_.pauseAll();
    if (Clip.current) { try { Clip.current.pause(); } catch(_){} }
    if (VO.supported) { try { speechSynthesis.pause(); } catch(_){} }
    if (Audio_.ctx && Audio_.ctx.state === 'running') Audio_.ctx.suspend();
  } else {
    Audio_.resumeLoops();
    if (Clip.current) { Clip.current.play().catch(()=>{}); }
    if (VO.supported && VO.speaking) { try { speechSynthesis.resume(); } catch(_){} }
    if (Audio_.ctx && Audio_.ctx.state === 'suspended') Audio_.ctx.resume();
  }
});
window.addEventListener('pagehide', () => { Audio_.stopAll(); VO.cancel(); });
window.addEventListener('beforeunload', () => { Audio_.stopAll(); VO.cancel(); });

/* ═══════════════════ 4 · character ═══════════════════════════════════
   Nine poses, all re-registered to a shared ground line, height and stance
   centre, so swapping one for another changes only the arms and the face.
   Two stacked layers cross-fade, which hides even that. No sprite sheets and
   no frame animation — while a line plays he just breathes.                */
const POSES = ['talk','point','happy','cheer','worried','surprised',
               'think','idle','neutral'];

/* guddu-point.webp is clipped by the left edge of its own canvas: its opaque
   content runs to x0 of a 1024-wide image and the pointing hand is missing
   pixels, not mispositioned. Nothing here can recover them — object-fit is
   `contain`, which never crops, so the fault is in the asset. Until it is
   re-exported with the hand inside the frame, `point` falls back to `talk`,
   the same leftward presenting gesture with an intact hand.
   Empty this map when the new art lands and `point` comes back by itself. */
const POSE_SUB = { point: 'talk' };

const Guddu = {
  el: $('#guddu'), a: $('#poseA'), b: $('#poseB'),
  front: 'a', cur: 'talk',

  preload(){
    POSES.forEach(p => { const i = new Image(); i.src = `assets/img/guddu-${p}.webp`; });
  },

  pose(name){
    name = POSE_SUB[name] || name;
    if (!POSES.includes(name) || name === this.cur) return;
    this.cur = name;
    const showing = this.front === 'a' ? this.b : this.a;
    const hiding  = this.front === 'a' ? this.a : this.b;
    showing.src = `assets/img/guddu-${name}.webp`;
    showing.style.opacity = '1';
    hiding.style.opacity  = '0';
    this.front = this.front === 'a' ? 'b' : 'a';
    if (window.applyLayout) window.applyLayout();
  },

  talk(on){ this.el.classList.toggle('speaking', on); },
  mood(){}                                   /* kept so callers stay simple */
};

/* ═══════════════════ 4b · layout overrides ═══════════════════════════
   layout.js records placements made in the screen editor. Nothing there means
   the positions in style.css (transcribed from Figma) stand. A screen entry
   beats a global one; a per-pose mirror XORs with a per-screen one.        */
const LAYOUT_MAP = {
  tank:'#tank', pipeIn:'#pipeIn', pipeOut:'#pipeOut', valveIn:'#valveIn',
  valveOut:'#valveOut', marker:'#marker', guddu:'#guddu', bubble:'#bubble',
  bubbleText:'#bubbleText', eqPanel:'#eqPanel',
  nextBtn:'#nextBtn', chapterTag:'#chapterTag',
  river:'#river', gauge:'#gauge'
};

function applyLayout(){
  const LO = window.LAYOUT || { global:{}, poses:{}, screens:{} };
  const id = Game.step ? Game.step.id : null;
  const merged = {};
  for (const k in (LO.global || {})) merged[k] = Object.assign({}, LO.global[k]);
  const sc = (LO.screens || {})[id] || {};
  for (const k in sc) merged[k] = Object.assign(merged[k] || {}, sc[k]);

  for (const key in LAYOUT_MAP){
    const node = $(LAYOUT_MAP[key]); if (!node) continue;
    const o = merged[key] || {};
    node.style.left   = o.x !== undefined ? o.x + 'px' : '';
    /* the marker's top belongs to the gauge, never to the layout record */
    if (key !== 'marker') node.style.top = o.y !== undefined ? o.y + 'px' : '';
    node.style.width  = o.w !== undefined ? o.w + 'px' : '';
    node.style.height = o.h !== undefined ? o.h + 'px' : '';
    if (key === 'bubbleText') node.style.fontSize = o.font !== undefined ? o.font + 'px' : '';
    if (key === 'gauge'){
      node.style.setProperty('--tickX',  o.tickX  !== undefined ? o.tickX  + 'px' : '');
      node.style.setProperty('--labelX', o.labelX !== undefined ? o.labelX + 'px' : '');
    }
    if (key !== 'guddu') node.classList.toggle('flipX', !!o.flip);
  }

  const poseFlip = !!(((LO.poses || {})[Guddu.cur]) || {}).flip;
  const boxFlip  = !!(merged.guddu && merged.guddu.flip);
  const f = poseFlip !== boxFlip;
  [Guddu.a, Guddu.b].forEach(i => { i.style.transform = f ? 'scaleX(-1)' : ''; });
}
window.applyLayout = applyLayout;

/* ═══════════════════ 5 · water renderer ══════════════════════════════ */
const SVGNS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

const Water = {
  level: 0, shown: 0, from: 0, to: 0, t0: 0, dur: 0,
  slosh: 0, phase: 0, lastShown: 0,
  bubbles: [], rings: [], flashes: [],
  impactX: 0,            // where the inflow lands, in water-svg coords
  dip: 0,                // depth of the depression under the stream

  init(){
    this.impactX = Flow.SPOUT.x - INT.x;
    for (let i = 0; i < 16; i++){
      const c = mk('circle', { fill:'#ffffff', 'fill-opacity':'0.34' });
      bubblesG.appendChild(c);
      this.bubbles.push({ x: 24 + Math.random()*366, r: 2 + Math.random()*5,
                          y: Math.random()*800, v: 14 + Math.random()*26, el: c });
    }
    this.set(0, 0); this.lastShown = 0;
  },
  set(lv, ms = 0){
    this.from = this.shown; this.to = lv; this.level = lv;
    this.t0 = performance.now(); this.dur = ms;
    if (ms === 0) this.shown = lv;
  },
  surfaceSvgY(){ return svgYFor(this.shown); },

  /* a ring travelling out along the surface from the impact point */
  spawnRing(){
    const el = mk('ellipse', { fill:'none', stroke:'#ffffff', 'stroke-width':'3',
                               'stroke-opacity':'0.5' });
    surfFx.appendChild(el);
    this.rings.push({ el, t: 0, life: 900 });
  },
  /* a horizontal flash across the tank as the surface passes a tick */
  spawnFlash(y){
    const el = mk('rect', { x:0, width:SVG_W, height:3, y: y - 1.5,
                            fill:'#ffffff', 'fill-opacity':'0.75', rx:'1.5' });
    tickFx.appendChild(el);
    this.flashes.push({ el, t: 0, life: 520 });
  },

  tick(now, dt){
    /* level tween */
    if (this.dur > 0){
      /* clamped at both ends: t0 comes from performance.now() and `now` from
         the rAF timestamp, and a negative p would run away through 2p² */
      const p = Math.max(0, Math.min(1, (now - this.t0) / this.dur));
      const e = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2;
      this.shown = this.from + (this.to - this.from) * e;
      if (p >= 1) this.dur = 0;
    }
    this.slosh = Math.max(0, this.slosh - dt * 0.0016);
    this.phase += dt * 0.0022;

    /* flash every tick the surface passes */
    if (this.shown !== this.lastShown){
      const a = Math.min(this.shown, this.lastShown), b = Math.max(this.shown, this.lastShown);
      for (let lv = Math.ceil(a); lv <= Math.floor(b); lv++)
        if (lv >= GAUGE_MIN && lv <= GAUGE_MAX) this.spawnFlash(svgYFor(lv));
      this.lastShown = this.shown;
    }

    /* the stream pushes a dimple into the surface */
    const wantDip = Flow.dir === 'in' ? (14 + Flow.strength * 20) * Flow.vis : 0;
    this.dip += (wantDip - this.dip) * Math.min(1, dt / 120);

    const y   = this.surfaceSvgY();
    const amp = 2.2 + this.slosh * 11;
    const pts = 34, W = SVG_W, H = SVG_H;
    let front = '', back = '', line = '';
    for (let i = 0; i <= pts; i++){
      const x  = (i / pts) * W;
      const w1 = Math.sin(x * 0.026 + this.phase * 2.1) * amp;
      const w2 = Math.sin(x * 0.011 - this.phase * 1.35) * amp * 0.55;
      const d  = this.dip * Math.exp(-Math.pow((x - this.impactX) / 58, 2));
      const yf = y + w1 + w2 + d;
      const yb = y + Math.sin(x * 0.019 - this.phase * 1.7) * amp * 0.9 + 5 + d * 0.5;
      front += (i ? 'L' : 'M') + x.toFixed(1) + ',' + yf.toFixed(1) + ' ';
      back  += (i ? 'L' : 'M') + x.toFixed(1) + ',' + yb.toFixed(1) + ' ';
      line  += (i ? 'L' : 'M') + x.toFixed(1) + ',' + (yf + 2).toFixed(1) + ' ';
    }
    waveFront.setAttribute('d', front + `L${W},${H} L0,${H} Z`);
    waveBack .setAttribute('d', back  + `L${W},${H} L0,${H} Z`);
    waveLine .setAttribute('d', line);
    surfRing.setAttribute('cx', (W/2).toFixed(1));
    surfRing.setAttribute('cy', (y + 10).toFixed(1));
    surfRing.setAttribute('rx', (W*0.40).toFixed(1));
    surfRing.setAttribute('ry', (11 + this.slosh * 5).toFixed(1));
    surfRing.setAttribute('stroke-opacity', (0.5 + this.slosh * 0.3).toFixed(2));

    /* aeration patch where the water lands */
    const fo = Flow.dir === 'in' ? Flow.vis * (0.34 + Flow.strength * 0.3) : 0;
    foam.setAttribute('cx', this.impactX.toFixed(1));
    foam.setAttribute('cy', (y + 6 + this.dip * 0.6).toFixed(1));
    foam.setAttribute('rx', (26 + Flow.strength * 34).toFixed(1));
    foam.setAttribute('ry', (8 + Flow.strength * 6).toFixed(1));
    foam.setAttribute('fill-opacity', fo.toFixed(2));

    /* rings + flashes */
    for (let i = this.rings.length - 1; i >= 0; i--){
      const r = this.rings[i]; r.t += dt;
      const p = r.t / r.life;
      if (p >= 1){ r.el.remove(); this.rings.splice(i,1); continue; }
      r.el.setAttribute('cx', this.impactX.toFixed(1));
      r.el.setAttribute('cy', (y + 8).toFixed(1));
      r.el.setAttribute('rx', (18 + p * 170).toFixed(1));
      r.el.setAttribute('ry', (5 + p * 13).toFixed(1));
      r.el.setAttribute('stroke-opacity', (0.5 * (1 - p)).toFixed(2));
    }
    for (let i = this.flashes.length - 1; i >= 0; i--){
      const f = this.flashes[i]; f.t += dt;
      const p = f.t / f.life;
      if (p >= 1){ f.el.remove(); this.flashes.splice(i,1); continue; }
      f.el.setAttribute('fill-opacity', (0.75 * (1 - p)).toFixed(2));
      f.el.setAttribute('height', (3 + p * 5).toFixed(1));
    }

    /* bubbles rise inside the body of water only */
    for (const b of this.bubbles){
      b.y -= b.v * dt / 1000;
      if (b.y < y + 12){ b.y = SVG_H - 6; b.x = 24 + Math.random()*366; }
      b.el.setAttribute('cx', b.x.toFixed(1));
      b.el.setAttribute('cy', b.y.toFixed(1));
      b.el.setAttribute('r',  b.r.toFixed(1));
      b.el.setAttribute('fill-opacity', b.y > y + 20 ? '0.34' : '0');
    }
  }
};

/* ═══════════ 5b · inlet / outlet flow ════════════════════════════════
   Three phases, both directions: a couple of drips lead the column in, the
   column runs while water is moving, then it breaks up and one last drop
   falls. Strength tracks how fast the learner is dragging, so one level is a
   spurt and four levels in one gesture is a proper pour.                  */
/* bore diameters measured off the pipe artwork, in CSS px:
     pipe-inlet-s-bend  57.0 across    pipe-outlet-elbow  47.8 across */
const OUT_BORE = 47.8;

const Flow = {
  /* Both origins sit at the CENTROID OF THE BORE, measured off the pipe
     artwork, not at the lip: the pipes paint above these layers, so the top
     of the column is hidden inside the mouth and the water emerges from the
     opening instead of appearing to fall from above it.
       pipe-inlet-s-bend  bore centroid 204.9,57.9  (lower lip y≈77.7)
       pipe-outlet-elbow  bore centroid 718.2,945.4 (bore x677..757 y921..961) */
  SPOUT: { x: 205, y: 58 },        // inlet mouth, tank-local
  DRAIN: { x: 718, y: 945 },       // outlet mouth, tank-local
  RIVER: { x: 1015, y: 1044 },     // where the outflow lands, stage coords
  TANK_X: 203, TANK_Y: 10,         // tank origin on the stage

  dir: null,          // 'in' | 'out' | null  — what the water is doing
  phase: 'off',       // 'lead' | 'run' | 'tail' | 'off'
  vis: 0,             // 0..1 how much column is drawn
  strength: 0,        // 0..1 how hard it is flowing
  t: 0, phaseT: 0, idleT: 0,
  dash: 0,            // travelling offset for the column highlight streaks
  drips: [], splash: [], rings: [],

  /* back-compatible switches used by the flow controller */
  setIn (on){ on ? this.want('in')  : (this.dir === 'in'  && this.want(null)); },
  setOut(on){ on ? this.want('out') : (this.dir === 'out' && this.want(null)); },

  /* Shut one side down completely: pipe glow, valve spin and its audio loop.
     tick() used to do this inline, and only ever for the direction that was
     current — so switching straight from 'in' to 'out' (which a drag does the
     moment it changes direction) started the new side without ever closing
     the old one, and the inlet stayed lit with its loop still wanted, for
     good. */
  close(d){
    if (!d) return;
    const key = d === 'in' ? 'fill' : 'drain';
    Audio_.want(key, false);
    Audio_.fadeStop(key, 420);
    (d === 'in' ? pipeIn : pipeOut).classList.remove('active');
    (d === 'in' ? valveIn : valveOut).classList.remove('spin', 'lit');
  },

  want(dir){
    /* a side that is already closing may be asked for again — that has to
       restart it, not be swallowed as "no change" */
    if (dir === this.dir && this.phase !== 'tail') return;
    if (dir){
      if (this.dir && this.dir !== dir) this.close(this.dir);
      const restarting = this.dir === dir;
      this.dir = dir; this.phase = 'lead'; this.phaseT = 0;
      if (!restarting){
        for (let i = 0; i < 3; i++) setTimeout(() => this.drip(dir), i * 70);
        Audio_.blip('valve');
      }
      const key = dir === 'in' ? 'fill' : 'drain';
      Audio_.want(key, true); Audio_.fadeIn(key, 320);
      (dir === 'in' ? pipeIn : pipeOut).classList.add('active');
      (dir === 'in' ? valveIn : valveOut).classList.add('spin', 'lit');
    } else if (this.dir){
      if (this.phase === 'tail') return;       // already closing; don't restart it
      this.phase = 'tail'; this.phaseT = 0;
      const d = this.dir;
      Audio_.want(d === 'in' ? 'fill' : 'drain', false);
      Audio_.fadeStop(d === 'in' ? 'fill' : 'drain', 420);
      setTimeout(() => this.drip(d), 120);
      setTimeout(() => Audio_.blip('plip'), 380);
    }
  },

  bump(){ this.strength = Math.min(1, this.strength + 0.36); },

  drip(dir){
    const g = dir === 'in' ? dripsIn : dripsOut;
    const p = dir === 'in'
      ? { x: this.SPOUT.x + (Math.random()*10 - 5), y: this.SPOUT.y }
      : { x: this.DRAIN.x + this.TANK_X + (Math.random()*8 - 4), y: this.DRAIN.y + this.TANK_Y };
    const el = mk('ellipse', { rx:4.5, ry:7, fill:'#bfeeff', 'fill-opacity':'0.92' });
    g.appendChild(el);
    this.drips.push({ el, dir, x:p.x, y:p.y, vy: 60 + Math.random()*40, vx: dir === 'out' ? 28 : 0 });
  },

  splashAt(x, y, n = 8){
    for (let i = 0; i < n; i++){
      const el = mk('circle', { cx:x, cy:y, r: 3 + Math.random()*6,
                                fill:'#e8faff', 'fill-opacity':'0.9' });
      riverSplash.appendChild(el);
      this.splash.push({ el, x, y, vx: (Math.random()*2-1)*150, vy: -(90 + Math.random()*120), t:0 });
    }
    const ring = mk('ellipse', { cx:x, cy:y, rx:6, ry:2, fill:'none',
                                 stroke:'#ffffff', 'stroke-width':'4', 'stroke-opacity':'0.85' });
    riverRings.appendChild(ring);
    this.rings.push({ el: ring, x, y, t:0, life: 1100 });
  },

  tick(now, dt){
    this.t += dt * 0.006;
    this.dash -= dt * 0.35;
    this.strength = Math.max(0, this.strength - dt * 0.0011);

    /* phase machine */
    this.phaseT += dt;
    if (this.phase === 'lead' && this.phaseT > 210){ this.phase = 'run'; this.phaseT = 0; }
    let want = 0;
    if (this.phase === 'run')  want = 1;
    if (this.phase === 'lead') want = Math.min(0.35, this.phaseT / 600);
    if (this.phase === 'tail'){
      want = Math.max(0, 1 - this.phaseT / 300);
      if (this.phaseT > 320){
        this.phase = 'off';
        const d = this.dir; this.dir = null;
        this.close(d);
      }
    }
    this.vis += (want - this.vis) * Math.min(1, dt / 90);
    if (this.vis < 0.004) this.vis = 0;

    /* ripples on the tank surface while pouring in */
    if (this.dir === 'in' && this.phase === 'run'){
      this._ringT = (this._ringT || 0) + dt;
      if (this._ringT > 260){ this._ringT = 0; Water.spawnRing(); }
    }

    /* A lonely drip from the spout when nothing is happening — but only on a
       question the learner has not answered yet. Once the answer is in, or on
       a cutscene or the finish screen, the same drip stops reading as "this
       is a water source" and starts reading as a leak. */
    this.idleT += dt;
    const mayDrip = !Game.solved && Game.step && Game.step.type === 'move';
    if (!this.dir && mayDrip && this.idleT > 6000){ this.idleT = 0; this.drip('in'); }
    if (this.dir) this.idleT = 0;

    this.drawIn();
    this.drawOut();
    this.moveDrips(dt);
    this.moveSplash(dt);

  },

  /* tapered column from the spout down to the water surface */
  drawIn(){
    const on = this.dir === 'in' && this.vis > 0.01;
    colIn.setAttribute('opacity', on ? this.vis.toFixed(2) : '0');
    colInHi.setAttribute('opacity', on ? (this.vis * 0.9).toFixed(2) : '0');
    if (!on) return;
    const sx = this.SPOUT.x, sy = this.SPOUT.y;
    const ey = INT.y + Water.surfaceSvgY() + 4;
    const wob = Math.sin(this.t * 1.9) * 3.5;
    const wTop = (10 + this.strength * 9) * this.vis;
    const wMid = wTop * 0.82;
    const wBot = wTop * 1.55;
    const my = sy + (ey - sy) * 0.55;
    const d = `M${sx-wTop},${sy}
               C${sx-wMid+wob},${my} ${sx-wBot+wob},${ey-34} ${sx-wBot+wob},${ey}
               L${sx+wBot+wob},${ey}
               C${sx+wBot+wob},${ey-34} ${sx+wMid+wob},${my} ${sx+wTop},${sy} Z`;
    colIn.setAttribute('d', d);
    colInHi.setAttribute('d',
      `M${sx-wTop*0.35},${sy+6} C${sx-wMid*0.4+wob},${my} ${sx-wBot*0.4+wob},${ey-40} ${sx-wBot*0.35+wob},${ey-8}`);
    colInHi.setAttribute('stroke-dashoffset', this.dash.toFixed(1));
  },

  /* outflow: leaves the elbow, arcs out, lands in the river */
  drawOut(){
    const on = this.dir === 'out' && this.vis > 0.01;
    colOut.setAttribute('opacity', on ? this.vis.toFixed(2) : '0');
    colOutHi.setAttribute('opacity', on ? (this.vis * 0.85) : '0');
    if (!on) return;
    const sx = this.DRAIN.x + this.TANK_X, sy = this.DRAIN.y + this.TANK_Y;
    const ex = this.RIVER.x, ey = this.RIVER.y;
    const wob = Math.sin(this.t * 2.2) * 3;

    /* Full bore. The mouth of pipe-outlet-elbow.webp measures 47.8 CSS px
       across, so the jet leaves the same width as the pipe and only spreads
       as it falls. It used to be 34px at full strength — narrower than the
       hole it came out of. */
    const h0 = (OUT_BORE / 2) * (0.84 + this.strength * 0.16) * this.vis;
    const h1 = h0 * 1.22;

    /* The mouth points down-right at about 45 degrees, so the jet leaves at
       45 and only then falls vertically into the river. */
    const cx1 = sx + 30, cy1 = sy + 30;
    const cx2 = ex - 20, cy2 = ey - 80;

    /* Offset PERPENDICULAR to the flow. The old path offset the mouth end by
       (+/-w, +/-0.4w), which on a 45 degree jet points almost ALONG the
       stream rather than across it — the ribbon collapsed to a fraction of
       its width and read as a thin strip however wide w was made. */
    const perp = (ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    };
    const [ax0, ay0] = perp(sx, sy, cx1, cy1);       // across the mouth
    const [ax1, ay1] = perp(cx2, cy2, ex, ey);       // across the landing

    const P = (x, y) => x.toFixed(1) + ',' + y.toFixed(1);
    colOut.setAttribute('d',
      'M' + P(sx - ax0*h0, sy - ay0*h0) +
      ' C' + P(cx1 - ax0*h0 + wob, cy1 - ay0*h0) +
      ' '  + P(cx2 - ax1*h1 + wob, cy2 - ay1*h1) +
      ' '  + P(ex  - ax1*h1 + wob, ey  - ay1*h1) +
      ' L' + P(ex  + ax1*h1 + wob, ey  + ay1*h1) +
      ' C' + P(cx2 + ax1*h1 + wob, cy2 + ay1*h1) +
      ' '  + P(cx1 + ax0*h0 + wob, cy1 + ay0*h0) +
      ' '  + P(sx  + ax0*h0,       sy  + ay0*h0) + ' Z');
    colOutHi.setAttribute('d',
      'M' + P(sx - ax0*h0*0.34, sy - ay0*h0*0.34) +
      ' C' + P(cx1 - ax0*h0*0.34 + wob, cy1 - ay0*h0*0.34) +
      ' '  + P(cx2 - ax1*h1*0.40 + wob, cy2 - ay1*h1*0.40) +
      ' '  + P(ex  - ax1*h1*0.40 + wob, ey  - ay1*h1*0.40 - 10));
    colOutHi.setAttribute('stroke-dashoffset', this.dash.toFixed(1));

    /* keep the river churning while it pours */
    this._splashT = (this._splashT || 0) + 16;
    if (this._splashT > 200){ this._splashT = 0; this.splashAt(ex + wob, ey, 7); }
  },

  moveDrips(dt){
    for (let i = this.drips.length - 1; i >= 0; i--){
      const d = this.drips[i];
      d.vy += 900 * dt / 1000;
      d.y  += d.vy * dt / 1000;
      d.x  += d.vx * dt / 1000;
      const land = d.dir === 'in'
        ? INT.y + Water.surfaceSvgY()
        : this.RIVER.y;
      if (d.y >= land){
        d.el.remove(); this.drips.splice(i,1);
        if (d.dir === 'in'){ Water.spawnRing(); }
        else this.splashAt(d.x, this.RIVER.y, 5);
        continue;
      }
      d.el.setAttribute('cx', d.x.toFixed(1));
      d.el.setAttribute('cy', d.y.toFixed(1));
      d.el.setAttribute('ry', (7 + Math.min(7, d.vy / 40)).toFixed(1));
    }
  },

  moveSplash(dt){
    for (let i = this.splash.length - 1; i >= 0; i--){
      const s = this.splash[i]; s.t += dt;
      const p = s.t / 620;
      if (p >= 1){ s.el.remove(); this.splash.splice(i,1); continue; }
      s.el.setAttribute('cx', (s.x + s.vx * s.t / 1000).toFixed(1));
      s.el.setAttribute('cy', (s.y + s.vy * s.t / 1000 + 620 * Math.pow(s.t/1000, 2)).toFixed(1));
      s.el.setAttribute('fill-opacity', (0.9 * (1 - p)).toFixed(2));
    }
    for (let i = this.rings.length - 1; i >= 0; i--){
      const r = this.rings[i]; r.t += dt;
      const p = r.t / r.life;
      if (p >= 1){ r.el.remove(); this.rings.splice(i,1); continue; }
      r.el.setAttribute('rx', (8 + p * 90).toFixed(1));
      r.el.setAttribute('ry', (3 + p * 24).toFixed(1));
      r.el.setAttribute('stroke-opacity', (0.85 * (1 - p)).toFixed(2));
    }
  },

  /* used by the hints: point at the pipe the answer needs */
  cue(dir){
    const el = dir === 'in' ? pipeIn : pipeOut;
    el.classList.add('cue');
    setTimeout(() => el.classList.remove('cue'), 3900);
  },

  splashBurst(){ this.splashAt(this.RIVER.x, this.RIVER.y, 10); }
};

/* ── rain ─────────────────────────────────────────────────────────────── */
const Rain = {
  on:false, drops:[],
  build(){
    for (let i = 0; i < 90; i++){
      const l = document.createElementNS('http://www.w3.org/2000/svg','line');
      rainSvg.appendChild(l);
      this.drops.push({ el:l, x:Math.random()*1980-30, y:Math.random()*1080,
                        len:20+Math.random()*34, v:900+Math.random()*700 });
    }
  },
  set(on){
    this.on = on;
    weatherEl.classList.toggle('on', on);
    Audio_.want('rain', on);
    if (on) Audio_.play('rain'); else Audio_.fadeStop('rain', 900);
  },
  tick(dt){
    if (!this.on) return;
    for (const d of this.drops){
      d.y += d.v * dt / 1000; d.x += d.v * 0.16 * dt / 1000;
      if (d.y > 1090){ d.y = -40; d.x = Math.random()*1980 - 30; }
      d.el.setAttribute('x1', d.x.toFixed(0));
      d.el.setAttribute('y1', d.y.toFixed(0));
      d.el.setAttribute('x2', (d.x - d.len*0.16).toFixed(0));
      d.el.setAttribute('y2', (d.y - d.len).toFixed(0));
    }
  }
};

/* ═══════════════════ 6 · gauge ═══════════════════════════════════════ */
/* 0 is the reference the whole lesson turns on, so it is drawn into the tank:
   a wash over each zone and a hard line between them, placed from svgYFor(0)
   so it follows the scale rather than being hand-positioned. */
function buildZeroBand(){
  const z = svgYFor(0);
  $('#zoneAbove').setAttribute('y', 0);
  $('#zoneAbove').setAttribute('height', z.toFixed(1));
  $('#zoneBelow').setAttribute('y', z.toFixed(1));
  $('#zoneBelow').setAttribute('height', (SVG_H - z).toFixed(1));
  $('#zeroGlow').setAttribute('y', (z - 7).toFixed(1));
  $('#zeroLine').setAttribute('y', (z - 1.5).toFixed(1));
}

/* ═══════════ 6c · the starting point, and the jumps from it ═══════════
   Two of the four learning objectives are about things the tank never used
   to show: WHERE THIS MOVE BEGAN, and HOW MANY LEVELS it has covered. The
   pin stays put at the start; one arc is drawn per level crossed, with a
   running count beside them. Both are rebuilt from (start, current) on every
   change, so dragging back and forth stays honest.                        */
/* A hop has to read as a hop, and the old one did not: the bulge was 50
   against a 51px chord, so each arc came out near-circular, and with round
   caps and a 6px gap curling both tips inward it closed into a "C". Flat is
   the fix — a 30 bulge puts the apex about 22px out against the same 51px
   chord, which is a leap rather than a loop.

   HOP_X stays at 326. Moving the arcs left to sit on the ticks is the obvious
   idea and it is wrong: the level labels occupy tank-local 238..308, so
   anything left of ~316 is drawn through the numbers. What actually stops the
   chain floating in open water is that both ends are now PINNED — a hollow
   ring where the move began and a filled disc where it landed, each exactly on
   its level line, which puts them in a row with the start pin and the marker
   on the far left. The eye can trace across.

   There is no arrowhead any more. The old one was a 22x15 triangle drawn
   axis-aligned pointing up or down, while the curve it sat on arrives
   travelling HORIZONTALLY — both control points share their endpoint's y, so
   the tangent at the end is (-bulge, 0). The arrow and the line it capped
   disagreed, which is most of why the thing looked wrong. A landing disc is
   what a number line actually uses, cannot contradict the curve, and the
   direction is already carried by the count chip's arrow and by the pin. */
const HOP_X = 326, HOP_BULGE = 36, HOP_GAP = 0;
/* The trail GROWS toward the landing, not away from it. The landing end is
   where the learner is now — it follows the marker as they drag — so the
   weight belongs there, with the filled disc, and the thin end belongs back
   at the level they left. Thick-to-thin put the emphasis on the past. */
const HOP_W0 = 6, HOP_W1 = 11;          // ribbon width: takeoff → landing
const HOP_SEG = 16;                     // samples per arc

/* cubic bezier point and tangent — the ribbon is built by walking the
   centreline and stepping off it perpendicular, the same construction the
   outflow jet uses in Flow.drawOut(), and for the same reason: a stroke
   cannot taper, a filled outline can. */
const bezAt = (p, t) => {
  const u = 1 - t;
  return { x: u*u*u*p[0].x + 3*u*u*t*p[1].x + 3*u*t*t*p[2].x + t*t*t*p[3].x,
           y: u*u*u*p[0].y + 3*u*u*t*p[1].y + 3*u*t*t*p[2].y + t*t*t*p[3].y };
};
const bezTan = (p, t) => {
  const u = 1 - t;
  return { x: 3*u*u*(p[1].x-p[0].x) + 6*u*t*(p[2].x-p[1].x) + 3*t*t*(p[3].x-p[2].x),
           y: 3*u*u*(p[1].y-p[0].y) + 6*u*t*(p[2].y-p[1].y) + 3*t*t*(p[3].y-p[2].y) };
};

const Hops = {
  from: null,

  begin(lv){
    this.from = lv;
    startPin.style.top = tankYFor(lv) + 'px';
    startPin.classList.add('show');
    this.render(lv);
  },

  clear(){
    this.from = null;
    startPin.classList.remove('show');
    hopArcs.textContent = '';
    hopCount.classList.remove('show');
  },

  render(to){
    if (this.from === null) return;
    const n = Math.abs(to - this.from);
    hopArcs.textContent = '';
    if (!n){ hopCount.classList.remove('show'); return; }

    const dir = to > this.from ? 1 : -1;
    let ribbon = '', y1First = 0, y2Last = 0;

    for (let k = 0; k < n; k++){
      const a = tankYFor(this.from + k * dir);
      const b = tankYFor(this.from + (k + 1) * dir);
      const y1 = a - HOP_GAP * dir, y2 = b + HOP_GAP * dir;
      if (!k) y1First = y1;
      y2Last = y2;

      const P = [ { x:HOP_X,              y:y1 }, { x:HOP_X + HOP_BULGE, y:y1 },
                  { x:HOP_X + HOP_BULGE,  y:y2 }, { x:HOP_X,             y:y2 } ];

      /* the taper runs across the WHOLE chain, not per arc, so a four-level
         move thins steadily from takeoff to landing instead of pulsing */
      const left = [], right = [];
      for (let i = 0; i <= HOP_SEG; i++){
        const t = i / HOP_SEG;
        const g = (k + t) / n;
        const w = (HOP_W0 + (HOP_W1 - HOP_W0) * g) / 2;
        const pt = bezAt(P, t), tan = bezTan(P, t);
        const L = Math.hypot(tan.x, tan.y) || 1;
        const nx = -tan.y / L * w, ny = tan.x / L * w;
        left .push((pt.x + nx).toFixed(1) + ',' + (pt.y + ny).toFixed(1));
        right.push((pt.x - nx).toFixed(1) + ',' + (pt.y - ny).toFixed(1));
      }
      ribbon += 'M' + left.join('L') + 'L' + right.reverse().join('L') + 'Z ';
    }

    hopArcs.appendChild(mk('path', { class:'halo', d: ribbon }));
    hopArcs.appendChild(mk('path', { class:'ink',  d: ribbon }));

    /* A node on EVERY level the chain touches, sitting exactly on that level's
       line. This is what stops the thing floating. Textbook number-line hops
       meet at points on the axis, and those points do two jobs at once: they
       tie each arc end to a real level, and they break the scallops apart so a
       chain of shallow same-side arcs reads as separate hops instead of fusing
       into one long curly brace — which is exactly what it did without them.
       A stub runs back towards the label so the eye can join the node to the
       number it belongs to; it starts right of the label box (which ends at
       308) so it never strikes through the digits. */
    for (let k = 0; k <= n; k++){
      const y = tankYFor(this.from + k * dir);
      hopArcs.appendChild(mk('line', { class:'rung', x1:HOP_X - 34, y1:y.toFixed(1),
                                                     x2:HOP_X - 5,  y2:y.toFixed(1) }));
      if (k && k < n)
        hopArcs.appendChild(mk('circle', { class:'node', cx:HOP_X, cy:y.toFixed(1), r:5 }));
    }
    hopArcs.appendChild(mk('circle', { class:'takeoff', cx:HOP_X, cy:y1First.toFixed(1), r:7 }));
    hopArcs.appendChild(mk('circle', { class:'landing pop', cx:HOP_X, cy:y2Last.toFixed(1), r:8.5 }));

    hopN.textContent = n;
    hopDir.textContent = dir > 0 ? '\u25B2' : '\u25BC';
    hopCount.classList.toggle('down', dir < 0);
    const mid = (tankYFor(this.from) + tankYFor(to)) / 2, zero = tankYFor(0);
    hopCount.style.top = (Math.abs(mid - zero) < 34 ? mid + 40 * dir : mid) + 'px';
    hopCount.classList.add('show');
  }
};

const rows = {};
function buildGauge(){
  gaugeEl.style.setProperty('--step', STEP_PX + 'px');
  for (let lv = GAUGE_MAX; lv >= GAUGE_MIN; lv--){
    const r = document.createElement('div');
    r.className = 'lvRow';
    r.dataset.level = lv;
    r.style.top    = (tankYFor(lv) - STEP_PX / 2) + 'px';
    const tick = document.createElement('i'); tick.className = 'lvTick';
    const lab  = document.createElement('b'); lab.className = 'lvLabel';
    lab.textContent = fmt(lv);        // same glyph as the equation panel
    r.appendChild(tick); r.appendChild(lab);
    gaugeEl.appendChild(r);
    rows[lv] = r;
  }
}
function placeMarker(lv){
  markerEl.style.top = tankYFor(lv) + 'px';
  markerEl.setAttribute('aria-valuenow', lv);
}
function clearHints(){
  Object.values(rows).forEach(r =>
    r.classList.remove('hl','pulse','zoneGlow','stepGlow','correctGlow'));
  eqPanel.classList.remove('pulseEq');
  markerEl.classList.remove('correct','hintGlow');
}

/* The answer line. Once a screen is solved, the row the marker came to rest
   on lights up: a gold beam opens out from the centre, wraps the tick, the
   label and the marker itself, a shine runs along it twice, and then it sits
   there breathing until the screen changes. It is the last thing the learner
   sees before the game moves on, so it is worth the animation. */
function markCorrect(lv){
  const r = rows[lv]; if (!r) return;
  r.classList.remove('correctGlow');
  void r.offsetWidth;                      // restart it if it is already lit
  r.classList.add('correctGlow');
  markerEl.classList.add('correct');
}

/* ═══════════════════ 6b · the ghost nudge ════════════════════════════
   A see-through copy of the marker, pressed and dragged a short way by a
   hand and released, on a loop, so there is no doubt about what to grab or
   what to do with it.

   It demonstrates the gesture and never the answer: it always travels the
   same short distance whichever way the target lies, and it picks its
   direction by which end of the gauge has room, not by where the answer
   is. It starts a couple of seconds into a screen and stops for good the
   moment the learner touches the marker.                                  */
const GHOST_ARM   = 2600;    // quiet time before the hand turns up
/* Screen 1 is the exception. Its line — "Find 0, the level that shows
   sufficient water." — never mentions a marker or dragging, and the doc's
   third hint for it is still the tap-era "Tap 0.", so the learner is told
   nothing at all about how to act. Every later screen says "Drag the water
   level marker" outright, and there the wait is the point: it gives them a
   chance to follow the instruction before being nudged. So the hand arrives
   at once while nothing has been answered yet, and waits from then on. */
const GHOST_ARM_FIRST = 500;
const GHOST_TRAVEL= 1.6;     // levels it drags — a gesture, not an answer

const Ghost = {
  timer: null, running: false,

  arm(ms){
    this.stop();
    if (!Game.interactive || Game.touched) return;
    this.timer = setTimeout(() => this.play(), ms === undefined ? GHOST_ARM : ms);
  },

  play(){
    if (!Game.interactive || Game.touched) return;
    /* down reads best; go up only when there is no room below */
    const dir = (Game.level - GAUGE_MIN) >= 2 ? 1 : -1;
    ghostEl.style.top = tankYFor(Game.level) + 'px';
    ghostEl.style.setProperty('--gy', (dir * GHOST_TRAVEL * STEP_PX).toFixed(1) + 'px');
    ghostEl.classList.add('run');
    this.running = true;
  },

  stop(){
    clearTimeout(this.timer);
    if (!this.running) return;
    ghostEl.classList.remove('run');
    this.running = false;
  }
};

/* ═══════════════════ 7 · level stepper (one level at a time) ═════════ */
const Mover = {
  queueTarget:null, running:false,
  request(lv){
    lv = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, lv));
    this.queueTarget = lv;
    if (!this.running) this.run();
  },
  async run(){
    this.running = true;
    while (this.queueTarget !== null && this.queueTarget !== Game.level){
      const dir = this.queueTarget > Game.level ? 1 : -1;
      const next = Game.level + dir;
      Game.level = next; Game.waterLevel = next;
      Water.set(next, STEP_MS);
      Water.slosh = Math.min(1, Water.slosh + 0.55);
      placeMarker(next);
      Hops.render(next);
      Audio_.play('step'); Audio_.blip('tick');
      if (dir > 0){ Flow.setIn(true); Flow.setOut(false); }
      else        { Flow.setOut(true); Flow.setIn(false); }
      Game.onLevelChanged(next);
      await wait(STEP_MS);
    }
    this.queueTarget = null;
    this.running = false;
    Flow.setIn(false); Flow.setOut(false);
    Game.onMoveSettled();
  },
};
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ── the marker is a slider: you drag it, nothing else moves the water ── */
function levelFromClientY(clientY){
  const box = tankEl.getBoundingClientRect();
  const scale = box.height / TANK.h;
  const yLocal = (clientY - box.top) / scale;
  const lv = Math.round(GAUGE_MAX - ((yLocal - INT.y) - TOP_SVG) / STEP_PX);
  return Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, lv));
}

let dragging = false;
markerEl.addEventListener('pointerdown', e => {
  if (!Game.interactive) return;
  dragging = true;
  Game.touched = true;                 // the nudges have done their job
  Game.cancelCommit();                 // picking it up again withdraws the answer
  Ghost.stop();
  markerEl.classList.add('drag');
  markerEl.classList.remove('hintGlow');
  try { markerEl.setPointerCapture(e.pointerId); } catch(_){}
  Game.poke(); e.preventDefault();
});
markerEl.addEventListener('pointermove', e => {
  if (!dragging) return;
  Game.slideTo(levelFromClientY(e.clientY));
  Game.poke();
});
const endDrag = e => {
  if (!dragging) return;
  dragging = false;
  markerEl.classList.remove('drag');
  try { markerEl.releasePointerCapture(e.pointerId); } catch(_){}
  Game.settle();
};
markerEl.addEventListener('pointerup', endDrag);
markerEl.addEventListener('pointercancel', endDrag);
markerEl.addEventListener('lostpointercapture', endDrag);

/* keyboard equivalent of the drag, one level per press */
markerEl.addEventListener('keydown', e => {
  if (!Game.interactive) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    Game.touched = true; Game.cancelCommit();
    Ghost.stop(); markerEl.classList.remove('hintGlow');
  }
  if (e.key === 'ArrowUp'   || e.key === 'ArrowRight'){ Game.slideTo(Game.level + 1); Game.settle(); Game.poke(); e.preventDefault(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' ){ Game.slideTo(Game.level - 1); Game.settle(); Game.poke(); e.preventDefault(); }
});

/* ═══════════════════ 8 · equation panel ══════════════════════════════ */
const fmt  = n => n > 0 ? '+' + n : (n < 0 ? '−' + Math.abs(n) : '0');

/* NO BRACKETS. `(−2) + (+4)` is the notation of the sign rules — it asks the
   learner to resolve a signed quantity against an operator, and "two minuses
   make a plus" is the lesson it belongs to. That is not this lesson. Here the
   operator means one thing only: + is up the tank and − is down it.

   So the three boxes are three different kinds of thing, and are written as
   such — which is what the role labels underneath have always said:

     started at   a LEVEL      signed, exactly as the gauge writes it   −2
     jumped       a COUNT      unsigned; the operator carries the way    4
     landed on    a LEVEL      signed again                            +2

   `−2 + 4 = ?` reads as "start at −2, go up 4" and nothing else. Re-introducing
   a bracket here would put a rule on screen that the tank cannot demonstrate
   and the game never teaches. See README, "No negative second term". */
const count = n => String(Math.abs(n));

/* The left-hand side is established the moment the screen opens and never
   changes — the learner is solving the right-hand side, not assembling the
   left. The answer box shows whatever level they are currently on, which is
   their proposed answer, and turns green when it is committed and correct. */
function renderEquation(step, level, solved){
  if (!step.equation){ eqPanel.hidden = eqRoles.hidden = true; return; }
  eqPanel.hidden = eqRoles.hidden = false;
  const { a, op, b } = step.equation;
  eqA.textContent  = fmt(a);       // a level, written as the gauge writes it
  eqOp.textContent = op;           // the direction: + is up, − is down
  eqB.textContent  = count(b);     // how many levels, not a signed quantity
  /* the answer box now says what the learner CHOSE, not where they happen to
     be standing — the gauge is for working it out, the tile is for saying it */
  eqR.textContent  = solved ? fmt(step.target)
                   : (Game.answer === null ? '?' : fmt(Game.answer));
  eqPanel.classList.toggle('solved', !!solved);
  eqR.classList.add('bump');
  setTimeout(() => eqR.classList.remove('bump'), 190);
}

/* ═══════════ 8b · the symbolic step ══════════════════════════════════
   The tank has shown the jump; this is where the learner says where it
   landed. Every wrong option is a real mistake rather than a random number,
   so a wrong tap says something: the start left unmoved, the jump taken the
   wrong way, the jump given instead of the landing, or a negative start read
   as though it were positive.                                            */
function answerOptions(step, i){
  const { a, op, b } = step.equation, t = step.target;
  const wrongWay   = op === '+' ? a - b : a + b;
  const signIgnored= Math.abs(a) + (op === '+' ? b : -b);
  const cand = [a, wrongWay, signIgnored, op === '+' ? b : -b, t + 1, t - 1];
  const out = [t];
  for (const v of cand){
    if (out.length >= 4) break;
    if (v !== t && !out.includes(v) && v >= GAUGE_MIN && v <= GAUGE_MAX) out.push(v);
  }
  /* shuffled, but deterministically per screen so a retry is not a new puzzle */
  let seed = (i + 7) * 2654435761 % 2147483647;
  const rnd = () => (seed = seed * 48271 % 2147483647) / 2147483647;
  for (let k = out.length - 1; k > 0; k--){
    const j = Math.floor(rnd() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

function buildTiles(step, i){
  tilesEl.textContent = '';
  tilesEl.classList.remove('locked');
  if (!step.equation){ tilesEl.hidden = true; return; }
  tilesEl.hidden = false;
  answerOptions(step, i).forEach(v => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = fmt(v); b.dataset.v = v;
    b.addEventListener('click', () => Game.pick(v));
    tilesEl.appendChild(b);
  });
}

/* one pip per level the sentence asks for, filling as the learner jumps */
function renderPips(step, jumped){
  eqPips.textContent = '';
  if (!step.equation) return;
  const need = Math.abs(step.equation.b);
  for (let k = 0; k < need; k++){
    const i = document.createElement('i');
    if (k < jumped) i.className = 'on';
    eqPips.appendChild(i);
  }
}


/* ═══════════ 8c · staging the sentence ══════════════════════════════
   The whole number sentence used to land in one block the moment the screen
   opened — five boxes and four answer tiles arriving together, while Guddu
   was still explaining what the screen was even about. Nine new objects
   competing for attention before a word had been said.

   It is built one term at a time instead, while he talks, in the order the
   sentence is read: the level he starts from, then what happens to it, then
   by how much, then the equals and the empty answer box. The tiles are held
   back until the sentence is finished AND he has stopped talking, so there
   is only ever one new thing on screen to look at.

   The reveal runs alongside the narration rather than being driven by it:
   speech-boundary events are not reliable across engines and do not fire at
   all when the sound is muted, so a fixed cadence is what actually stays in
   step. Whichever of the two finishes last is what the tiles wait for.    */
/* Where in the line each term lands, as a fraction of the way through it.
   Fractions rather than milliseconds is the whole point: the voice sets the
   pace and these ride on top of it, so a fast engine and a slow one both put
   the sign on the word that means it. The last one is well short of 1 so the
   sentence is complete before he stops talking rather than exactly as he
   does — the trailing clause of most lines is "...find the new water level",
   which wants to be said over a finished sentence. */
/* ═══════════ 8d · spring motion ══════════════════════════════════
   The entry animations are driven here rather than by the CSS keyframes, which
   stay as the fallback (see body.jsMotion in style.css).

   NO LIBRARY, deliberately. This game is opened by double-clicking index.html:
   there is no server and no build step, so a CDN <script> would make it need
   the internet to animate, and an ES-module library cannot be loaded over
   file:// at all — module scripts are CORS-checked and file:// origins are
   opaque. The Web Animations API is in every browser this runs on, costs
   nothing to fetch, and is the only part of a motion library actually wanted
   here: a real spring.

   A spring is worth the trouble because a cubic-bezier cannot overshoot and
   settle — it can only approximate the first half of that curve, which is why
   an eased pop reads as mechanical next to a sprung one. The closed form of a
   damped harmonic oscillator is sampled into keyframes and handed to WAAPI. */
const Spring = {
  /* normalised 0..1 progress, plus how long it needs to settle */
  curve(stiffness, damping, mass, steps){
    const w0 = Math.sqrt(stiffness / mass);
    const z  = damping / (2 * Math.sqrt(stiffness * mass));
    const dur = Math.min(1400, Math.max(240, (-Math.log(0.004) / (z * w0)) * 1000));
    const p = [];
    for (let i = 0; i <= steps; i++){
      const t = (i / steps) * (dur / 1000);
      if (z < 1){                                   // underdamped: it overshoots
        const wd = w0 * Math.sqrt(1 - z * z);
        p.push(1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)));
      } else {                                      // critically damped: it does not
        p.push(1 - Math.exp(-w0 * t) * (1 + w0 * t));
      }
    }
    p[p.length - 1] = 1;
    return { p, dur };
  }
};

const Motion = {
  ok: !!(window.Element && Element.prototype.animate),
  get reduced(){
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_){ return false; }
  },

  /* one sprung entrance. `from` is where the element comes from; it springs to
     its resting transform, so the fill is `backwards` and nothing is left
     latched onto the element afterwards — which is what lets the tile :hover
     and .pick transforms keep working the moment the animation is over. */
  enter(el, opts){
    if (!el || !this.ok) return null;
    const o = Object.assign({ stiffness:520, damping:17, mass:1,
                              scale:0.62, y:-18, rot:0, delay:0, fade:3 }, opts || {});
    if (this.reduced){
      return el.animate([{ opacity:0 }, { opacity:1 }],
                        { duration:1, delay:o.delay, fill:'backwards' });
    }
    const { p, dur } = Spring.curve(o.stiffness, o.damping, o.mass, 44);
    const frames = p.map(x => ({
      opacity: String(Math.min(1, x * o.fade)),
      transform: `translateY(${(o.y * (1 - x)).toFixed(2)}px) `
               + `scale(${(o.scale + (1 - o.scale) * x).toFixed(4)}) `
               + `rotate(${(o.rot * (1 - x)).toFixed(3)}deg)`
    }));
    return el.animate(frames, { duration:dur, delay:o.delay, easing:'linear', fill:'backwards' });
  }
};
if (Motion.ok) document.body.classList.add('jsMotion');

const EQ_ANCHOR = [0.08, 0.26, 0.44, 0.60, 0.76];
const EQ_MIN_GAP = 0.05;    // so two clamped terms cannot land on top of each other
const EQ_LAST    = 0.90;    // nothing may be left to the very end of the line

/* The words that carry the direction. The sign is the one symbol this lesson
   is actually about — + is up the tank, − is down it — so it lands on the word
   that MEANS it rather than at a proportional guess. */
const MINUS = '\u2212';
const DIR_WORDS = {
  '+':   /\b(increase[sd]?|increasing|rise[sn]?|rises|rising|risen|up|above|add(?:s|ed)?|more|gain(?:s|ed)?)\b/i,
  [MINUS]: /\b(used|use[sd]?|using|decrease[sd]?|decreasing|down|below|drop(?:s|ped|ping)?|less|fall(?:s|en|ing)?|fell|remov(?:e|es|ed))\b/i
};

/* Where each of the five terms should land in the line, as a fraction of it.

   A term whose own word is actually spoken is pinned to that word; the rest
   keep the proportional spread, because four of the seven lines are "Find the
   new water level." and name nothing at all. The measurement is against
   speakable(), not the raw line, because that is the string the engine indexes
   its boundary events into.

   Two things then have to be forced, and both come up in the real data:

   * The build may never run backwards. g-1 is "Now 3 levels are used" — it
     says the AMOUNT before the DIRECTION, so anchoring both to their words
     would show `3` before `−`. The sign keeps its word, and the terms after it
     are pushed past it, so `0 − 3` completes on "...are used", which is the
     moment the line describes anyway.
   * Nothing may be left stranded at the end, so if the pushing runs the last
     term past EQ_LAST the whole run is squeezed back inside the line. */
function eqAnchors(step){
  const want = EQ_ANCHOR.slice();
  if (!step || !step.equation) return want;

  const text = speakable(step.vo || '');
  const n = text.length || 1;
  const at  = re => { const m = re.exec(text); return m ? m.index / n : null; };
  /* \b keeps "3" in "3 levels" and rejects the 3 of "13" */
  const num = v => at(new RegExp('\\b' + Math.abs(v) + '\\b'));

  const found = [ num(step.equation.a),
                  at(DIR_WORDS[step.equation.op] || DIR_WORDS['+']),
                  num(step.equation.b) ];
  found.forEach((f, i) => { if (f !== null) want[i] = f; });

  for (let i = 1; i < want.length; i++)
    want[i] = Math.max(want[i], want[i - 1] + EQ_MIN_GAP);

  const last = want[want.length - 1];
  if (last > EQ_LAST){
    const lo = Math.min(want[0], 0.05);
    const k  = (EQ_LAST - lo) / (last - lo);
    for (let i = 0; i < want.length; i++) want[i] = lo + (want[i] - lo) * k;
  }
  return want;
}

const EqStage = {
  next: 0,
  anchor: EQ_ANCHOR.slice(),

  /* each term, paired with the role label that names it underneath */
  parts(){
    const r = eqRoles.children;
    return [ [eqABox, r[0], 'value'], [eqOp,   null, 'sign' ],
             [eqBBox, r[1], 'value'], [eqEq,   null, 'sym'  ],
             [eqRBox, r[2], 'value'] ];
  },

  /* out of sight, ready to be brought in one at a time */
  reset(step){
    this.next = 0;
    this.anchor = eqAnchors(step);
    this.parts().forEach(([el, role]) => {
      el.classList.add('staged'); el.classList.remove('in');
      if (role){ role.classList.add('staged'); role.classList.remove('in'); }
    });
    tilesEl.classList.add('staged'); tilesEl.classList.remove('in');
  },

  /* no staging at all — for the screens that have no sentence to build */
  clear(){
    this.next = 0;
    this.anchor = EQ_ANCHOR.slice();
    this.parts().forEach(([el, role]) => {
      el.classList.remove('staged', 'in');
      if (role) role.classList.remove('staged', 'in');
    });
    tilesEl.classList.remove('staged', 'in');
  },

  /* Each kind of thing enters in character.
       value  a level or a count — drops in and settles
       sign   the + or the −. It is the one symbol the lesson is about and it
              lands on the word that means it, so it gets the entrance that
              says so: stamped down from oversize, with a flash, and a heavier
              spring so it settles with weight rather than springing about
       sym    the = , which is punctuation and should not compete           */
  ENTER: {
    value: { stiffness:520, damping:17, scale:0.62, y:-18, rot:0 },
    sign:  { stiffness:640, damping:21, scale:2.05, y:0,  rot:-9, fade:5 },
    sym:   { stiffness:480, damping:20, scale:0.78, y:-8,  rot:0 },
    role:  { stiffness:420, damping:22, scale:0.9,  y:-7,  rot:0, delay:90 }
  },

  show(el, kind){
    if (!el) return;
    el.classList.remove('staged');
    el.classList.add('in');
    Motion.enter(el, this.ENTER[kind] || this.ENTER.value);
    if (kind === 'sign'){
      el.classList.remove('stamp'); void el.offsetWidth; el.classList.add('stamp');
    }
  },

  /* called with 0..1 as the narration advances. Terms only ever go forwards,
     so a boundary event that arrives out of order cannot un-build the
     sentence or show the same term twice. */
  advance(p){
    const parts = this.parts();
    while (this.next < parts.length && p >= this.anchor[this.next]){
      const [el, role, kind] = parts[this.next++];
      this.show(el, kind); this.show(role, 'role');
      /* a tick on each of the three values; the operators arrive silently,
         so five beats do not become five noises over the narration */
      if (el === eqABox || el === eqBBox || el === eqRBox) Audio_.blip('tick');
    }
  },

  /* the line is over: anything still staged comes in now, so a screen can
     never be left holding half a sentence */
  finish(){ this.advance(1); },

  tiles(){
    tilesEl.classList.remove('staged');
    tilesEl.classList.add('in');
    [...tilesEl.children].forEach((b, i) => {
      Motion.enter(b, { stiffness:430, damping:16, scale:0.66, y:26,
                        rot: i % 2 ? 5 : -5, delay: i * 75 });
    });
  }
};

/* ═══════════════════ 9 · speech bubble ═══════════════════════════════ */
async function say(text, speaker = 'guddu', tone = '', onProgress = null, voId = null){
  Game.lastSpeaker = speaker;
  Game.lastVoId   = voId;
  bubbleTx.textContent = text;
  bubbleEl.classList.remove('good','bad');
  if (tone) bubbleEl.classList.add(tone);
  bubbleEl.classList.add('show');
  await VO.speak(text, speaker, onProgress, voId);
}

/* ═══════════════════ 9b · the flood wipe ═════════════════════════════
   Between chapters the river climbs the whole screen, the next chapter is
   built behind the water, and then it drains away to reveal it. It uses the
   same water language as the tank — hard-edged foam on the surface, bubbles
   below — and no new artwork.                                              */
const FLOOD_REST = 1004;         // the river's waterline on the stage
const FLOOD_TOP  = -70;          // clear of the top edge

const Flood = {
  on:false, p:0, phase:'idle', phaseT:0, wob:0, bubbles:[],

  init(){
    for (let i = 0; i < 34; i++){
      const c = mk('circle', { fill:'#ffffff', 'fill-opacity':'0.34' });
      floodBub.appendChild(c);
      this.bubbles.push({ x: Math.random()*1920, y: Math.random()*1080,
                          r: 3 + Math.random()*9, v: 40 + Math.random()*90, el: c });
    }
  },

  surfaceY(){ return FLOOD_REST + (FLOOD_TOP - FLOOD_REST) * this.p; },

  /* rise · swap the screen underneath · drain away */
  async wipe(build){
    if (this.on) { build(); return; }
    this.on = true; floodEl.classList.add('on');
    Audio_.want('fill', true); Audio_.fadeIn('fill', 260);

    await this.ramp(0, 1, 1150, 'easeIn');     // the river climbs
    Audio_.want('fill', false);               // or resumeLoops() brings it back
    Audio_.fadeStop('fill', 300);
    Flow.splashBurst && Flow.splashBurst();
    await wait(260);

    build();                                    // next chapter, built unseen
    await wait(420);

    Audio_.want('drain', true); Audio_.fadeIn('drain', 260);
    await this.ramp(1, 0, 1750, 'easeOut');     // and drains away, slower
    Audio_.want('drain', false); Audio_.fadeStop('drain', 420);

    floodEl.classList.remove('on'); this.on = false;
  },

  ramp(from, to, ms, ease){
    return new Promise(res => {
      const t0 = performance.now();
      const step = () => {
        const x = Math.min(1, (performance.now() - t0) / ms);
        const e = ease === 'easeIn' ? x * x * (3 - 2 * x)
                                    : 1 - Math.pow(1 - x, 2.4);
        this.p = from + (to - from) * e;
        if (x < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  },

  tick(now, dt){
    if (!this.on) return;
    this.wob += dt * 0.004;
    const y = this.surfaceY();
    const amp = 13 + Math.abs(Math.sin(this.wob)) * 5;
    const pts = 40, W = 1920;
    let body = '', f1 = '', f2 = '';
    for (let i = 0; i <= pts; i++){
      const x  = (i / pts) * W;
      const w1 = Math.sin(x * 0.0062 + this.wob * 2.3) * amp;
      const w2 = Math.sin(x * 0.0027 - this.wob * 1.4) * amp * 0.7;
      const yy = y + w1 + w2;
      body += (i ? 'L' : 'M') + x.toFixed(1) + ',' + yy.toFixed(1) + ' ';
      f1   += (i ? 'L' : 'M') + x.toFixed(1) + ',' + (yy + 3).toFixed(1) + ' ';
      f2   += (i ? 'L' : 'M') + x.toFixed(1) + ',' + (yy + 16).toFixed(1) + ' ';
    }
    floodBody.setAttribute('d', body + 'L1920,1080 L0,1080 Z');
    floodFoam.setAttribute('d', f1);
    floodFoam2.setAttribute('d', f2);

    for (const b of this.bubbles){
      b.y -= b.v * dt / 1000;
      if (b.y < y + 16){ b.y = 1080 + Math.random()*120; b.x = Math.random()*1920; }
      b.el.setAttribute('cx', b.x.toFixed(1));
      b.el.setAttribute('cy', b.y.toFixed(1));
      b.el.setAttribute('r',  b.r.toFixed(1));
      b.el.setAttribute('fill-opacity', b.y > y + 30 ? '0.3' : '0');
    }
  }
};

/* ═══════════════════ 10 · flow controller ════════════════════════════ */
const Game = {
  i: 0, step: null, level: 0, waterLevel: 0, interactive: false, lastSpeaker: 'guddu',
  lastVoId: null,
  asked: 0, firstTry: 0, autoTimer: null,
  wrongCount: 0, idleTimer: null, solved: false,
  touched: false,               // has the learner grabbed the marker on this screen
  commitTimer: null,            // marker screens commit by coming to rest
  tilesOffered: false,          // the tiles only exist once the water has moved
  answer: null,                 // the level the learner has NAMED, via a tile

  /* every run of show() carries a number; anything that was awaiting when a
     new screen starts sees a stale one and drops out instead of stamping
     itself over the screen that replaced it */
  gen: 0,

  /* ── hold ────────────────────────────────────────────────────────────
     Freeze the flow, leave the scene running. The water, river, rain,
     pipes, valves and character carry on exactly as they are and the marker
     still drags — what stops is the flow controller: no auto-advance, no
     inactivity prompt, no chapter wipe. Whatever the game wanted to do
     while held is remembered and happens the moment it is released.
     A deliberate tap on Continue is never held back.
     The screen editor drives this; nothing else in the game sets it. */
  hold: false, heldAuto: 0, heldNext: false,

  setHold(on){
    on = !!on;
    if (on === this.hold) return this.hold;
    this.hold = on;
    document.body.classList.toggle('held', on);
    if (on){
      clearTimeout(this.autoTimer);
      clearTimeout(this.idleTimer);
    } else if (this.heldNext){
      this.heldNext = false; this.heldAuto = 0; this.next(true);
    } else if (this.heldAuto){
      const ms = this.heldAuto; this.heldAuto = 0; this.autoNext(ms);
    } else {
      this.poke();
    }
    return this.hold;
  },

  /* manual transport, for stepping through screens by hand. Works whether
     or not the flow is held, and lands with no long travel. */
  goTo(i){
    i = Math.max(0, Math.min(FLOW.length - 1, i));
    clearTimeout(this.autoTimer); clearTimeout(this.idleTimer);
    this.heldAuto = 0; this.heldNext = false;
    VO.cancel();
    clearTimeout(this.commitTimer);
    nextBtn.hidden = true;
    stage.classList.remove('celebrate');
    this.snapTo(i);
  },

  async start(){
    Audio_.init();
    Audio_.want('ambient', true); Audio_.play('ambient');
    Water.init(); Rain.build(); buildGauge(); buildZeroBand(); Flood.init(); Guddu.preload();
    markerEl.setAttribute('aria-valuemin', GAUGE_MIN);
    markerEl.setAttribute('aria-valuemax', GAUGE_MAX);
    applyLayout();
    this.waterLevel = FLOW[0].start; Water.set(this.waterLevel, 0);
    this.level = (typeof FLOW[0].markerStart === 'number') ? FLOW[0].markerStart : FLOW[0].start;
    placeMarker(this.level);
    loop();
    await wait(400);
    this.show(0);
  },

  /* move on by ourselves, unless the learner got there first */
  autoNext(ms){
    clearTimeout(this.autoTimer);
    if (this.hold){ this.heldAuto = ms; return; }   // frozen — remember it
    const at = this.i;
    this.autoTimer = setTimeout(() => {
      if (this.i !== at) return;              // already moved on
      this.next();
    }, ms);
  },

  poke(){                                   // any learner activity resets idle
    clearTimeout(this.idleTimer);
    if (!this.interactive || this.hold) return;
    this.idleTimer = setTimeout(() => this.onIdle(), INACTIVITY_MS);
  },

  async show(i){
    const gen = ++this.gen;                 // anything older than this is dead
    const stale = () => gen !== this.gen;
    this.i = i;
    const s = this.step = FLOW[i];
    this.wrongCount = 0; this.solved = false;
    this.interactive = false;
    this.touched = false; Ghost.stop(); Hops.clear();
    this.answer = null; this.tilesOffered = false; buildTiles(s, i); renderPips(s, 0);
    /* nothing of the sentence is on screen yet: the terms and the tiles
       are staged out here, before the water travel below gets its await */
    if (s.equation) EqStage.reset(s); else EqStage.clear();
    this.heldAuto = 0; this.heldNext = false;
    Flow.want(null);                          // never inherit a running pipe
    clearTimeout(this.idleTimer); clearTimeout(this.autoTimer); clearHints();
    tankEl.classList.add('locked');
    nextBtn.hidden = true;
    clearTimeout(this.commitTimer);

    Clip.warm(s);
    chapterName.textContent = CHAPTERS[s.chapter] || '';
    stepTag.textContent = `${i + 1} / ${FLOW.length}`;


    /* the marker usually rides the water; a "find the level" screen parks it
       somewhere else so there is something to actually drag */
    const wantMarker = (typeof s.markerStart === 'number') ? s.markerStart : s.start;

    /* bring the water to this screen's starting level, with the marker
       travelling alongside it instead of snapping when it arrives */
    if (this.waterLevel !== s.start || this.level !== wantMarker){
      const far = Math.max(Math.abs(this.waterLevel - s.start),
                           Math.abs(this.level - wantMarker));
      const ms  = Math.min(1500, 340 + far * 150);
      if (this.waterLevel !== s.start){
        Water.set(s.start, ms); Water.slosh = 0.8;
        Flow.want(s.start > this.waterLevel ? 'in' : 'out');
      }
      this.waterLevel = s.start;
      markerEl.style.transition = `top ${ms}ms ease-in-out`;
      this.level = wantMarker; placeMarker(this.level);
      await wait(Math.min(1600, ms + 90));
      markerEl.style.transition = '';
      Flow.want(null);
      if (stale()) return;
    } else {
      this.level = wantMarker; placeMarker(this.level);
    }

    renderEquation(s, this.level, false);

    const pinned = (((window.LAYOUT || {}).screens || {})[s.id] || {}).guddu;
    Guddu.pose((pinned && pinned.pose) ? pinned.pose
             : s.type === 'observe' ? 'point'
             : s.type === 'finish'  ? 'cheer'
             : 'talk');
    applyLayout();

    /* The sentence assembles itself as he speaks — each term is brought in
       by the narration's own progress, not by a timer running beside it. The
       tiles come only once the line is over and the sentence is complete. */
    if (s.equation){
      await say(s.vo, s.speaker || 'guddu', '', p => { if (!stale()) EqStage.advance(p); }, s.id + '.vo');
      if (stale()) return;
      EqStage.finish();
      /* The tiles do NOT arrive here. The sentence is now a question, and the
         tank is where it gets answered — see offerTiles(). */
      await wait(240);
    } else {
      await say(s.vo, s.speaker || 'guddu', '', null, s.id + '.vo');
    }
    if (stale()) return;

    /* Level 1: the water goes where the narration just said it went, on its
       own, while the marker stays put. Only then is it the learner's turn —
       their job is to bring the marker to the level the water reached. */
    if (typeof s.waterTo === 'number' && s.waterTo !== this.waterLevel){
      const far = Math.abs(s.waterTo - this.waterLevel);
      Flow.want(s.waterTo > this.waterLevel ? 'in' : 'out');
      Water.set(s.waterTo, 420 + far * 260); Water.slosh = 0.9;
      this.waterLevel = s.waterTo;
      await wait(560 + far * 260);
      Flow.want(null);
      if (stale()) return;
    }
    await wait(BEAT);
    if (stale()) return;

    if (s.type === 'observe' || s.type === 'finish'){
      await this.runObserve(s, gen);
      if (stale()) return;
      if (s.type === 'finish' && i === FLOW.length - 1){
        stage.classList.add('celebrate');
        Audio_.play('correct');
        if (EMBEDDED) nextBtn.querySelector('span').textContent = 'Back to the story';
        nextBtn.hidden = false;           // the only screen that waits for a tap
        tellHost('finished');
        return;
      }
      this.autoNext(AUTO_OBSERVE);        // a cutscene moves on by itself
      return;
    }

    /* interactive screen */
    Guddu.pose('idle');
    tankEl.classList.remove('locked');
    this.interactive = true;
    Hops.begin(this.level);               // this is where the move began
    markerEl.classList.add('hintGlow');   // keeps inviting until it is grabbed
    Ghost.arm(this.asked === 0 ? GHOST_ARM_FIRST : GHOST_ARM);
    if (typeof s.target === 'number'){
      const from = (typeof s.markerStart === 'number') ? s.markerStart : s.start;
      if (s.target > from) Flow.cue('in');
      else if (s.target < from) Flow.cue('out');
    }
    this.poke();
  },

  async runObserve(s, gen){
    const stale = () => gen !== undefined && gen !== this.gen;
    if (s.weather === 'rain'){
      Rain.set(true); Flow.setIn(true); Water.slosh = 1;
      /* the rain actually fills the tank to the level the doc names, and
         leaves it there — the next screen asks the learner to find it */
      const end = (typeof s.to === 'number') ? s.to : s.start;
      const far = Math.abs(end - s.start);
      Water.set(end, 900 + far * 300); await wait(1100 + far * 300);
      if (stale()) return;
      this.level = end; this.waterLevel = end;
      Flow.setIn(false); Rain.set(false);
    } else if (s.weather === 'drain'){
      Flow.setOut(true); Water.slosh = 0.8;
      const end = (typeof s.to === 'number') ? s.to : s.start;
      if (end !== s.start){
        const far = Math.abs(end - s.start);
        Water.set(end, 500 + far * 260); await wait(700 + far * 260);
        if (stale()) return;
        this.level = end; this.waterLevel = end; placeMarker(end);

      } else {
        Water.set(s.start - 0.5, 1200); await wait(1300);
        Water.set(s.start, 1300); await wait(1400);
      }
      Flow.setOut(false);
    } else {
      Water.slosh = 0.35; await wait(700);
    }
  },

  onLevelChanged(lv){
    if (this.step && this.step.equation && !this.solved)
      renderEquation(this.step, lv, false);
    markerEl.setAttribute('aria-valuenow', lv);
  },

  onMoveSettled(){
    if (!this.interactive) return;
    this.poke();
    const from = (typeof this.step.markerStart === 'number') ? this.step.markerStart : this.step.start;
    if (this.level === from) return;     // never moved: there is nothing to say yet
    if (this.step.equation){ this.offerTiles(); return; }
    this.armCommit();
  },

  /* The answer tiles are earned, not given. Naming the landing level before
     moving the water is a guess at four numbers, and the tank — which is the
     only thing in the game that SHOWS what adding 4 to −2 does — can be
     ignored completely. So they arrive once the water has been moved and come
     to rest somewhere other than where the screen started, which is the
     learner saying "this is where I make it". They then name it.

     Coming to rest is the trigger rather than the first touch, because tiles
     appearing mid-drag is something moving under the hand. And it is any
     level, never the right one: unlocking on the correct level would make the
     tiles a formality and hand over the answer. Every equation in the game has
     a non-zero second term, so the water always has to move. */
  offerTiles(){
    if (this.tilesOffered) return;
    this.tilesOffered = true;
    EqStage.tiles();
  },

  /* A marker screen has no button either: bringing the marker to rest on a
     level IS naming that level. The grace before it counts is the whole
     trick — letting go to change grip, or overshooting and coming back, must
     not be read as an answer, so touching the marker again cancels it and
     the clock starts over from wherever they stop next. */
  armCommit(){
    clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => {
      if (this.interactive && !this.solved) this.check();
    }, COMMIT_MS);
  },
  cancelCommit(){ clearTimeout(this.commitTimer); },

  /* The symbolic commitment: the learner names where they landed. The tap IS
     the answer — there is no second button to confirm it — so it closes the
     screen to further input at once and the verdict follows one beat later,
     which is just long enough for the tile to be seen to be chosen. */
  pick(v){
    if (!this.interactive) return;
    if (!this.tilesOffered) return;      // not on offer until the water has moved
    this.answer = v;
    [...tilesEl.children].forEach(b =>
      b.classList.toggle('pick', Number(b.dataset.v) === v));
    renderEquation(this.step, this.level, false);
    Audio_.blip('tick');
    this.touched = true; Ghost.stop();
    this.interactive = false;            // no double taps while it resolves
    clearTimeout(this.idleTimer);
    setTimeout(() => this.check(), 260);
  },

  /* one level of travel — called for every tick the slider crosses */
  slideTo(lv){
    lv = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, lv));
    if (lv === this.level || !this.interactive) return;
    const up = lv > this.level;
    this.level = lv;
    placeMarker(lv);
    Audio_.play('step'); Audio_.blip('tick');
    if (!this.step.markerOnly){
      this.waterLevel = lv;
      Water.set(lv, 230);
      Water.slosh = Math.min(1, Water.slosh + 0.4);
      Flow.want(up ? 'in' : 'out');
      Flow.bump();
      clearTimeout(this._flowOff);
      this._flowOff = setTimeout(() => Flow.want(null), 520);
    }
    Hops.render(lv);
    if (this.step.equation) renderPips(this.step, Math.abs(lv - this.step.start));
    this.onLevelChanged(lv);
  },

  settle(){
    clearTimeout(this._flowOff);
    this._flowOff = setTimeout(() => Flow.want(null), 320);
    this.onMoveSettled();
  },

  async check(){
    if (this.solved) return;
    clearTimeout(this.commitTimer);
    this.interactive = false;
    Ghost.stop();
    clearTimeout(this.idleTimer);
    await wait(120);
    const given = this.step.equation ? this.answer : this.level;
    if (given === this.step.target) this.correct();
    else this.wrong();
  },

  async correct(){
    /* Same generation guard show() uses. Without it a screen change during
       the celebration — the QA jumper, the editor transport — left this
       routine running against whatever screen had replaced it: it read the
       NEW step's correct line, then armed an auto-advance that skipped it. */
    const gen = this.gen, stale = () => gen !== this.gen;
    this.interactive = false; this.solved = true;
    Ghost.stop();
    this.asked++; if (this.wrongCount === 0) this.firstTry++;
    tankEl.classList.add('locked');
    clearTimeout(this.idleTimer); clearTimeout(this.commitTimer); clearHints();
    Audio_.play('correct');
    Guddu.pose(this.i === FLOW.length - 2 ? 'cheer' : 'happy');
    stage.classList.add('celebrate');
    setTimeout(() => stage.classList.remove('celebrate'), 1000);
    Water.slosh = 1;
    tilesEl.classList.add('locked');
    [...tilesEl.children].forEach(b => b.disabled = true);
    markCorrect(this.level);
    renderEquation(this.step, this.level, true);
    await say(this.step.correct, 'guddu', 'good', null, this.step.id + '.correct');
    if (stale()) return;
    await wait(BEAT);
    if (stale()) return;
    this.autoNext(AUTO_CORRECT);
  },

  async wrong(){
    const gen = this.gen, stale = () => gen !== this.gen;
    this.wrongCount++;
    Ghost.stop();
    const tierIdx = Math.min(this.wrongCount, 3) - 1;
    const tier = (this.step.wrong && this.step.wrong[tierIdx]) || { vo:'Try once more.', anim:'pulseStart' };
    this.interactive = false;
    clearTimeout(this.idleTimer);
    Audio_.blip('wrong');
    Guddu.pose(this.wrongCount >= 3 ? 'surprised' : 'worried');
    stage.classList.add('shake');
    setTimeout(() => stage.classList.remove('shake'), 460);
    await say(tier.vo, 'guddu', 'bad', null, this.step.id + '.wrong' + (tierIdx + 1));
    if (stale()) return;
    Guddu.pose('think');
    await this.runHintAnim(tier.anim);
    if (stale()) return;
    /* The doc defines three tiers and no more, so a fourth attempt repeats
       the third rather than inventing a walkthrough. */

    clearHints();
    Guddu.pose('idle');
    tankEl.classList.remove('locked');

    /* A tile tap is now the whole answer, so the tile that was just spent is
       marked and retired. Leaving it live invites the same tap again, and
       with no Check button in the way that is a loop with nothing in it. */
    if (this.step.equation && this.answer !== null){
      [...tilesEl.children].forEach(b => {
        if (Number(b.dataset.v) === this.answer){ b.classList.add('spent'); b.disabled = true; }
        b.classList.remove('pick');
      });
      this.answer = null;
      renderEquation(this.step, this.level, false);
    }

    this.interactive = true;
    /* never having touched the marker is exactly the person the hand is for,
       but never to someone who has been dragging and simply got it wrong */
    if (!this.touched){ markerEl.classList.add('hintGlow'); Ghost.arm(); }
    this.poke();
  },

  async onIdle(){
    if (!this.interactive || this.hold) return;
    clearTimeout(this.commitTimer);
    const idle = this.step.idle;
    if (!idle) { this.poke(); return; }
    const gen = this.gen, stale = () => gen !== this.gen;
    this.interactive = false;
    Ghost.stop();
    Guddu.pose('think');
    await say(idle.vo, idle.speaker || 'guddu', '', null, this.step.id + '.idle');
    if (stale()) return;
    await this.runHintAnim(idle.anim);
    if (stale()) return;
    clearHints();
    Guddu.pose('idle');
    this.interactive = true;
    /* fifteen seconds of nothing earns the hand back, touched or not */
    this.touched = false; markerEl.classList.add('hintGlow'); Ghost.arm();
    this.poke();
  },

  async runHintAnim(name){
    const s = this.step;
    const hold = (el, cls, ms) => { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
    switch (name){
      case 'highlightCentre':
      case 'highlightZero':
        hold(rows[0], 'hl', 2600); await wait(2700); break;
      case 'pulseZero':
        hold(rows[0], 'pulse', 3400); await wait(3500); break;
      case 'pulseStart':
        hold(rows[s.start], 'pulse', 3000); await wait(3100); break;
      case 'highlightUp':
        Flow.cue('in');
        for (let lv = s.start + 1; lv <= GAUGE_MAX; lv++) hold(rows[lv], 'zoneGlow', 2600);
        await wait(2700); break;
      case 'highlightDown':
        Flow.cue('out');
        for (let lv = GAUGE_MIN; lv < s.start; lv++) hold(rows[lv], 'zoneGlow', 2600);
        await wait(2700); break;
      case 'stepThrough': {
        const dir = s.target > s.start ? 1 : -1;
        for (let lv = s.start; dir > 0 ? lv <= s.target : lv >= s.target; lv += dir){
          hold(rows[lv], 'hl', 620); Audio_.blip('tick'); await wait(420);
        }
        await wait(300); break;
      }
      case 'pulseSpan': {
        const dir = s.target > s.start ? 1 : -1;
        for (let lv = s.start + dir; dir > 0 ? lv <= s.target : lv >= s.target; lv += dir)
          hold(rows[lv], 'pulse', 3200);
        await wait(3300); break;
      }
      case 'resetToStart':
        Mover.request(s.start);
        await wait(300 + Math.abs(this.level - s.start) * STEP_MS);
        break;
      case 'pulseEquation':
        hold(eqPanel, 'pulseEq', 3200); await wait(3300); break;
      default: await wait(400);
    }
  },

  /* place the water and marker with no travel, then build the screen */
  snapTo(i){
    const s = FLOW[i];
    this.waterLevel = s.start; Water.set(s.start, 0);
    this.level = (typeof s.markerStart === 'number') ? s.markerStart : s.start;
    placeMarker(this.level);
    this.show(i);
  },

  setPose(name){ Guddu.pose(name); },
  get __poseNow(){ return Guddu.cur; },

  next(force){
    if (this.hold && !force){ this.heldNext = true; return; }
    const i = this.i + 1;
    if (i >= FLOW.length) return;
    const chapterChanges = FLOW[i].chapter !== this.step.chapter;
    if (chapterChanges){
      clearTimeout(this.idleTimer); VO.cancel();
      Flood.wipe(() => this.snapTo(i));
    } else {
      this.show(i);
    }
  }
};

/* ═══════════════════ 11 · main loop ══════════════════════════════════ */
let last = performance.now();
function loop(now){
  now = now || performance.now();
  const dt = Math.min(64, now - last); last = now;
  Water.tick(now, dt);
  Flow.tick(now, dt);
  if (Flow.dir === 'in')  Audio_.level('fill',  Flow.strength);
  if (Flow.dir === 'out') Audio_.level('drain', Flow.strength);
  Rain.tick(dt);
  Flood.tick(now, dt);
  requestAnimationFrame(loop);
}

/* ═══════════════════ 12 · wiring ═════════════════════════════════════ */
/* The only button the game still has. Check went because a tile tap and a
   marker coming to rest already say everything Check was asking to confirm,
   and Continue went because the flow moves on by itself everywhere — the one
   place it must not is the end, which is what this is. */
nextBtn.addEventListener('click', () => {
  /* standalone this is Play again; inside the storybook it hands the reader
     back to the scene after the one that sent them here */
  if (EMBEDDED) { tellHost('exit'); return; }
  location.reload();
});

$('#replayBtn').addEventListener('click', () => {
  if (!Game.step) return;
  say(bubbleTx.textContent || Game.step.vo, Game.lastSpeaker || 'guddu',
      '', null, Game.lastVoId);
  Game.poke();
});
$('#muteBtn').addEventListener('click', e => {
  Audio_.muted = !Audio_.muted;
  e.currentTarget.classList.toggle('off', Audio_.muted);
  e.currentTarget.textContent = Audio_.muted ? '\u{1F507}' : '\u{1F50A}';
  if (Audio_.muted){ Audio_.pauseAll(); Clip.stop(); VO.cancel(); }
  else { Audio_.resumeLoops(); }
});

$('#startBtn').addEventListener('click', () => {
  gate.classList.add('hide');
  setTimeout(() => { gate.style.display = 'none'; }, 520);
  Game.start();
});

/* ═══════════ QA ONLY ═══════════════════════════════════════════════════
   Jump straight to any screen. Delete this block, the #qaPanel markup in
   index.html and the QA block in style.css to remove it entirely.        */
(function buildQA(){
  const panel = document.getElementById('qaPanel');
  if (!panel) return;
  const list = document.getElementById('qaList');
  FLOW.forEach((s, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<i>${String(i + 1).padStart(2,'0')}</i>` +
                  `<span>${s.screen || s.id}</span>` +
                  `<em>${CHAPTERS[s.chapter] || ''}</em>`;
    b.addEventListener('click', () => {
      nextBtn.hidden = true;
      stage.classList.remove('celebrate');
      clearTimeout(Game.autoTimer);
      Game.waterLevel = s.start;          // land cleanly, no long travel
      Water.set(s.start, 0);
      Game.show(i);
      panel.classList.remove('open');
    });
    list.appendChild(b);
  });
  document.getElementById('qaTab')
          .addEventListener('click', () => panel.classList.toggle('open'));
  /* Q toggles it too, in case the tab is ever in the way */
  window.addEventListener('keydown', e => {
    if (e.key === 'q' || e.key === 'Q') panel.classList.toggle('open');
  });
})();
/* ═══════════ end QA ═══════════════════════════════════════════════════ */

/* the host silences the game the instant it closes the overlay, so nothing
   keeps playing behind a hidden iframe */
window.addEventListener('message', e => {
  const d = e && e.data;
  if (!d || d.source !== 'integers-host') return;
  if (d.type === 'silence'){
    Audio_.muted = true; Audio_.pauseAll(); Clip.stop(); VO.cancel();
  }
});

window.__GAME = Game;
window.__EMBEDDED = EMBEDDED;
window.__HOPS = Hops;
window.__CLIP = Clip;
window.__EQ = EqStage;          // test hooks
window.__SPRING = Spring;
window.__MOTION = Motion;
window.__FLOW = Flow;
window.__AUDIO = Audio_;

/* the layout record is re-applied continuously so edits land at once */
setInterval(applyLayout, 250);

/* keep everything pinned if anything ever tries to scroll the document */
setInterval(() => { if (window.scrollY || window.scrollX) window.scrollTo(0,0); }, 500);

})();
