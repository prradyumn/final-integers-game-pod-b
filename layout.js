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
    /* The tank is on his left, so every pose has to read leftward. These four
       were drawn facing the other way — he was talking, thinking, waiting and
       worrying at the empty half of the screen. Mirrored, he does all four at
       the water.

       `talk` is the one that matters most: it is the narration pose on every
       ungifted "move" screen, nine of them, so it is on screen for most of
       the game. It was recorded in the editor as a flip on l1-find0, which is
       where it was spotted; it belongs here instead, because the fault is in
       the pose and not in that screen. Note that a screen-level flip XORs
       with a pose-level one, so leaving it on l1-find0 would also have
       cancelled the `idle` mirror on that one screen.

       `surprised` and `cheer` were turned away too. `surprised` is the pose
       on a third wrong answer, one beat before `think`, which is where it
       shows. point / neutral / happy already face the tank and are the only
       three left alone. */
    talk:      { flip: true },
    think:     { flip: true },
    idle:      { flip: true },
    worried:   { flip: true },
    surprised: { flip: true },
    cheer:     { flip: true }
  },

  screens: {
    /* e.g.  'l1-find0': { guddu: { pose:'point' } },  */
  }
};
