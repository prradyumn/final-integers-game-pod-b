/* ==========================================================================
   Integers — The Village Water Tank · Pod B
   LAYOUT OVERRIDES

   This file is the placement record. It starts empty: with nothing in it the
   game uses the positions baked into style.css, which are transcribed from the
   Figma frame. Anything recorded here wins over those.

   You do not have to write this by hand. Open the game, press E for the screen
   editor, move things until they look right, then press "Copy JSON" and paste
   the result over the object below (or send it to me and I will).

     global   placements that apply on every screen
     poses    per-pose tweaks for the character — { flip: true } mirrors one
     screens  overrides for one screen only, keyed by the screen id shown in
              the editor (l1-find0, l2-3, g-5 …). A screen entry beats global.

   Every box is in stage coordinates: the stage is 1920 × 1080 and scales as a
   whole, so these numbers never change with window size.

   Example:
     global:  { guddu: { x:1550, y:266, w:450, h:675 } }
     poses:   { idle: { flip:true } }
     screens: { 'l2-3': { guddu: { pose:'point', flip:false } } }
   ========================================================================== */

window.LAYOUT = {

  global: {
    /* e.g.  guddu: { x:1550, y:266, w:450, h:675 },  */
  },

  poses: {
    /* e.g.  think: { flip:true },  */
  },

  screens: {
    /* e.g.  'l1-find0': { guddu: { pose:'point' } },  */
  }
};
