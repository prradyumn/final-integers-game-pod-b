/* ══════════════════════════════════════════════════════════════════════
   CONTROL ROOM — press P.

   A parallel skin over the very same game. Guddu is inside the waterworks;
   the tank is out through the window. The learner no longer drags the
   water — they PREDICT where it will stop, dial that number in at the
   desk, and the camera pulls back and flies out to watch the tank do the
   arithmetic.

   WHY IT EXISTS: on an equation screen the old flow graded the tile and
   ignored the tank, so a learner could park the water on the wrong level,
   tap the right number and be told they were right. Two inputs that can
   disagree is the whole bug. Here there is ONE claim — the number on the
   dial — so there is nothing left to disagree with.

   THREE CAMERA STATIONS
     DESK  close on the keypad, where the answer is dialled in
     ROOM  the resting wide shot
     TANK  through the window, at 1:1 — which is to say, the real game

   The shot runs DESK -> ROOM -> TANK and back. Both planes are driven from
   one pose function, and the world is PINNED inside the opening for the
   desk leg: the view is composed with whatever the room is doing, so it
   can never slide out of its own hole.

   WHAT IT CHANGES IN THE GAME: no logic. The only edit to game.js is three
   more lines in the block of test hooks it already publishes on `window`,
   because its objects live inside a closure. The flow is frozen with
   `Game.setHold()` — the call the screen editor uses — and the water and
   marker are moved with `Game.slideTo()`, the very call a drag makes.
   Leaving puts every element back and hands the tank over at the level the
   game still believes in.
   ══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ── geometry ───────────────────────────────────────────────────────
     The window opening, measured off the painted room by keying it, in
     stage pixels. Repaint the art and these four numbers are the only
     thing that has to follow. */
  const WIN = { x:321.0, y:215.2, w:804.1, h:436.5 };
  const CX = WIN.x + WIN.w / 2, CY = WIN.y + WIN.h / 2;

  /* COVER, not contain. Fitting the whole scene inside the opening left a
     band of empty sky down one side and the view read as a picture pasted
     behind the glass. Covering costs 38px of 1080 — less than the tank's
     own margin — and fills the window to its edges. */
  const REST = Math.max(WIN.w / 1920, WIN.h / 1080);
  /* where the scene sits when it is painted into the opening */
  const BX = CX - REST * 960, BY = CY - REST * 540;

  /* the keypad housing, on the clear middle of the desk */
  const PAD = { x:380, y:702, w:360, h:306 };
  const PADC = { x: PAD.x + PAD.w/2, y: PAD.y + PAD.h/2 };
  const DESK_K = 2.4;                        // how close the desk shot gets
  const ROOMOUT = (1 / REST) * 1.7;          // the room is nearer, so it opens faster

  /* Unhurried on purpose. These are establishing shots, not transitions:
     the pull-back has to give the learner time to realise where they are
     going, and the push through the window is the moment the prediction is
     about to be tested, which is worth letting land. */
  const T_DESK = 1250, T_TANK = 1850;
  /* Motion is eased by the compositor across the whole leg rather than baked
     into the samples: every value below is linear in p, so one timing
     function on the animation is exactly equivalent and far smoother than
     pre-easing 48 discrete steps. */
  const E_DESK = 'cubic-bezier(.42,.02,.18,1)';   // eases off, travels, settles long
  const E_TANK = 'cubic-bezier(.48,.03,.16,1)';   // leans in slowly, arrives soft

  const $ = s => document.querySelector(s);
  const stage = $('#stage');
  const WORLD = ['#bg','#river','#weather','#tank','#flowOut'];

  let on = false, built = false, busy = false;
  let tries = 0, solved = 0, levelAtEnter = 0;
  let sign = 1, entry = null;
  let cam, sky, room, wall, glass, ui, q, feed, pad, read, grid, badge;
  let homes = [];
  let heldBefore = false;

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
  const fmt  = n => (n < 0 ? '−' + Math.abs(n) : String(n));

  /* ── the camera ───────────────────────────────────────────────────────
     One pose function for both legs. `roomT` is what the near plane does;
     the world is that SAME transform composed with the painting that fills
     the opening, which is what keeps the view locked inside the hole while
     the camera moves about the room. Only the last leg breaks the pinning,
     because that is the one that goes through the glass. */
  function pose(leg, p){
    if (leg === 'desk'){
      const k  = 1 + (DESK_K - 1) * p;
      /* Keep the camera inside the painted room. Centring straight on the
         dial at this zoom put the bottom of the shot past the bottom of the
         artwork, and the empty stage showed through as a band of sky. */
      const hw = 960 / k, hh = 540 / k;
      const cx = clamp(960 + (PADC.x - 960) * p, hw, 1920 - hw);
      const cy = clamp(540 + (PADC.y - 540) * p, hh, 1080 - hh);
      const tx = 960 - k * cx, ty = 540 - k * cy;
      return {
        room:  `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k.toFixed(4)})`,
        world: `translate(${(k*BX+tx).toFixed(2)}px, ${(k*BY+ty).toFixed(2)}px) `
             + `scale(${(k*REST).toFixed(4)})`,
        roomOp: 1, glassOp: .5, skyOp: 0,
      };
    }
    /* through the glass: the view grows to 1:1 — at the end of this leg the
       screen is not an approximation of the game, it IS the game — while
       the room sweeps past the camera and goes */
    const s = REST + (1 - REST) * p, k = 1 + (ROOMOUT - 1) * p, u = 1 - p;
    return {
      room:  `translate(${(CX*(1-k)).toFixed(2)}px, ${(CY*(1-k)).toFixed(2)}px) scale(${k.toFixed(4)})`,
      world: `translate(${(BX*u).toFixed(2)}px, ${(BY*u).toFixed(2)}px) scale(${s.toFixed(4)})`,
      roomOp: p < .35 ? 1 : Math.max(0, 1 - (p - .35) / .65),
      glassOp: Math.max(0, 1 - p / .6) * .5,
      /* the sky backing only matters while the view is in flight and does
         not yet cover the screen; inside the room it must never show */
      skyOp: p,
    };
  }
  function park(leg, p){
    const f = pose(leg, p);
    room.style.transform = f.room;  cam.style.transform = f.world;
    room.style.opacity = String(f.roomOp);
    glass.style.opacity = String(f.glassOp);
    sky.style.opacity = String(f.skyOp);
  }
  /* Sampled keyframes, because the zoom and the pan have to stay locked to
     each other the whole way and sampling is the cheapest way to promise it.
     Sampled LINEARLY - the easing is the animation's own timing function. */
  function frames(leg, back){
    const out = [];
    for (let i = 0; i <= 48; i++){
      const p = back ? 1 - i / 48 : i / 48;
      out.push(pose(leg, p));
    }
    return out;
  }
  function move(leg, back){
    const f = frames(leg, back);
    const opt = { duration: leg === 'desk' ? T_DESK : T_TANK, fill:'forwards',
                  easing: leg === 'desk' ? E_DESK : E_TANK };
    const a = cam  .animate(f.map(x => ({ transform:x.world })), opt);
    const b = room .animate(f.map(x => ({ transform:x.room, opacity:String(x.roomOp) })), opt);
    const c = glass.animate(f.map(x => ({ opacity:String(x.glassOp) })), opt);
    const d = sky  .animate(f.map(x => ({ opacity:String(x.skyOp) })), opt);
    return Promise.all([a,b,c,d].map(x => x.finished.catch(() => {})))
      .then(() => park(leg, back ? 0 : 1));
  }

  /* ── the keypad ─────────────────────────────────────
     A phone dialer on the desk: 1-6 with the sign and zero across the
     bottom, which covers every level the gauge has. The sign is a mode, not
     an answer - it can be changed freely and costs nothing - and pressing a
     DIGIT is what commits, so there is still exactly one act that means
     "this is my answer" and no confirm button standing between the learner
     and it. That is the same rule the main game follows with its tiles. */
  function step(){ const g = G(); return (g && g.step) || null; }
  const G  = () => window.__GAME;
  const W  = () => window.__WATER;
  const AU = () => window.__AUDIO;
  const OPTS = () => window.__ANSWER_OPTIONS;

  /* A typed answer loses nothing diagnostically. These are the same three
     mistakes the main game builds its distractors from, so a number dialled
     in can still be recognised as a particular misunderstanding rather than
     just "wrong". */
  function diagnose(s, given){
    if (!s || !s.equation) return '';
    const { a, op, b } = s.equation;
    if (given === a) return 'That is where the water started \u2014 it still has to move.';
    if (given === (op === '+' ? a - b : a + b))
      return op === '+' ? 'A plus sends it UP the tank, not down.'
                        : 'A minus sends it DOWN the tank, not up.';
    if (given === (op === '+' ? b : -b))
      return 'That is the size of the jump, not the level it lands on.';
    if (given === Math.abs(a) + (op === '+' ? b : -b))
      return `Careful \u2014 it starts at ${fmt(a)}, below zero, not above it.`;
    return '';
  }

  /* The keypad is a dialer, not a set of choices: nine keys, 1-6 with the
     sign and zero along the bottom, and the learner composes the number
     themselves. That is recall rather than recognition - a far stronger ask
     than picking one of four - and it costs nothing diagnostically, because
     a typed answer can still be compared against the same misconceptions
     answerOptions() builds its distractors from. */
  const KEYS = ['1','2','3','4','5','6','\u2212','0','+'];

  function buildPad(){
    grid.textContent = '';
    KEYS.forEach(k => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'crKey' + (k === '+' || k === '\u2212' ? ' sign' : '');
      b.textContent = k; b.dataset.k = k;
      b.addEventListener('click', () => tap(k, b));
      grid.appendChild(b);
    });
    sign = 1; entry = null;
    paint();
  }

  /* sign first if you want one, then a digit finishes the number. Every
     level on the gauge is a single digit, so the digit IS the commitment
     and there is no second button between the learner and their answer. */
  function paint(){
    read.textContent = (entry === null)
      ? (sign < 0 ? '\u2212' : '+')
      : fmt(sign < 0 ? -entry : entry);
    read.classList.toggle('empty', entry === null);
    [...grid.children].forEach(b => {
      const k = b.dataset.k;
      b.classList.toggle('on', (k === '+' && sign > 0) || (k === '\u2212' && sign < 0));
    });
  }

  async function tap(k, btn){
    if (busy) return;
    try { AU().blip('tick'); } catch(_){}
    if (k === '+' || k === '\u2212'){ sign = (k === '+') ? 1 : -1; paint(); return; }
    busy = true;
    entry = Number(k);
    paint();
    btn.classList.add('hit');
    setTimeout(() => btn.classList.remove('hit'), 220);
    const v = (entry === 0) ? 0 : sign * entry;
    [...grid.children].forEach(b => b.disabled = true);
    read.classList.add('sent');
    await wait(420);
    await commit(v);
    read.classList.remove('sent');
    [...grid.children].forEach(b => b.disabled = false);
    busy = false;
  }

  /* ── the shot, and the verdict ────────────────────────────────────── */
  async function commit(v){
    feed.className = ''; feed.textContent = '';
    tries++;
    await move('desk', true);                 // pull back off the desk
    await wait(260);                          // a beat in the wide shot
    await move('tank', false);                // and out through the window
    await wait(220);

    const landed = await runWater();
    const right  = (v === landed);
    const marker = $('#marker'), guddu = $('#guddu');
    try { AU().play(right ? 'correct' : 'wrong'); } catch(_){}
    if (guddu){ guddu.classList.remove('crYes','crNo'); void guddu.offsetWidth;
                guddu.classList.add(right ? 'crYes' : 'crNo'); }
    if (right && marker) marker.classList.add('crRight');

    say(right, v, landed);
    await wait(right ? 1500 : 1900);
    await wait(200);
    await move('tank', true);                 // back inside
    if (marker) marker.classList.remove('crRight');


    if (right){
      solved++;
      await wait(450);
      advance();
    } else {
      /* nothing to retire: on a nine-key pad every number is still reachable
         and striking one out would quietly narrow the question. The camera
         simply goes back down to the desk for another go. */
      entry = null; paint();
      await wait(260);
      await move('desk', false);
    }
  }

  /* The tank always performs the REAL equation, whatever was dialled in.
     Sending the water to their number would show a lie and then correct it;
     this way a wrong answer is something the learner watches NOT happen. */
  async function runWater(){
    const s = step(), g = G(), water = W();
    let lv = (s.equation ? s.equation.a : (typeof s.start === 'number' ? s.start : g.level));
    /* Game.slideTo is what a drag calls: marker, water and step sound as one.
       Driving the water alone left the marker behind — and the marker is the
       thing the level is read off. It is guarded by `interactive`, so that is
       lifted for the length of the count only. */
    const was = g.interactive;
    g.interactive = true;
    g.level = lv; water.set(lv, 0);
    try { g.slideTo(lv + 1); g.slideTo(lv); } catch(_){}
    await wait(300);
    const end = s.target, dir = end > lv ? 1 : -1;
    while (lv !== end){
      lv += dir;
      try { g.slideTo(lv); } catch(_){ water.set(lv, 300); }
      await wait(380);
    }
    g.interactive = was;
    return lv;
  }

  /* A wrong answer is not a buzzer: the tank has just been watched not
     stopping where it was said it would, and the line names that. The
     game's own three tiers of hint supply the words. */
  function say(right, given, landed){
    const s = step();
    if (right){
      feed.textContent = `Yes — the water stopped at ${fmt(landed)}.`;
      feed.className = 'on yes'; return;
    }
    let line = `You dialled ${fmt(given)}, but the water stopped at ${fmt(landed)}.`;
    const why = diagnose(s, given);
    if (why) line += ' ' + why;
    else {
      const tier = s && s.wrong && s.wrong[Math.min(tries, 3) - 1];
      if (tier && tier.vo) line += ' ' + tier.vo;
    }
    feed.textContent = line; feed.className = 'on no';
  }

  /* ── the running order ────────────────────────────────────────────────
     The flow controller is held the whole time the room is up, so the room
     drives itself: the next screen that actually asks something. */
  const answerable = i => {
    const st = FLOW[i];
    return !!(st && typeof st.target === 'number' && !st.intro);
  };
  function advance(){
    const g = G();
    let i = g.i + 1;
    while (i < FLOW.length && !answerable(i)) i++;
    if (i >= FLOW.length){ finish(); return; }
    g.goTo(i);
    setTimeout(() => { tries = 0; feed.className = ''; ask(); }, 900);
  }
  function finish(){
    grid.textContent = ''; read.textContent = ''; pad.classList.add('done');
    q.textContent = 'All done';
    feed.textContent = `${solved} screen${solved === 1 ? '' : 's'} answered from the control room.`;
    feed.className = 'on yes';
  }

  /* pose the question in the wide shot, then go down to the desk to answer */
  async function ask(){
    const s = step(); if (!s) return;
    if (s.equation){
      const { a, op, b } = s.equation;
      q.textContent = `${fmt(a)} ${op === '+' ? '+' : '−'} ${b} = ?`;
    } else {
      q.textContent = `Take the water to ${fmt(s.target)}`;
    }
    buildPad();
    park('desk', 0);
    await wait(1100);                         // read the question in the wide shot
    if (on) await move('desk', false);
  }

  /* ── build, enter, leave ──────────────────────────────────────────── */
  function build(){
    if (built) return; built = true;
    const mk = (id, cls) => { const e = document.createElement('div'); e.id = id;
                              if (cls) e.className = cls; return e; };
    cam = mk('crCam'); sky = mk('crSky'); room = mk('crRoom');
    wall = mk('crWall'); glass = mk('crGlass'); ui = mk('crUi');
    q = mk('crQ'); feed = mk('crFeed'); badge = mk('crBadge');
    pad = mk('crPad'); read = mk('crRead'); grid = mk('crGrid');
    badge.textContent = 'CONTROL ROOM  ·  P to leave';
    pad.style.left = PAD.x + 'px';  pad.style.top = PAD.y + 'px';
    pad.style.width = PAD.w + 'px'; pad.style.height = PAD.h + 'px';
    pad.append(read, grid);
    ui.append(feed, q, pad);
    room.append(glass, wall, ui);
  }

  function enter(){
    build();
    /* Move the outdoor half of the scene under the camera. Moving nodes keeps
       their identity, so every reference game.js holds still points at the
       same element and nothing it does needs to know. */
    homes = WORLD.map(sel => {
      const el = $(sel); if (!el) return null;
      const rec = { el, parent: el.parentNode, next: el.nextSibling };
      cam.appendChild(el); return rec;
    }).filter(Boolean);
    stage.insertBefore(cam, stage.firstChild);
    stage.insertBefore(sky, cam);
    stage.append(room, badge);
    /* Guddu and his speech stand IN the room, so they ride its plane and
       sweep past the camera with it instead of hanging over the tank */
    ['#guddu','#bubble'].forEach(sel => {
      const el = $(sel); if (!el) return;
      homes.push({ el, parent: el.parentNode, next: el.nextSibling });
      room.insertBefore(el, ui);
    });
    document.body.classList.add('cr');

    const g = G();
    heldBefore = g.hold; levelAtEnter = g.level;
    tries = 0; solved = 0;
    g.setHold(true);

    park('desk', 0);
    if (!answerable(g.i)){
      let i = 0; while (i < FLOW.length && !answerable(i)) i++;
      if (i < FLOW.length) g.goTo(i);
    }
    on = true;
    setTimeout(ask, 80);
  }

  function leave(){
    [cam, room, glass].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    room.style.transform = room.style.opacity = glass.style.opacity = '';
    cam.style.transform = '';
    /* Put every node back. In REVERSE, because each is restored in front of
       the sibling that used to follow it, and that sibling has to be in the
       tree first — forwards, Guddu would be inserted before a #bubble still
       sitting inside the room. */
    homes.slice().reverse().forEach(({ el, parent, next }) => {
      try { parent.insertBefore(el, next && next.parentNode === parent ? next : null); }
      catch(_){ parent.appendChild(el); }
    });
    homes = [];
    [cam, sky, room, badge].forEach(el => el.remove());
    document.body.classList.remove('cr');

    /* the room moved the marker, so put it back on the level the game was
       showing before P was pressed */
    try {
      const g = G(), was = g.interactive;
      g.interactive = true; g.slideTo(levelAtEnter); g.interactive = was;
      g.level = levelAtEnter; W().set(levelAtEnter, 0);
    } catch(_){}
    if (!heldBefore) G().setHold(false);
    on = false; busy = false;
  }

  addEventListener('keydown', e => {
    if (e.key !== 'p' && e.key !== 'P') return;
    const t = e.target;
    if (t && typeof t.matches === 'function' && t.matches('input,textarea,select')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (busy) return;
    e.preventDefault();
    on ? leave() : enter();
  });

  window.__cr = { enter, leave, ask, park, move, tap, advance,
                  get on(){ return on; }, get solved(){ return solved; },
                  WIN, REST, PAD, DESK_K, get entry(){ return entry; },
                  get sign(){ return sign; } };
})();
