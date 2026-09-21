/* ══════════════════════════════════════════════════════════════════════
   Phase 0 — does the zoom hold frames?

   The question this answers is narrow and worth stating: a dolly through
   the window is a pure `transform` animation on two composited layers, so
   it should cost almost nothing no matter how slow the device. The way to
   be sure is to measure it against a control that is deliberately built
   wrong — 'bad' animates width/height/left/top, which forces layout on
   every frame. If the harness cannot tell those two apart, the harness is
   not measuring anything.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const $ = s => document.querySelector(s);

/* ── geometry ───────────────────────────────────────────────────────────
   The window opening, in stage pixels. Authored at 780,260 → 1780,1010 on
   the shared 2560x1440 room canvas; the canvas is shown over the 1920x1080
   stage, so every number is three quarters of the authored one.        */
const WIN = { x:585, y:195, w:750, h:562.5 };
const WIN_CX = WIN.x + WIN.w / 2;            //  960
const WIN_CY = WIN.y + WIN.h / 2;            //  476.25
/* fill the stage from the window: the wider of the two ratios, so nothing
   is left uncovered when the camera arrives */
const ZOOM   = Math.max(1920 / WIN.w, 1080 / WIN.h);        // 2.56
const DROP   = 540 - WIN_CY;                 // carry the pivot to mid-screen
const PARAL  = 1.85;                         // the room is nearer, so it grows faster
const DUR    = 1100;

const world = $('#world'), room = $('#room'), stage = $('#stage'), glass = $('#glass');

function fit(){
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit); fit();

/* ── the gauge ──────────────────────────────────────────────────────── */
const GMAX = 5, GMIN = -5, LEVELS = GMAX - GMIN;
const IH = 398.4, IW = 198.5;
const yFor = lv => (GMAX - lv) / LEVELS * IH;
(() => {
  const g = $('#ticks');
  for (let lv = GMAX; lv >= GMIN; lv--){
    const y = yFor(lv);
    const l = document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1',0); l.setAttribute('x2',IW); l.setAttribute('y1',y); l.setAttribute('y2',y);
    if (lv === 0) l.setAttribute('stroke','#c4462f');
    g.appendChild(l);
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', IW - 4); t.setAttribute('y', y - 3); t.textContent = lv;
    g.appendChild(t);
  }
})();
function setWater(lv){
  const y = yFor(lv);
  const r = $('#water');
  r.setAttribute('y', y); r.setAttribute('height', Math.max(0, IH - y));
}

/* ── the shot ───────────────────────────────────────────────────────────
   Sampled keyframes rather than one from/to pair: the scale and the drop
   have to stay locked to each other all the way through, and sampling is
   the cheapest way to guarantee that without a second animation to sync. */
const ease = p => p * p * (3 - 2 * p);          // smoothstep, no overshoot
function frames(depth){
  const out = [];
  for (let i = 0; i <= 60; i++){
    const p = ease(i / 60);
    const s = 1 + (ZOOM - 1) * p * depth;
    out.push({ transform:`translate(0px, ${(DROP * p).toFixed(2)}px) scale(${s.toFixed(4)})` });
  }
  return out;
}

const MODES = {
  /* the real candidate: two composited layers, transform only */
  dolly(back){
    const a = world.animate(frames(1),      { duration:DUR, fill:'forwards', direction:back?'reverse':'normal' });
    const b = room .animate(frames(PARAL),  { duration:DUR, fill:'forwards', direction:back?'reverse':'normal' });
    const c = room .animate(
      [{opacity:1},{opacity:1,offset:.35},{opacity:0}],
      { duration:DUR, fill:'forwards', direction:back?'reverse':'normal' });
    /* The glare lives on the glass, not on the view: once the camera is
       through the opening there is no pane in front of it any more, so it
       has to go with the room rather than ride along over the tank. */
    const d = glass.animate([{opacity:1},{opacity:0,offset:.6},{opacity:0}],
      { duration:DUR, fill:'forwards', direction:back?'reverse':'normal' });
    return Promise.all([a,b,c,d].map(x => x.finished.catch(() => {})));
  },
  /* the cheap fallback: no camera, just a hand-off between two framings */
  cut(back){
    const a = world.animate(
      [{transform:'scale(1)'},{transform:`translate(0px,${DROP}px) scale(${ZOOM})`}],
      { duration:DUR, fill:'forwards', direction:back?'reverse':'normal', easing:'ease-in-out' });
    const b = room.animate([{opacity:1},{opacity:0}],
      { duration:DUR*.45, fill:'forwards', direction:back?'reverse':'normal', easing:'ease-in-out' });
    const c = glass.animate([{opacity:1},{opacity:0}],
      { duration:DUR*.45, fill:'forwards', direction:back?'reverse':'normal', easing:'ease-in-out' });
    return Promise.all([a,b,c].map(x => x.finished.catch(() => {})));
  },
  /* CONTROL — deliberately wrong. Animating box geometry forces layout on
     every single frame, which is what the good modes are being compared to. */
  bad(back){
    return new Promise(res => {
      const t0 = performance.now();
      (function step(){
        const p0 = Math.min(1, (performance.now() - t0) / DUR);
        const p = back ? 1 - p0 : p0;
        const s = 1 + (ZOOM - 1) * ease(p);
        world.style.width  = (1920 * s) + 'px';
        world.style.height = (1080 * s) + 'px';
        world.style.left   = (WIN_CX - WIN_CX * s) + 'px';
        world.style.top    = (WIN_CY - WIN_CY * s + DROP * ease(p)) + 'px';
        room.style.opacity = String(1 - ease(p));
        if (p0 < 1) requestAnimationFrame(step);
        else { ['width','height','left','top'].forEach(k => world.style[k] = ''); res(); }
      })();
    });
  },
};

/* ── the measurement ────────────────────────────────────────────────────
   rAF deltas say how well the MAIN THREAD is keeping time. A composited
   animation can stay smooth even when this number is poor, so a good score
   here is necessary rather than sufficient — which is exactly why the
   'bad' control is run too: it is the floor the others are read against. */
function meter(){
  const gaps = []; let last = performance.now(), on = true;
  (function tick(now){ if(!on) return; gaps.push(now - last); last = now; requestAnimationFrame(tick); })(last);
  return () => {
    on = false;
    const g = gaps.slice(2).sort((a,b) => a - b);
    if (!g.length) return null;
    const at = q => g[Math.min(g.length-1, Math.floor(q * g.length))];
    return { n:g.length, p50:+at(.5).toFixed(1), p95:+at(.95).toFixed(1),
             max:+g[g.length-1].toFixed(1),
             dropped:g.filter(x => x > 32).length,
             fps:+(1000 / (g.reduce((a,b)=>a+b,0) / g.length)).toFixed(1) };
  };
}

async function run(mode, back){
  const stop = meter();
  await MODES[mode](back);
  return stop();
}

/* ── counting the water, which is the whole point of the zoom ─────────
   The tank always performs the REAL equation, whatever was tapped: one
   tick per level so the jump can be counted, landing where it truly
   lands. A wrong answer is then something the learner watches not happen,
   instead of a buzzer.                                                 */
const STEP = { a:-2, op:'+', b:4, get target(){ return this.op==='+' ? this.a+this.b : this.a-this.b } };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function countTo(){
  const dir = STEP.op === '+' ? 1 : -1;
  let lv = STEP.a;
  for (let i = 0; i < STEP.b; i++){ lv += dir; setWater(lv); await wait(320); }
  return lv;
}

let busy = false;
async function answer(v){
  if (busy) return; busy = true;
  document.querySelectorAll('.key').forEach(k => k.disabled = true);
  const inStats  = await run($('#mode').value, false);
  await wait(220);
  const landed   = await countTo();
  await wait(700);
  const outStats = await run($('#mode').value, true);
  setWater(STEP.a);
  document.querySelectorAll('.key').forEach(k => k.disabled = false);
  $('#out').textContent =
    `you said ${v}, the tank landed on ${landed} — ${v===landed?'correct':'not where it stops'}\n` +
    `in : ${fmtStats(inStats)}\nout: ${fmtStats(outStats)}`;
  busy = false;
}
const fmtStats = s => s ? `${s.fps} fps · p50 ${s.p50}ms · p95 ${s.p95}ms · max ${s.max}ms · ${s.dropped} dropped` : '—';

/* four candidates, the same shape of distractor the real game builds */
(() => {
  const t = STEP.target, wrongWay = STEP.op==='+' ? STEP.a-STEP.b : STEP.a+STEP.b;
  [t, STEP.a, wrongWay, STEP.b].forEach(v => {
    const b = document.createElement('button');
    b.className = 'key'; b.textContent = v; b.onclick = () => answer(v);
    $('#pad').appendChild(b);
  });
})();

setWater(STEP.a);
$('#go').onclick = () => answer(STEP.target);

/* the harness drives these directly */
window.__rig = { run, MODES:Object.keys(MODES), DUR,
  reset(){ [world,room,glass].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
           room.style.opacity=''; glass.style.opacity='';
           ['width','height','left','top'].forEach(k=>world.style[k]=''); } };
