/* ==========================================================================
   STORY  <->  GAME  bridge

   Everything here is additive. app.js, story.js, studio.js and styles.css's
   original rules are untouched: this file only reads the storybook through the
   `window.__book` api app.js already published, and through the state app.js
   already writes onto the HUD. Nothing in the game is touched either - it runs
   in its own document.

   WHY AN IFRAME, and not one merged document:

     * game/game.js pins the window to 0,0 on every scroll event and again on a
       500ms interval. That is correct for a fixed 1920x1080 stage and it would
       make this page, which the reader scrolls, impossible to move at all.
     * Both documents define #stage, #gate and #hud.

   One frame each keeps the scroll lock where it belongs and the ids apart, so
   neither project had to be rewritten to accommodate the other.
   ========================================================================== */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const wrap    = $('#gameWrap');
  const mount   = $('#gameMount');
  const handoff = $('#handoff');
  const hud     = $('#hud');
  const vo    = $('#vo');
  const music = $('#music');
  const rain  = $('#rain');

  /* The game belongs before the last two scenes: the reader has just said
     "now I understand positive and negative numbers" (scene 10) and has not
     yet been told what to do with them (scenes 11 and 12). Indices are
     0-based, so scene 11 is index 10. */
  const GAME_BEFORE_INDEX = 10;

  let played = false;        // the story only ever offers the game once
  let open = false;
  let scrollY = 0;
  let returnTo = null;
  let frame = null;

  /* ─────────────────────── audio format ────────────────────────────────
     Every line exists as both .ogg (Opus, roughly 40% of the size) and .mp3.
     app.js sets `vo.src` from STORY[i].audio, so the choice is made here by
     rewriting those paths once, before anything is spoken - Safari cannot play
     Opus in an Ogg container and keeps the mp3. The two <audio> beds in
     index.html do the same thing with <source> elements. */
  (() => {
    let ogg = false;
    try { ogg = !!new Audio().canPlayType('audio/ogg; codecs="opus"'); } catch(_){}
    if (!ogg) return;
    /* story.js declares `const STORY` at the top level of a classic script,
       which creates a LEXICAL global binding - it is reachable by name but it
       is not a property of window, so `window.STORY` is undefined here. */
    let list = null;
    try { list = (typeof STORY !== 'undefined') ? STORY : null; } catch(_){}
    if (!Array.isArray(list)) return;
    list.forEach(s => {
      if (s && typeof s.audio === 'string') s.audio = s.audio.replace(/\.mp3$/, '.ogg');
    });
  })();

  const book    = () => window.__book || null;
  const started = () => hud.classList.contains('is-on');
  const muted   = () => hud.classList.contains('is-muted');

  /* ─────────────────────────────── audio ───────────────────────────────
     The story's three elements are paused outright while the game is up, and
     the game is told to silence itself the instant its frame goes away, so
     nothing can be heard from a panel that is not on screen.               */
  function hushStory(){
    [vo, music, rain].forEach(a => { try { a.pause(); } catch(_){} });
  }
  function resumeStory(){
    if (!started() || muted()) return;
    [music, rain].forEach(a => { a.play().catch(() => {}); });
  }

  /* ──────────────────────────── the overlay ──────────────────────────── */
  function openGame(back){
    if (open) return;
    open = true;
    returnTo = back;

    const b = book();
    if (b && b.freeze) b.freeze();     // stops Auto and pauses the voiceover
    hushStory();

    /* hold the page exactly where it is; the story is scroll-driven, so
       letting it move behind the game would change the scene underneath */
    scrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('game-open');

    handoff.classList.remove('is-on');
    handoff.setAttribute('aria-hidden', 'true');

    /* built fresh each time, so the game always starts clean */
    frame = document.createElement('iframe');
    frame.title = 'The Village Water Tank game';
    frame.allow = 'autoplay';
    frame.src = 'game/index.html';
    frame.addEventListener('load', () => wrap.classList.add('is-ready'));
    mount.appendChild(frame);

    wrap.classList.add('is-on');
    wrap.setAttribute('aria-hidden', 'false');
    hud.classList.remove('is-on');
  }

  function closeGame(){
    if (!open) return;
    open = false;
    played = true;

    /* silence it, then destroy it - a hidden iframe keeps playing otherwise */
    try { frame.contentWindow.postMessage({ source:'integers-host', type:'silence' }, '*'); } catch(_){}
    mount.textContent = '';
    frame = null;
    wrap.classList.remove('is-on', 'is-ready');
    wrap.setAttribute('aria-hidden', 'true');

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.classList.remove('game-open');

    if (started()) hud.classList.add('is-on');

    const b = book();
    if (b && typeof returnTo === 'number' && b.gotoScene) b.gotoScene(returnTo);
    else window.scrollTo(0, scrollY);
    resumeStory();
  }

  /* ─────────────────────── where the story hands over ─────────────────── */
  function offerGame(){
    if (played || open) return;
    played = true;                       // offered once, however they answer
    const b = book();
    if (b && b.freeze) b.freeze();
    hushStory();
    scrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    handoff.classList.add('is-on');
    handoff.setAttribute('aria-hidden', 'false');
  }

  function dismissHandoff(){
    handoff.classList.remove('is-on');
    handoff.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    resumeStory();
  }

  window.addEventListener('scroll', () => {
    if (open || played || !started()) return;
    const b = book();
    if (b && b.scene() >= GAME_BEFORE_INDEX) offerGame();
  }, { passive: true });

  $('#handoffGo').addEventListener('click', () => {
    dismissHandoff();
    openGame(GAME_BEFORE_INDEX);
  });
  $('#handoffSkip').addEventListener('click', dismissHandoff);

  /* the button in the HUD: straight into the game from anywhere, and back to
     wherever the reader was when they left */
  $('#gameBtn').addEventListener('click', () => {
    const b = book();
    openGame(b ? b.scene() : 0);
  });

  /* ───────────────────── what the game tells us back ─────────────────── */
  window.addEventListener('message', e => {
    const d = e && e.data;
    if (!d || d.source !== 'integers-game') return;
    if (d.type === 'exit') closeGame();
  });

  /* Esc leaves the game, the same as the button on its last screen */
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && open) closeGame();
  });

  /* ───────────────────────────── zoom lock ─────────────────────────────
     The story is SCROLLED, so this may only take out the gestures that zoom -
     pinch, ctrl+wheel, ctrl +/-/0 and double-tap - and must leave ordinary
     wheel and single-finger drag alone. (The game locks scrolling outright,
     but it does that inside its own frame where scrolling is not wanted.) */
  const swallow = e => { e.preventDefault(); e.stopPropagation(); };
  window.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) swallow(e); }, { passive:false });
  ['gesturestart','gesturechange','gestureend'].forEach(t =>
    window.addEventListener(t, swallow, { passive:false }));
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && ['+','-','=','0','_'].includes(e.key)) swallow(e);
  }, { passive:false });
  window.addEventListener('touchmove', e => { if (e.touches.length > 1) swallow(e); }, { passive:false });
  let lastTap = 0;
  window.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 320) swallow(e);         // double-tap zoom
    lastTap = now;
  }, { passive:false });

  /* ────────────────── keep the sound inside this tab ──────────────────
     app.js stops drawing when the tab is hidden but leaves the audio running.
     The game already handles its own; this covers the story's three elements
     and the case of leaving the page altogether. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hushStory();
    else if (!open) resumeStory();
  });
  ['pagehide','beforeunload'].forEach(t =>
    window.addEventListener(t, () => {
      hushStory();
      try { if (frame) frame.contentWindow.postMessage({ source:'integers-host', type:'silence' }, '*'); } catch(_){}
    }));
})();
