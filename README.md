# Integers — The Village Water Tank  ·  Pod B

Open **index.html** in Chrome (double-click it). Nothing to install, no server needed.

## What it is
The full 22-screen flow from *Integers - Game V2-3.csv*, built on the Figma
frame **Integers › page Final › Slide 16:9** (`node 94:1405`).

| Chapter | Screens | What the learner does |
| --- | --- | --- |
| The Village Tank | 8 | Find 0, then move the water: 0→+2, +2→+5, +5→+2, +2→−2 |
| Calculate The Level | 7 | Same tank plus a live number sentence — five addition problems |
| Water Used Up | 7 | Five subtraction problems, then a finish screen |

Every screen carries its VO line, the correct-answer line, three escalating
wrong-answer hints with their animations, and an inactivity prompt — exactly as
written in the CSV.

## Layout
Positions are transcribed 1:1 from the Figma frame (1920×1080 stage, uniformly
scaled to the window — the artwork never reflows):

```
tank art      199,10   723×1084      inlet pipe   110,-163 352×264
ticks         x360, +5 at y183,      outlet pipe  737,824  224×168
              72.7 apart, 65 long    marker       x318, on the current tick
labels        x441, 52×55            bubble       1222,101 585×258
equation      884,443 755×200        check        1136,667 260×109
term boxes    x935 / x1188 / x1431, y465 160×156
```

The **empty** tank art is used, refitted so its glass interior lands exactly
where the filled tank's interior sits in the design (351.6..765.9 × 122.9..953.5).

## Interaction — it's a slider, not a tap game
The only thing you touch is the **red gauge marker**. You grab it and drag it up
or down the scale; the ticks themselves are not clickable. The marker snaps tick
to tick as you pass each one, so the water still moves **one level at a time**
with a click and a slosh per level — you physically drag through every step.
↑/↓ on the keyboard do the same thing, one level per press.

Screen 1 ("find 0") is the one place the marker moves on its own: the water sits
at 0 and the marker is parked at +5, so there is something to drag.

### The number sentence
Two behaviours, on purpose:

* **Guided screens** (`0 + (+3)`, `0 − (+3)`) count the second term up as you
  drag — `0 + (+1)`, `0 + (+2)`, `0 + (+3)` — which is the teaching device the
  flow sheet asks for.
* **Every other equation screen** shows the whole sentence from the start —
  `(−2) + (+4) = ?` — because the learner is meant to *read* it and work out the
  answer. The `?` box previews whatever level you are currently on, so you can
  see your proposed answer before you commit.

Guddu also reads the sentence aloud on those screens, and the strip at the
bottom spells it out, so nobody is stranded by a terse VO line.
Press **Check** to submit.

Get it wrong and you get hint tier 1, then 2, then 3. On the fourth attempt
Guddu walks the answer through on the gauge, resets, and lets you try again.

## Character and bubble
One character, as in the Figma frame: the high-resolution still
`character-boy.png` at the frame's rect (1563,328 424×637, "fit"). No sprite
sheets and no frame animation — while a line plays he just breathes, via a
single CSS transform.

The speech bubble is the Figma artwork placed in the Figma rect
(1222,101 585×258) as a centred cover fill, which is exactly how the frame fills
it — so the bubble and its tail keep their drawn proportions. Nothing is sliced
or stretched. The text sits in the frame's own text box (1289,142 450×132).

Pari has no artwork in the final frame, so her two CSV lines (the screen-1
inactivity prompt and "now it's your turn") are spoken by Guddu Bhaiya.

**Which way he faces.** The tank is on his left, so every pose has to read
leftward. Six were drawn facing the other way — `talk`, `think`, `idle`,
`worried`, `surprised`, `cheer` — and are mirrored in `layout.js` under
`poses`, which is what that record is for. `point`, `neutral` and `happy`
already face the tank.

`talk` is the one that mattered most: it is the narration pose on every
unguided "move" screen, nine of them, so it is on screen for most of the game.

A screen-scoped flip **XORs** with a pose-scoped one, so recording `guddu:
{flip:true}` on a screen mirrors the poses that are not in `poses` and
*un*-mirrors the ones that are. Facing is a property of the pose, so it belongs
in `poses` every time.

## Water, inlet and outlet
All SVG, no sprites.

* **Surface** — two overlapping sine waves, an elliptical surface ring, rising
  bubbles. The slosh amplitude decays as the water settles.
* **Three-phase pour.** Two or three drips lead the column in, a tapered column
  with a moving highlight streak runs while the water moves, then it breaks up
  and one last drop falls. Both directions.
* **Flow strength tracks the drag.** One level is a spurt; four levels in one
  gesture thickens and sustains the column. The loop volume follows it too.
* **Impact.** The stream pushes a dimple into the surface, lays down an
  aeration patch, and sends rings travelling out to the glass walls.
* **The outflow goes somewhere.** It leaves the elbow, arcs out past the tank
  and lands in the river, throwing splash droplets and spreading ripple rings.
* **Tick-crossing flash.** Every time the surface passes a tick a quick
  horizontal ripple flashes at that tick — the counting is visible in the water,
  not only on the marker.
* **Valve wheels** on both pipes spin while water runs, and the pipe itself
  lights up. Cyan dashes travel inside the pipe body so the direction is
  readable at a glance. During hints the pipe that matters pulses gold.
* **Idle drip** from the spout every ~6 s, so the inlet reads as a water source
  before anyone touches anything.

### The river
The surface itself is what moves. The painted water is sliced into 15 thin
horizontal bands, each shifted sideways on a sine that is phase-delayed down
the stack, so a refraction wave travels downstream *through the artwork* rather
than a veil drifting over it. On top of that: Each band also rises and falls as it slides — an orbit rather than a shear,
which is what a swell does — and both amplitude and speed scale with depth, so
near water moves faster and harder than far water. That gradient is most of the
sense of perspective.

Over it: crescent wave lines matching the ones the artist painted, travelling
downstream and fading at each end; foam filaments that stretch as they run;
specular sparkles that twinkle on and off; slow upwellings breaking the surface;
expanding rings around the one rock that actually sits in the current; and a
faint line of white water along the near bank. There is deliberately **no soft overlay of any kind** — see below.

Two things were tried and rejected, both measured:

| Approach | Result |
| --- | --- |
| `feTurbulence` + `feDisplacementMap` | Beautiful, and cost half the frame budget (59 → 35 fps) even clamped to a 1140×160 strip. Left in behind a `.warp` class on `#river`. |
| `mix-blend-mode: screen` | Forces a full-stage backdrop readback every frame: 38 fps vs 59.8. Dropped; the tile is tinted instead. |
| Soft blurred blobs | Read as **smoke**, not water. |
| Foam wakes behind rocks | There are no rocks in that stretch — the wakes were inventing obstacles, and it showed. Replaced with rings around the one rock that is really there, which the artist had already drawn ripples around. |
| A faint sheet of caustic filaments | Still read as smoke even at 20% opacity, because stretching a 512px tile to 430×150 smears it into haze. Removed entirely — the layer is gone, not just dimmed. |

The rule that came out of it: on water, **nothing soft may drift**. Every moving
highlight has a hard edge, and the only thing allowed to be gradual is the
surface distortion itself.

Current cost: 60 fps with the river, 60 fps without. Transform and opacity only.
`prefers-reduced-motion` hides the layer.

### Swapping in real art
### The number sentence
Two behaviours, on purpose:

* **Guided screens** (`0 + (+3)`, `0 − (+3)`) count the second term up as you
  drag — `0 + (+1)`, `0 + (+2)`, `0 + (+3)` — which is the teaching device the
  flow sheet asks for.
* **Every other equation screen** shows the whole sentence from the start —
  `(−2) + (+4) = ?` — because the learner is meant to *read* it and work out the
  answer. The `?` box previews whatever level you are currently on, so you can
  see your proposed answer before you commit.

Guddu also reads the sentence aloud on those screens, and the strip at the
bottom spells it out, so nobody is stranded by a terse VO line.
Press **Check** to submit.

Get it wrong and you get hint tier 1, then 2, then 3. On the fourth attempt
Guddu walks the answer through on the gauge, resets, and lets you try again.

## Character and bubble
One character, as in the Figma frame: the high-resolution still
`character-boy.png` at the frame's rect (1563,328 424×637, "fit"). No sprite
sheets and no frame animation — while a line plays he just breathes, via a
single CSS transform.

The speech bubble is the Figma artwork placed in the Figma rect
(1222,101 585×258) as a centred cover fill, which is exactly how the frame fills
it — so the bubble and its tail keep their drawn proportions. Nothing is sliced
or stretched. The text sits in the frame's own text box (1289,142 450×132).

Pari has no artwork in the final frame, so her two CSV lines (the screen-1
inactivity prompt and "now it's your turn") are spoken by Guddu Bhaiya.

## Water, inlet and outlet
All SVG, no sprites.

* **Surface** — two overlapping sine waves, an elliptical surface ring, rising
  bubbles. The slosh amplitude decays as the water settles.
* **Three-phase pour.** Two or three drips lead the column in, a tapered column
  with a moving highlight streak runs while the water moves, then it breaks up
  and one last drop falls. Both directions.
* **Flow strength tracks the drag.** One level is a spurt; four levels in one
  gesture thickens and sustains the column. The loop volume follows it too.
* **Impact.** The stream pushes a dimple into the surface, lays down an
  aeration patch, and sends rings travelling out to the glass walls.
* **The outflow goes somewhere.** It leaves the elbow, arcs out past the tank
  and lands in the river, throwing splash droplets and spreading ripple rings.
* **Tick-crossing flash.** Every time the surface passes a tick a quick
  horizontal ripple flashes at that tick — the counting is visible in the water,
  not only on the marker.
* **Valve wheels** on both pipes spin while water runs, and the pipe itself
  lights up. Cyan dashes travel inside the pipe body so the direction is
  readable at a glance. During hints the pipe that matters pulses gold.
* **Idle drip** from the spout every ~6 s, so the inlet reads as a water source
  before anyone touches anything.

### Swapping in real art
The valve wheels, splash, ripples and droplets are coded stand-ins. To replace
them with illustration, drop these into `assets/img` and point the matching
element at them:

| File | Size | Replaces |
| --- | --- | --- |
| `valve-wheel.png` | 256×256 | the `#valveIn` / `#valveOut` inline SVG (centre it on its axis — CSS rotates it) |
| `pipe-inlet-spout.png` | 512×512 | `pipe-inlet-s-bend.png`, redrawn so the spout mouth is fully in frame |
| `splash-foam.png` | 512×256 | the `#foam` ellipse |
| `ripple-ring.png` | 512×128 | the surface and river ring ellipses |
| `droplet.png` | 64×96 | the drip ellipses |

## Audio
* **Narration** — Web Speech API, rate 0.84, picking the warmest installed voice
  (Rishi on macOS, else Daniel / Alex / Google UK English Male).
* **SFX** — the `sfx_*.mp3` files carried over from the earlier build, plus two
  tiny Web-Audio tones generated in code (step tick, wrong buzz). No downloads,
  nothing licensed.
* **Contained in this tab** — on `visibilitychange` every loop pauses, speech
  pauses and the AudioContext suspends; they resume when you come back. The
  speaker button mutes everything.

## Zoom / scroll lock
Fixed body, `touch-action:none`, `overscroll-behavior:none`, pinch and
`gesturestart` swallowed, ctrl/⌘ + wheel and ctrl/⌘ + `+ - 0` swallowed,
double-tap zoom killed, and a guard that snaps `scrollTo(0,0)`. The stage scales
with one transform so it always fits the window, never zooms.

## One deliberate change from the CSV
The Figma gauge is **+5 … −5** (11 ticks). The CSV's Level-1 screens ask the
water to reach **+6**, which does not exist on that gauge, so those two screens
were retargeted to keep every arithmetic beat intact:

| CSV | Here | Movement |
| --- | --- | --- |
| (+2) → +6 | (+2) → +5 | rise 3 (was rise 4) |
| (+6) → +3 | (+5) → +2 | fall 3 (unchanged) |
| (+3) → −1 | (+2) → −2 | fall 4 (unchanged) |

Levels 2 and 3 already sit inside ±5 and are untouched. If the gauge should
really run to ±6, say so and I will add the two extra ticks and restore the
original numbers.

## Pacing: when the game moves on by itself
| Screen | Behaviour |
| --- | --- |
| Cutscene (`observe`) | Advances on its own once the narration and the water animation finish. No button — there is nothing to decide. |
| After a correct answer | Advances on its own after a longer pause, because the completed number sentence is the teaching moment and should be looked at. The **Continue** button stays on screen the whole time for anyone who wants to move sooner. |
| The last screen | Waits. **Play again** is the only tap the game insists on. |

Timings are `AUTO_OBSERVE` (1100 ms) and `AUTO_CORRECT` (2900 ms) at the top of
game.js. The flow sheet never specified a Continue tap anywhere, so this is
closer to the document than the button was.

## Chapter transitions — the flood wipe
Moving between chapters, the river climbs the whole screen, the next chapter is
built behind the water where nobody can see it, and then it drains away —
slower than it rose — to reveal the new screen. It fires automatically whenever
`FLOW[i].chapter` changes, so adding or reordering chapters needs no extra work.

No new artwork: it is the same water language as the tank — a wavy surface with
hard-edged foam on top and bubbles below — over the same background. Timings are
`FLOOD_REST` / `FLOOD_TOP` and the two `ramp()` calls in `Flood.wipe()` in
game.js if you want it faster or slower.

## Telling the learner what to do with the marker

Three layers, escalating only if the one before it is ignored:

1. **The marker pulses** the moment a screen becomes interactive — it breathes
   and glows, because a thing that changes size reads as grabbable and a thing
   that only changes colour reads as decoration. It keeps going until the
   marker is touched, not for a fixed few seconds.
2. **A ghost hand drags it.** After `GHOST_ARM` (2.6 s) of nothing, a
   see-through copy of the marker is pressed, dragged `GHOST_TRAVEL`
   (1.6 levels) and released, on a loop. It demonstrates the *gesture*, never
   the answer: it always travels the same short distance whichever way the
   target lies, and it picks its direction by which end of the gauge has room.
   It stops for good the moment the real marker is touched.
3. **The inactivity prompt** at 15 s, as before — and that one hands the pulse
   and the hand back, on the grounds that fifteen seconds of silence has
   earned them.

Pressing Check without ever moving the marker also re-offers the hand; getting
it wrong after dragging does not.

The hand is `assets/img/hand-nudge.png`, cropped in CSS to the hand alone —
the artwork carries blue motion arcs that read as sideways movement, and this
drag is vertical. It is mirrored about its own fingertip so the finger stays on
the marker and only the arm swings clear of the tank wall.

The marker's tick-to-tick snap is now eased (140 ms, 80 ms while dragging)
rather than jumped, so it reads as magnetic instead of twitchy.

## The answer line

When a screen is solved, the row the marker came to rest on lights up: a gold
rule opens out from the centre, wraps the tick, the number and the marker as
one object, a shine runs along it twice, and then it breathes until the screen
changes. It is the last thing the learner sees before the game moves on.

Three layers, because one gold bar washes out over pale glass and gets lost
over blue water — it is the saturation that carries it, not the brightness: a
wide soft halo, a tighter warm band, then the crisp rule. The row makes its own
stacking context so the rule passes *behind* the number rather than striking
through it.

It stops flush with the glass on the right and, on the left, at the tank's own
brick wall — tank-local x117.8, measured off `water-tank-empty.png`, which is
row-relative −30.8 since a row starts at x148.6. Any further and it hangs in
mid-air outside the tank. All of it is in the `.lvRow.correctGlow` block in
style.css.

## Holding a screen

The screen editor can freeze the flow while the scene keeps running: the water,
river, rain, pipes and character carry on exactly as they are and the marker
still drags, but the flow controller stops — no auto-advance, no inactivity
prompt, no chapter wipe. Anything the game wanted to do while held is
remembered and happens the moment it is released; a deliberate tap on
**Continue** is never held back.

| Control | Does |
| --- | --- |
| **⏸ Hold screen** in the editor, or **P** | freeze / release. A **SCREEN HELD** badge sits across the top so it is impossible to forget |
| **◀** / **▶**, or **[** / **]** | step to the previous / next screen by hand, landing with no long travel |
| **↻** | replay the screen you are on |

The hold survives a reload, because laying a screen out means reloading a lot.
It is stored under `podb.hold.v1` and only the editor ever sets it — deleting
editor.js leaves `Game.hold` false forever and the game behaves as before.

## Two things wrong in the artwork

Both are in the assets, not in the code, and both have a stopgap in place.

**`guddu-point.png` is clipped.** Its opaque content runs to x0 of a 1024-wide
canvas — the pointing hand is missing pixels, not mispositioned, and nothing in
CSS can recover them (`object-fit` is `contain`, which never crops). Until it is
re-exported with the hand inside the frame, `POSE_SUB` in game.js falls `point`
back to `talk`, the same leftward presenting gesture with an intact hand. Empty
that map and `point` comes back by itself.

**Both button pills are drawn off-centre inside their own canvas.**

| File | Canvas | Pill | Pill centre |
| --- | --- | --- | --- |
| `button-pill-orange.png` | 1684×634 | x8..1627 y10..510 | 48.55% 41.01% |
| `button-pill-blue.png` | 1617×604 | x3..1612 y104..600 | 49.94% 58.28% |

`background-size` is `100% 100%`, so a label centred in the *button box* lands
off-centre on the *pill* — right and low on orange, high on blue. The labels are
pinned to those fractions instead, which hold at any button size. Re-export the
pills centred and the two rules collapse back to `50% 50%`.

## Compliance tally

Checked against data.js and the transcription above; the source CSV is **not in
this repo**, so the wording of individual lines could not be re-verified against
it — only the structure, the arithmetic and the internal consistency.

| Check | Result |
| --- | --- |
| Screen count | 22 — 8 / 7 / 7 across the three chapters |
| VO on every screen | pass |
| Correct-answer line on every `move` screen | pass |
| Three escalating wrong-answer tiers, each with `vo` **and** `anim` | pass, all 15 |
| Inactivity prompt on every `move` screen | pass, all 15 |
| Equation targets derived, never hand-written | pass |
| Every level inside the ±5 gauge | pass |
| The documented ±6 retarget keeps its movement deltas | pass — rise 3, fall 3, fall 4 |
| Cutscene animation agrees with its narration | pass (see below) |

**One contradiction was found and fixed.** `g-intro` ran `start:-5 → to:0` with
`weather:'drain'`, so the outflow played while the water climbed five levels,
under a line that says the villagers used water and the level came down. Chapter
2 ends at −5 and chapter 3 opens at 0, so the climb is real — it now happens
behind the flood wipe, where nothing is visible, and the cutscene plays the same
dip-and-settle the two chapter-1 drain screens use. What is shown now agrees
with what is said.

**Two things left alone, both noted rather than changed:**

* Seven screens open at a level the previous screen did not leave the water on,
  the largest being +5 → −2 and −3 → +4. `show()` tweens across silently. The
  arithmetic is unaffected; the tank's continuous history is not.
* `resetAfter` is set on two screens and read nowhere in game.js.

## Files
```
index.html   stage markup — every element commented with its Figma rect
style.css    all positioning, transcribed from the frame
data.js      the 22 screens: VO, hints, animations, equations
game.js      engine: scaling, zoom lock, audio, TTS, sprites, water, flow
assets/img   the deduplicated Figma assets
assets/sfx   sound effects
```

---

## QA: the level jumper
A **QA · jump** tab sits under the sound buttons, top right. Click it (or press
**Q**) for a list of all 22 screens; clicking one drops you straight into it with
the water already at that screen's starting level.

**To remove it** delete three clearly fenced blocks, all marked `QA ONLY`:
the `#qaPanel` markup in `index.html`, the QA block at the bottom of
`style.css`, and the `buildQA()` block in `game.js`. Nothing else references it.

## Playthrough status
All 22 screens play through end to end with no JavaScript errors, correct water
continuity between screens, and every equation resolving. Verified by an
automated run that drags the marker to the right answer on each interactive
screen and checks the panel afterwards.
