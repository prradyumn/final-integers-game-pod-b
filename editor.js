/* ==========================================================================
   SCREEN EDITOR — a build tool, not part of the game.

   Press E (or click the pencil tab) to open it. Pick any object, drag it on
   the stage or type exact numbers, flip it, choose the character's pose, then
   Copy JSON and paste the result into layout.js. Every change is scoped either
   to the screen you are on or to all screens.

   To remove the editor for release: delete this file and its <script> tag in
   index.html, and the EDITOR block at the bottom of style.css. layout.js and
   the game itself do not depend on it — the game reads layout.js on its own.
   ========================================================================== */
(() => {
'use strict';

const OBJECTS = [
  { key:'tank',       sel:'#tank',       label:'Tank — whole group' },
  { key:'pipeIn',     sel:'#pipeIn',     label:'Inlet pipe',        flip:true },
  { key:'pipeOut',    sel:'#pipeOut',    label:'Outlet pipe',       flip:true },
  { key:'valveIn',    sel:'#valveIn',    label:'Inlet valve' },
  { key:'valveOut',   sel:'#valveOut',   label:'Outlet valve' },
  { key:'marker',     sel:'#marker',     label:'Level marker',      flip:true },
  { key:'guddu',      sel:'#guddu',      label:'Character',         flip:true, pose:true },
  { key:'bubble',     sel:'#bubble',     label:'Speech bubble' },
  { key:'bubbleText', sel:'#bubbleText', label:'Bubble text box',   font:true },
  { key:'eqPanel',    sel:'#eqPanel',    label:'Equation panel' },
  { key:'checkBtn',   sel:'#checkBtn',   label:'Check button' },
  { key:'nextBtn',    sel:'#nextBtn',    label:'Continue button' },
  { key:'hintBar',    sel:'#hintBar',    label:'Hint strip' },
  { key:'chapterTag', sel:'#chapterTag', label:'Chapter tag' },
  { key:'river',      sel:'#river',      label:'River effect' },
  { key:'gauge',      sel:'#gauge',      label:'Gauge — ticks & labels', gauge:true }
];
const POSE_LIST = ['(leave to the game)','talk','point','happy','cheer','worried',
                   'surprised','think','idle','neutral'];
const KEY = 'podb.layout.v1';

const $  = s => document.querySelector(s);
const L  = () => window.LAYOUT;
const stage = $('#stage');

let sel = null, scope = 'screen', open = false;

/* ── persistence so a session's work survives a reload ─────────────────── */
function save(){ try { localStorage.setItem(KEY, JSON.stringify(L())); } catch(_){} }
function restore(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const v = JSON.parse(raw);
    window.LAYOUT = { global:v.global||{}, poses:v.poses||{}, screens:v.screens||{} };
  } catch(_){}
}
restore();

/* ── the record we are editing ────────────────────────────────────────── */
const screenId = () => (window.__GAME && window.__GAME.step && window.__GAME.step.id) || '(none)';
function bucket(create){
  if (scope === 'global') return L().global;
  const id = screenId();
  if (!L().screens[id]) { if (!create) return {}; L().screens[id] = {}; }
  return L().screens[id];
}
function entry(key, create){
  const b = bucket(create);
  if (!b[key]) { if (!create) return {}; b[key] = {}; }
  return b[key];
}
/* what is actually in force for this object right now */
function effective(key){
  const id = screenId();
  return Object.assign({}, L().global[key] || {}, (L().screens[id] || {})[key] || {});
}

/* ── UI ───────────────────────────────────────────────────────────────── */
const panel = document.createElement('div');
panel.id = 'edPanel';
panel.innerHTML = `
  <header>
    <b>Screen editor</b>
    <span id="edScreen"></span>
    <button id="edClose" title="Close (E)">✕</button>
  </header>
  <label class="edRow"><span>Object</span>
    <select id="edObj">${OBJECTS.map(o=>`<option value="${o.key}">${o.label}</option>`).join('')}</select>
  </label>
  <div class="edRow edScope">
    <span>Applies to</span>
    <label><input type="radio" name="edScope" value="screen" checked> this screen</label>
    <label><input type="radio" name="edScope" value="global"> all screens</label>
  </div>
  <div class="edGrid">
    <label>X<input type="number" id="edX" step="1"></label>
    <label>Y<input type="number" id="edY" step="1"></label>
    <label>W<input type="number" id="edW" step="1"></label>
    <label>H<input type="number" id="edH" step="1"></label>
  </div>
  <div class="edGrid edExtra">
    <label id="edFontWrap">Font<input type="number" id="edFont" step="1"></label>
    <label id="edTickWrap">Tick x<input type="number" id="edTick" step="1"></label>
    <label id="edLabelWrap">Label x<input type="number" id="edLabel" step="1"></label>
  </div>
  <label class="edRow" id="edFlipWrap"><span>Flip horizontally</span>
    <input type="checkbox" id="edFlip"></label>
  <label class="edRow" id="edPoseWrap"><span>Pose on this screen</span>
    <select id="edPose">${POSE_LIST.map(p=>`<option>${p}</option>`).join('')}</select></label>
  <label class="edRow" id="edPoseFlipWrap"><span>Mirror this pose everywhere</span>
    <input type="checkbox" id="edPoseFlip"></label>
  <p class="edHint">Drag the object on the stage to move it. Arrow keys nudge 1&nbsp;px,
     Shift+arrows 10&nbsp;px.</p>
  <div class="edBtns">
    <button id="edReset">Reset object</button>
    <button id="edResetAll">Reset all</button>
  </div>
  <div class="edBtns">
    <button id="edCopy" class="edPrimary">Copy JSON</button>
    <button id="edDownload">Download layout.js</button>
  </div>
  <textarea id="edJson" spellcheck="false" placeholder="JSON appears here — you can also paste one in and press Apply"></textarea>
  <div class="edBtns"><button id="edApply">Apply pasted JSON</button></div>`;
document.body.appendChild(panel);

const tab = document.createElement('button');
tab.id = 'edTab'; tab.textContent = '✎ edit';
tab.title = 'Screen editor (E)';
document.body.appendChild(tab);

const el = k => document.querySelector((OBJECTS.find(o=>o.key===k)||{}).sel);
const g  = id => document.getElementById(id);

/* ── read the live box of an object, in stage coordinates ─────────────── */
function liveBox(key){
  const e = el(key); if (!e) return null;
  const host = e.offsetParent || stage;
  return { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight,
           inTank: host !== stage && host.id === 'tank' };
}

function syncForm(){
  const o = OBJECTS.find(x=>x.key===sel) || OBJECTS[0];
  g('edScreen').textContent = scope==='global' ? 'all screens' : screenId();
  const live = liveBox(sel) || {x:0,y:0,w:0,h:0};
  const ov = entry(sel, false);
  g('edX').value = Math.round(ov.x ?? live.x);
  g('edY').value = Math.round(ov.y ?? live.y);
  g('edW').value = Math.round(ov.w ?? live.w);
  g('edH').value = Math.round(ov.h ?? live.h);
  g('edFlipWrap').hidden = !o.flip;
  g('edPoseWrap').hidden = !o.pose;
  g('edPoseFlipWrap').hidden = !o.pose;
  g('edFontWrap').hidden = !o.font;
  g('edTickWrap').hidden = !o.gauge;
  g('edLabelWrap').hidden = !o.gauge;
  g('edFlip').checked = !!effective(sel).flip;
  if (o.font){
    const e = el(sel);
    g('edFont').value = ov.font ?? Math.round(parseFloat(getComputedStyle(e).fontSize));
  }
  if (o.gauge){
    const ge = effective(sel);
    g('edTick').value  = ge.tickX  ?? 8;
    g('edLabel').value = ge.labelX ?? 89;
  }
  if (o.pose){
    const cur = (L().screens[screenId()]||{}).guddu || {};
    g('edPose').value = cur.pose || POSE_LIST[0];
    const p = window.__GAME && window.__GAME.__poseNow;
    g('edPoseFlip').checked = !!(L().poses[p] && L().poses[p].flip);
  }
  outline();
  g('edJson').value = toJSON();
}

function outline(){
  document.querySelectorAll('.edSelected').forEach(e=>e.classList.remove('edSelected'));
  const e = el(sel); if (e) e.classList.add('edSelected');
}

/* ── write a change and push it into the page ─────────────────────────── */
function set(prop, val){
  const e = entry(sel, true);
  if (val === null || val === '' || Number.isNaN(val)) delete e[prop];
  else e[prop] = val;
  if (!Object.keys(e).length){ delete bucket(true)[sel]; }
  window.applyLayout && window.applyLayout();
  save(); g('edJson').value = toJSON();
}

function toJSON(){
  const clean = o => { const r={}; for (const k in o) if (Object.keys(o[k]).length) r[k]=o[k]; return r; };
  return JSON.stringify({ global: clean(L().global), poses: clean(L().poses),
                          screens: clean(L().screens) }, null, 2);
}

/* ── wiring ───────────────────────────────────────────────────────────── */
g('edObj').addEventListener('change', e => { sel = e.target.value; syncForm(); });
document.querySelectorAll('input[name=edScope]').forEach(r =>
  r.addEventListener('change', e => { scope = e.target.value; syncForm(); }));
['X','Y','W','H'].forEach(k =>
  g('ed'+k).addEventListener('input', e => set(k.toLowerCase(), parseFloat(e.target.value))));
g('edFont').addEventListener('input', e => set('font', parseFloat(e.target.value)));
g('edTick').addEventListener('input', e => set('tickX', parseFloat(e.target.value)));
g('edLabel').addEventListener('input', e => set('labelX', parseFloat(e.target.value)));
g('edFlip').addEventListener('change', e => set('flip', e.target.checked || null));
g('edPose').addEventListener('change', e => {
  const v = e.target.value === POSE_LIST[0] ? null : e.target.value;
  const b = L().screens[screenId()] || (L().screens[screenId()] = {});
  b.guddu = b.guddu || {};
  if (v) b.guddu.pose = v; else delete b.guddu.pose;
  if (!Object.keys(b.guddu).length) delete b.guddu;
  if (v && window.__GAME) window.__GAME.setPose(v);
  save(); g('edJson').value = toJSON();
});
g('edPoseFlip').addEventListener('change', e => {
  const p = window.__GAME && window.__GAME.__poseNow; if (!p) return;
  L().poses[p] = L().poses[p] || {};
  if (e.target.checked) L().poses[p].flip = true; else delete L().poses[p].flip;
  if (!Object.keys(L().poses[p]).length) delete L().poses[p];
  window.applyLayout && window.applyLayout();
  save(); g('edJson').value = toJSON();
});
g('edReset').addEventListener('click', () => {
  delete bucket(true)[sel]; window.applyLayout && window.applyLayout(); save(); syncForm(); });
g('edResetAll').addEventListener('click', () => {
  if (!confirm('Clear every recorded placement?')) return;
  window.LAYOUT = { global:{}, poses:{}, screens:{} };
  window.applyLayout && window.applyLayout(); save(); syncForm(); });
g('edCopy').addEventListener('click', async () => {
  const t = toJSON();
  try { await navigator.clipboard.writeText(t); g('edCopy').textContent = 'Copied ✓'; }
  catch(_){ g('edJson').select(); document.execCommand('copy'); g('edCopy').textContent = 'Copied ✓'; }
  setTimeout(()=>g('edCopy').textContent='Copy JSON', 1400);
});
g('edDownload').addEventListener('click', () => {
  const body = `/* Recorded with the screen editor — paste-ready. */\nwindow.LAYOUT = ${toJSON()};\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], {type:'text/javascript'}));
  a.download = 'layout.js'; a.click();
});
g('edApply').addEventListener('click', () => {
  try {
    const v = JSON.parse(g('edJson').value.replace(/^\s*window\.LAYOUT\s*=\s*/,'').replace(/;\s*$/,''));
    window.LAYOUT = { global:v.global||{}, poses:v.poses||{}, screens:v.screens||{} };
    window.applyLayout && window.applyLayout(); save(); syncForm();
  } catch(err){ alert('That JSON did not parse:\n' + err.message); }
});
/* the panel sits over the right-hand side of the stage, which is exactly
   where the character and the bubble live — so it can be dragged out of the
   way by its header */
(function panelDrag(){
  const head = panel.querySelector('header');
  let d = null;
  head.style.cursor = 'move';
  head.addEventListener('pointerdown', e => {
    if (e.target.id === 'edClose') return;
    const r = panel.getBoundingClientRect();
    d = { x:e.clientX - r.left, y:e.clientY - r.top };
    head.setPointerCapture(e.pointerId); e.preventDefault();
  });
  head.addEventListener('pointermove', e => {
    if (!d) return;
    panel.style.left = (e.clientX - d.x) + 'px';
    panel.style.top  = (e.clientY - d.y) + 'px';
    panel.style.right = 'auto';
  });
  const stop = e => { if (d){ d = null; try{ head.releasePointerCapture(e.pointerId); }catch(_){} } };
  head.addEventListener('pointerup', stop);
  head.addEventListener('pointercancel', stop);
})();

g('edClose').addEventListener('click', () => toggle(false));
tab.addEventListener('click', () => toggle());

/* ── drag on the stage ────────────────────────────────────────────────── */
let drag = null;
stage.addEventListener('pointerdown', e => {
  if (!open) return;
  const e0 = el(sel); if (!e0) return;
  const r = e0.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
  const s = stage.getBoundingClientRect().width / 1920;
  const live = liveBox(sel);
  const ov = entry(sel,false);
  drag = { sx:e.clientX, sy:e.clientY, s,
           ox: ov.x ?? live.x, oy: ov.y ?? live.y };
  e.preventDefault(); e.stopPropagation();
}, true);
window.addEventListener('pointermove', e => {
  if (!drag) return;
  set('x', Math.round(drag.ox + (e.clientX - drag.sx)/drag.s));
  set('y', Math.round(drag.oy + (e.clientY - drag.sy)/drag.s));
  g('edX').value = entry(sel,false).x; g('edY').value = entry(sel,false).y;
});
window.addEventListener('pointerup', () => { if (drag){ drag=null; syncForm(); } });

window.addEventListener('keydown', e => {
  if (e.key === 'e' || e.key === 'E'){
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    toggle(); return;
  }
  if (!open || !sel) return;
  if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const step = e.shiftKey ? 10 : 1;
  const live = liveBox(sel), ov = entry(sel,false);
  const map = { ArrowLeft:['x',-step], ArrowRight:['x',step], ArrowUp:['y',-step], ArrowDown:['y',step] };
  const m = map[e.key]; if (!m) return;
  const base = (m[0]==='x' ? (ov.x ?? live.x) : (ov.y ?? live.y));
  set(m[0], Math.round(base + m[1]));
  g('edX').value = entry(sel,false).x ?? live.x;
  g('edY').value = entry(sel,false).y ?? live.y;
  e.preventDefault();
});

function toggle(force){
  open = force === undefined ? !open : force;
  panel.classList.toggle('open', open);
  document.body.classList.toggle('editing', open);
  if (open){ sel = sel || OBJECTS[0].key; g('edObj').value = sel; syncForm(); }
  else document.querySelectorAll('.edSelected').forEach(e=>e.classList.remove('edSelected'));
}

/* keep the readout honest as the game moves between screens */
setInterval(() => { if (open) { g('edScreen').textContent =
  scope==='global' ? 'all screens' : screenId(); } }, 400);

})();
