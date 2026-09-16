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
const STEP_PX= 72.7;                                        // Figma tick spacing
const TOP_SVG= 60.1;                                        // svg-y of level +5 (frame y183)

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
   would waste it — but it still goes, so the learner never has to tap to be
   told they were right. */
const AUTO_OBSERVE = 1100;
const AUTO_CORRECT = 2900;

/* ───────────────────────────── dom ──────────────────────────────────── */
const $  = s => document.querySelector(s);
const stage    = $('#stage');
const tankEl   = $('#tank');
const gaugeEl  = $('#gauge');
const markerEl = $('#marker');
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
const chevIn   = $('#chevIn');
const chevOut  = $('#chevOut');
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
const surfRing = $('#surfRing');
const checkBtn = $('#checkBtn');
const nextBtn  = $('#nextBtn');
const hintBar  = $('#hintBar');
const hintText = $('#hintText');
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
      const a = new Audio(src);
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
    if (!this.supported) return;
    try { speechSynthesis.cancel(); } catch(_){}
    this.speaking = false;
    clearInterval(this.keepAlive);
    Guddu.talk(false);
  },

  speak(text, speaker = 'guddu'){
    const who = Guddu;
    return new Promise(resolve => {
      this.cancel();
      if (Audio_.muted || !this.supported){
        who.talk(true);
        const ms = Math.max(1600, text.length * 62);
        setTimeout(() => { who.talk(false); resolve(); }, ms);
        return;
      }
      const u = new SpeechSynthesisUtterance(text.replace(/−/g, 'minus '));
      const v = speaker === 'pari' ? this.pari : this.guddu;
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate  = 0.84;                       // slow and clear, on purpose
      u.pitch = speaker === 'pari' ? 1.18 : 0.96;
      u.volume= 1;
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        this.speaking = false; clearInterval(this.keepAlive);
        who.talk(false); resolve();
      };
      u.onstart = () => { this.speaking = true; who.talk(true); };
      u.onend   = finish;
      u.onerror = finish;
      // Chrome silently stops long utterances unless nudged.
      clearInterval(this.keepAlive);
      this.keepAlive = setInterval(() => {
        if (!this.speaking) return clearInterval(this.keepAlive);
        try { speechSynthesis.pause(); speechSynthesis.resume(); } catch(_){}
      }, 8000);
      try { speechSynthesis.speak(u); } catch(_){ finish(); }
      setTimeout(finish, Math.max(5000, text.length * 150));   // hard safety net
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
    if (VO.supported) { try { speechSynthesis.pause(); } catch(_){} }
    if (Audio_.ctx && Audio_.ctx.state === 'running') Audio_.ctx.suspend();
  } else {
    Audio_.resumeLoops();
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

const Guddu = {
  el: $('#guddu'), a: $('#poseA'), b: $('#poseB'),
  front: 'a', cur: 'talk',

  preload(){
    POSES.forEach(p => { const i = new Image(); i.src = `assets/img/guddu-${p}.png`; });
  },

  pose(name){
    if (!POSES.includes(name) || name === this.cur) return;
    this.cur = name;
    const showing = this.front === 'a' ? this.b : this.a;
    const hiding  = this.front === 'a' ? this.a : this.b;
    showing.src = `assets/img/guddu-${name}.png`;
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
  bubbleText:'#bubbleText', eqPanel:'#eqPanel', checkBtn:'#checkBtn',
  nextBtn:'#nextBtn', hintBar:'#hintBar', chapterTag:'#chapterTag',
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
      const p = Math.min(1, (now - this.t0) / this.dur);
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
const Flow = {
  SPOUT: { x: 208, y: 76 },        // inlet mouth, tank-local
  DRAIN: { x: 737, y: 938 },       // outlet mouth, tank-local
  RIVER: { x: 1015, y: 1044 },     // where the outflow lands, stage coords
  TANK_X: 203, TANK_Y: 10,         // tank origin on the stage

  dir: null,          // 'in' | 'out' | null  — what the water is doing
  phase: 'off',       // 'lead' | 'run' | 'tail' | 'off'
  vis: 0,             // 0..1 how much column is drawn
  strength: 0,        // 0..1 how hard it is flowing
  t: 0, phaseT: 0, dash: 0, idleT: 0,
  drips: [], splash: [], rings: [],

  /* back-compatible switches used by the flow controller */
  setIn (on){ on ? this.want('in')  : (this.dir === 'in'  && this.want(null)); },
  setOut(on){ on ? this.want('out') : (this.dir === 'out' && this.want(null)); },

  want(dir){
    if (dir === this.dir) return;
    if (dir){
      this.dir = dir; this.phase = 'lead'; this.phaseT = 0;
      for (let i = 0; i < 3; i++) setTimeout(() => this.drip(dir), i * 70);
      Audio_.blip('valve');
      const key = dir === 'in' ? 'fill' : 'drain';
      Audio_.want(key, true); Audio_.fadeIn(key, 320);
      (dir === 'in' ? pipeIn : pipeOut).classList.add('active');
      (dir === 'in' ? valveIn : valveOut).classList.add('spin', 'lit');
      (dir === 'in' ? chevIn : chevOut).setAttribute('opacity', '1');
    } else if (this.dir){
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
        (d === 'in' ? pipeIn : pipeOut).classList.remove('active');
        (d === 'in' ? valveIn : valveOut).classList.remove('spin', 'lit');
        (d === 'in' ? chevIn : chevOut).setAttribute('opacity', '0');
      }
    }
    this.vis += (want - this.vis) * Math.min(1, dt / 90);
    if (this.vis < 0.004) this.vis = 0;

    /* ripples on the tank surface while pouring in */
    if (this.dir === 'in' && this.phase === 'run'){
      this._ringT = (this._ringT || 0) + dt;
      if (this._ringT > 260){ this._ringT = 0; Water.spawnRing(); }
    }

    /* a lonely drip from the spout when nothing is happening */
    this.idleT += dt;
    if (!this.dir && this.idleT > 6000){ this.idleT = 0; this.drip('in'); }
    if (this.dir) this.idleT = 0;

    this.drawIn();
    this.drawOut();
    this.moveDrips(dt);
    this.moveSplash(dt);

    chevIn .setAttribute('stroke-dashoffset', this.dash.toFixed(1));
    chevOut.setAttribute('stroke-dashoffset', this.dash.toFixed(1));
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
    const w0 = (10 + this.strength * 7) * this.vis;
    const w1 = w0 * 1.35;
    const cx1 = sx + 34, cy1 = sy + 12;
    const cx2 = ex - 18, cy2 = ey - 90;
    colOut.setAttribute('d',
      `M${sx-w0},${sy-w0*0.4} C${cx1-w0+wob},${cy1} ${cx2-w1+wob},${cy2} ${ex-w1+wob},${ey}
       L${ex+w1+wob},${ey} C${cx2+w1+wob},${cy2} ${cx1+w0+wob},${cy1} ${sx+w0},${sy+w0*0.4} Z`);
    colOutHi.setAttribute('d',
      `M${sx-w0*0.3},${sy} C${cx1-w0*0.3+wob},${cy1} ${cx2-w1*0.4+wob},${cy2} ${ex-w1*0.4+wob},${ey-10}`);
    colOutHi.setAttribute('stroke-dashoffset', this.dash.toFixed(1));

    /* keep the river churning while it pours */
    this._splashT = (this._splashT || 0) + 16;
    if (this._splashT > 240){ this._splashT = 0; this.splashAt(ex + wob, ey, 4); }
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
const rows = {};
function buildGauge(){
  for (let lv = GAUGE_MAX; lv >= GAUGE_MIN; lv--){
    const r = document.createElement('div');
    r.className = 'lvRow';
    r.dataset.level = lv;
    r.style.top    = (tankYFor(lv) - 36.35) + 'px';
    const tick = document.createElement('i'); tick.className = 'lvTick';
    const lab  = document.createElement('b'); lab.className = 'lvLabel';
    lab.textContent = lv > 0 ? '+' + lv : (lv < 0 ? '-' + Math.abs(lv) : '0');
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
  Object.values(rows).forEach(r => r.classList.remove('hl','pulse','zoneGlow','stepGlow'));
  eqPanel.classList.remove('pulseEq');
}

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
  async demo(from, to){                     // scripted walk, used by hints
    Game.level = from; Game.waterLevel = from; Water.set(from, 260); placeMarker(from); await wait(300);
    const dir = to > from ? 1 : -1;
    for (let lv = from + dir; dir > 0 ? lv <= to : lv >= to; lv += dir){
      Game.level = lv; Game.waterLevel = lv; Water.set(lv, STEP_MS); placeMarker(lv);
      Audio_.play('step');
      rows[lv].classList.add('stepGlow');
      setTimeout(() => rows[lv].classList.remove('stepGlow'), 600);
      Game.onLevelChanged(lv);
      await wait(STEP_MS + 120);
    }
  }
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
  if (e.key === 'ArrowUp'   || e.key === 'ArrowRight'){ Game.slideTo(Game.level + 1); Game.settle(); Game.poke(); e.preventDefault(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' ){ Game.slideTo(Game.level - 1); Game.settle(); Game.poke(); e.preventDefault(); }
});

/* ═══════════════════ 8 · equation panel ══════════════════════════════ */
const fmt  = n => n > 0 ? '+' + n : (n < 0 ? '−' + Math.abs(n) : '0');
const wrap = n => '(' + fmt(n) + ')';

/* Guided screens count the second term up as the learner moves — that is the
   teaching device the flow sheet asks for. Every other screen must SHOW the
   number sentence, otherwise there is no question to read: there the second
   term is fixed and the answer box previews whatever level the learner is on. */
function renderEquation(step, level, solved){
  if (!step.equation){ eqPanel.hidden = true; return; }
  eqPanel.hidden = false;
  const { a, op, b } = step.equation;
  eqA.textContent  = a === 0 ? '0' : wrap(a);
  eqOp.textContent = op;
  let bumped;
  if (step.guided){
    const delta = level - a;
    eqB.textContent = wrap(solved ? b : (op === '+' ? delta : -delta));
    eqR.textContent = solved ? fmt(step.target) : '?';
    bumped = eqB;
  } else {
    eqB.textContent = wrap(b);
    eqR.textContent = (solved || level !== a) ? fmt(level) : '?';
    bumped = eqR;
  }
  eqPanel.classList.toggle('solved', !!solved);
  bumped.classList.add('bump');
  setTimeout(() => bumped.classList.remove('bump'), 190);
}

/* the number sentence, read the way a teacher would say it */
const spokenNum = n => n > 0 ? 'plus ' + n : (n < 0 ? 'minus ' + Math.abs(n) : 'zero');
const eqSentence = e =>
  `${spokenNum(e.a)}, ${e.op === '+' ? 'plus' : 'minus'}, ${spokenNum(e.b)}. What is the new water level?`;
const eqWritten  = e => `${wrap(e.a)} ${e.op} ${wrap(e.b)} = ?`;

/* ═══════════════════ 9 · bubble + hint strip ═════════════════════════ */
async function say(text, speaker = 'guddu', tone = ''){
  Game.lastSpeaker = speaker;
  bubbleTx.textContent = text;
  bubbleEl.classList.remove('good','bad');
  if (tone) bubbleEl.classList.add(tone);
  bubbleEl.classList.add('show');
  await VO.speak(text, speaker);
}
function setHint(t){
  hintText.textContent = t || '';
  hintBar.classList.toggle('show', !!t);
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
  asked: 0, firstTry: 0, autoTimer: null,
  wrongCount: 0, idleTimer: null, solved: false,

  async start(){
    Audio_.init();
    Audio_.want('ambient', true); Audio_.play('ambient');
    Water.init(); Rain.build(); buildGauge(); Flood.init(); Guddu.preload();
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
    const at = this.i;
    this.autoTimer = setTimeout(() => {
      if (this.i !== at) return;              // already moved on
      nextBtn.hidden = true;
      this.next();
    }, ms);
  },

  poke(){                                   // any learner activity resets idle
    clearTimeout(this.idleTimer);
    if (!this.interactive) return;
    this.idleTimer = setTimeout(() => this.onIdle(), INACTIVITY_MS);
  },

  async show(i){
    this.i = i;
    const s = this.step = FLOW[i];
    this.wrongCount = 0; this.solved = false;
    this.interactive = false;
    clearTimeout(this.idleTimer); clearTimeout(this.autoTimer); clearHints();
    tankEl.classList.add('locked');
    checkBtn.hidden = true; nextBtn.hidden = true;
    checkBtn.classList.remove('ready');

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
    } else {
      this.level = wantMarker; placeMarker(this.level);
    }

    renderEquation(s, this.level, false);
    setHint('');

    const pinned = (((window.LAYOUT || {}).screens || {})[s.id] || {}).guddu;
    Guddu.pose((pinned && pinned.pose) ? pinned.pose
             : s.type === 'observe' ? 'point'
             : s.type === 'finish'  ? 'cheer'
             : s.guided             ? 'point' : 'talk');
    applyLayout();
    await say(s.vo, s.speaker || 'guddu');
    if (s.equation && !s.guided){
      await wait(300);
      await say(eqSentence(s.equation), 'guddu');
    }
    await wait(BEAT);

    if (s.type === 'observe' || s.type === 'finish'){
      await this.runObserve(s);
      setHint(s.hint || '');
      if (s.type === 'finish' && i === FLOW.length - 1){
        stage.classList.add('celebrate');
        Audio_.play('correct');
        setHint(`You answered ${this.firstTry} of ${this.asked} first time.`);
        nextBtn.querySelector('span').textContent = 'Play again';
        nextBtn.dataset.restart = '1';
        nextBtn.hidden = false;           // the only screen that waits for a tap
        return;
      }
      this.autoNext(AUTO_OBSERVE);        // a cutscene moves on by itself
      return;
    }

    /* interactive screen */
    Guddu.pose('idle');
    tankEl.classList.remove('locked');
    this.interactive = true;
    setHint(s.equation && !s.guided
      ? `Read  ${eqWritten(s.equation)}  then drag the red marker to the answer.`
      : (s.hint || ''));
    if (s.type === 'move'){ checkBtn.hidden = false; checkBtn.disabled = false; }
    markerEl.classList.add('hintGlow');
    setTimeout(() => markerEl.classList.remove('hintGlow'), 4200);
    if (typeof s.target === 'number'){
      const from = (typeof s.markerStart === 'number') ? s.markerStart : s.start;
      if (s.target > from) Flow.cue('in');
      else if (s.target < from) Flow.cue('out');
    }
    this.poke();
  },

  async runObserve(s){
    if (s.weather === 'rain'){
      Rain.set(true); Flow.setIn(true); Water.slosh = 1;
      // a visible surge that settles back — the story moves, the number doesn't
      Water.set(s.start + 0.55, 1400); await wait(1500);
      Water.set(s.start, 1500); await wait(1600);
      Flow.setIn(false); Rain.set(false);
    } else if (s.weather === 'drain'){
      Flow.setOut(true); Water.slosh = 0.8;
      const end = (typeof s.to === 'number') ? s.to : s.start;
      if (end !== s.start){
        const far = Math.abs(end - s.start);
        Water.set(end, 500 + far * 260); await wait(700 + far * 260);
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
    const from = (typeof this.step.markerStart === 'number') ? this.step.markerStart : this.step.start;
    checkBtn.classList.toggle('ready', this.level !== from);
    this.poke();
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
    this.onLevelChanged(lv);
  },

  settle(){
    clearTimeout(this._flowOff);
    this._flowOff = setTimeout(() => Flow.want(null), 320);
    this.onMoveSettled();
  },

  async check(){
    if (!this.interactive) return;
    this.interactive = false;
    checkBtn.disabled = true; checkBtn.classList.remove('ready');
    clearTimeout(this.idleTimer);
    await wait(180);
    if (this.level === this.step.target) this.correct();
    else this.wrong();
  },

  async correct(){
    this.interactive = false; this.solved = true;
    this.asked++; if (this.wrongCount === 0) this.firstTry++;
    tankEl.classList.add('locked');
    clearTimeout(this.idleTimer); clearHints();
    checkBtn.hidden = true;
    Audio_.play('correct');
    Guddu.pose(this.i === FLOW.length - 2 ? 'cheer' : 'happy');
    stage.classList.add('celebrate');
    setTimeout(() => stage.classList.remove('celebrate'), 1000);
    Water.slosh = 1;
    renderEquation(this.step, this.level, true);
    setHint('');
    await say(this.step.correct, 'guddu', 'good');
    await wait(BEAT);
    nextBtn.hidden = false;
    setHint('');
    this.autoNext(AUTO_CORRECT);
  },

  async wrong(){
    this.wrongCount++;
    const tierIdx = Math.min(this.wrongCount, 3) - 1;
    const tier = (this.step.wrong && this.step.wrong[tierIdx]) || { vo:'Try once more.', anim:'pulseStart' };
    this.interactive = false;
    clearTimeout(this.idleTimer);
    Audio_.blip('wrong');
    Guddu.pose(this.wrongCount >= 3 ? 'surprised' : 'worried');
    stage.classList.add('shake');
    setTimeout(() => stage.classList.remove('shake'), 460);
    await say(tier.vo, 'guddu', 'bad');
    Guddu.pose('think');
    await this.runHintAnim(tier.anim);

    if (this.wrongCount >= 4){            // after four tries, walk it through
      Guddu.pose('point');
      await say('Watch carefully — I will show you.', 'guddu');
      await Mover.demo(this.step.start, this.step.target);
      await wait(500);
      await say('Now you try. Move the water back and check again.', 'guddu');
      Mover.request(this.step.start);
      await wait(600);
    }

    clearHints();
    Guddu.pose('idle');
    tankEl.classList.remove('locked');
    this.interactive = true;
    checkBtn.disabled = false;
    if (this.step.type === 'move') checkBtn.hidden = false;
    this.poke();
  },

  async onIdle(){
    if (!this.interactive) return;
    const idle = this.step.idle;
    if (!idle) { this.poke(); return; }
    this.interactive = false;
    Guddu.pose('think');
    await say(idle.vo, idle.speaker || 'guddu');
    await this.runHintAnim(idle.anim);
    clearHints();
    Guddu.pose('idle');
    this.interactive = true;
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

  next(){
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
checkBtn.addEventListener('click', () => Game.check());
nextBtn .addEventListener('click', () => {
  clearTimeout(Game.autoTimer);
  if (nextBtn.dataset.restart === '1'){ location.reload(); return; }
  nextBtn.hidden = true; Game.next();
});

$('#replayBtn').addEventListener('click', () => {
  if (!Game.step) return;
  say(bubbleTx.textContent || Game.step.vo, Game.lastSpeaker || 'guddu');
  Game.poke();
});
$('#muteBtn').addEventListener('click', e => {
  Audio_.muted = !Audio_.muted;
  e.currentTarget.classList.toggle('off', Audio_.muted);
  e.currentTarget.textContent = Audio_.muted ? '\u{1F507}' : '\u{1F50A}';
  if (Audio_.muted){ Audio_.pauseAll(); VO.cancel(); }
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
      nextBtn.dataset.restart = ''; nextBtn.querySelector('span').textContent = 'Continue';
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

window.__GAME = Game;
window.__FLOW = Flow;

/* the layout record is re-applied continuously so edits land at once */
setInterval(applyLayout, 250);

/* keep everything pinned if anything ever tries to scroll the document */
setInterval(() => { if (window.scrollY || window.scrollX) window.scrollTo(0,0); }, 500);

})();
