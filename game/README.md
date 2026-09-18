# Integers — The Village Water Tank  ·  Pod B

Open **index.html** in Chrome (double-click it). Nothing to install, no server needed.

## What it is
The full 20-screen flow from *Integers - Game V2.tsv*, built on the Figma
frame **Integers › page Final › Slide 16:9** (`node 94:1405`).

| Chapter | Screens | What the learner does |
| --- | --- | --- |
| The Village Tank | 9 | Find 0, then chase the water with the marker: +2, +6, +3, −1, −4 |
| Calculate The Level | 5 | Same tank plus a number sentence — three addition problems |
| Water Used Up | 6 | Four subtraction problems, then a finish screen |

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

The left-hand side is established the moment the screen opens and never
changes: `−2 + 4 = ?`. The learner is solving the **right-hand side**, not
assembling the left. The answer box shows whatever level they are currently on
— their proposed answer — and turns green once it is committed and correct.

An earlier build counted the second term up as you dragged on "guided" screens
(`0 + (+1)`, `0 + (+2)` …). That is not what the doc asks for and it is gone,
along with the `guided` flag.

There is no submit button — see "Nothing to confirm" below.

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
* **The outflow goes somewhere.** It leaves the elbow at full bore, arcs out
  past the tank and lands in the river, throwing splash droplets and spreading
  ripple rings. Two things matter for it not to read as a thin ribbon: the jet
  is **as wide as the hole it comes out of** (the mouth of
  `pipe-outlet-elbow.png` measures 47.8 CSS px across; `OUT_BORE` in game.js),
  and the ribbon's edges are offset **perpendicular to the flow**. The mouth
  points down-right at about 45°, so an offset applied horizontally points
  almost *along* the stream rather than across it, and the jet collapses to a
  fraction of its width however wide you make it.
* **Tick-crossing flash.** Every time the surface passes a tick a quick
  horizontal ripple flashes at that tick — the counting is visible in the water,
  not only on the marker.
* **Valve wheels** on both pipes spin while water runs, and the pipe itself
  lights up. During hints the pipe that matters pulses gold.
* **The water comes out of the pipes, not over them.** Both pipes sit at
  `z-index:3`, above their flow layers (`#flowIn` is 3 and earlier in the tree,
  `#flowOut` is 2), and the stream origins are the *centroid of the bore* rather
  than the lip — inlet 205,58 and outlet 718,945, measured off the artwork. The
  metal hides the top of the column so it emerges from the opening. Get either
  wrong and the stream reads as a strip laid over the pipe instead of water
  coming out of it.
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

The left-hand side is established the moment the screen opens and never
changes: `−2 + 4 = ?`. The learner is solving the **right-hand side**, not
assembling the left. The answer box shows whatever level they are currently on
— their proposed answer — and turns green once it is committed and correct.

An earlier build counted the second term up as you dragged on "guided" screens
(`0 + (+1)`, `0 + (+2)` …). That is not what the doc asks for and it is gone,
along with the `guided` flag.

There is no submit button — see "Nothing to confirm" below.

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

## Signs, not words

Everything on screen shows the sign itself — `+2`, `−1`, `−3` — and never the
word. All 41 signed lines use U+002B and U+2212; the gauge labels go through the
same `fmt()` as the equation panel, so `−3` on the scale and `−3` in the
sentence are the same glyph.

A speech engine cannot pronounce a glyph, though: `−1` comes out as "one" or as
nothing, and `+2` is read inconsistently across engines. So `speakable()` spells
both signs out **on their way to the engine and only there** — the bubble keeps
the flow doc's text exactly as written. It used to substitute `−` alone, which
left every `+` unspoken.

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

## The gauge runs −6 … +6

The Figma frame drew 11 ticks (+5 … −5). The flow doc's Level 1 reaches **+6**,
so the scale is 13 ticks and the spacing closes from 72.7 to **63** to fit the
same 830.6-tall glass interior — 12 gaps x 63 = 756, centred, 37.3 margin top
and bottom. `STEP_PX` and `TOP_SVG` at the top of game.js are the only two
numbers involved; tick rows, the marker, water levels, hint animations and the
ghost nudge all derive from them, and `--step` carries the row height into the
CSS. An earlier build retargeted those screens to +5 instead; the doc is now
followed exactly.

## Pacing: when the game moves on by itself
| Screen | Behaviour |
| --- | --- |
| Cutscene (`observe`) | Advances on its own once the narration and the water animation finish. No button — there is nothing to decide. |
| After a correct answer | Advances on its own after a longer pause, because the completed number sentence is the teaching moment and should be looked at. |
| The last screen | Waits. **Play again** is the only tap the game insists on. |

Timings are `AUTO_OBSERVE` (1100 ms) and `AUTO_CORRECT` (2900 ms) at the top of
game.js. `AUTO_CORRECT` came down from 2900 to 2200 when the Continue button
went: it used to be the way out of that wait, and without it the pause has to
be one nobody wants out of. The flow sheet never specified a Continue tap
anywhere, so this is closer to the document than the button was.

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
2. **A ghost hand drags it.** After `GHOST_ARM` (2.6 s) of nothing — or
   `GHOST_ARM_FIRST` (0.5 s) on the very first question, see below — a
   see-through copy of the marker is pressed, dragged `GHOST_TRAVEL`
   (1.6 levels) and released, on a loop. It demonstrates the *gesture*, never
   the answer: it always travels the same short distance whichever way the
   target lies, and it picks its direction by which end of the gauge has room.
   It stops for good the moment the real marker is touched.
3. **The inactivity prompt** at 15 s, as before — and that one hands the pulse
   and the hand back, on the grounds that fifteen seconds of silence has
   earned them.

Getting it wrong without ever having moved the marker also re-offers the hand;
getting it wrong after dragging does not.

**The first question gets the hand at once.** Screen 1's line is *"Find 0, the
level that shows sufficient water."* — it never mentions a marker or dragging,
and the doc's third hint for it is still the tap-era *"Tap 0."*, so the learner
is told nothing about how to act. Every later screen says *"Drag the water level
marker"* outright, and there the 2.6 s wait is the point: it gives them a chance
to follow the instruction before being nudged.

The hand is `assets/img/hand-nudge.png`, cropped in CSS to the hand alone —
the artwork carries blue motion arcs that read as sideways movement, and this
drag is vertical. It is mirrored about its own fingertip so the finger stays on
the marker and only the arm swings clear of the tank wall.

The marker's tick-to-tick snap is now eased (140 ms, 80 ms while dragging)
rather than jumped, so it reads as magnetic instead of twitchy.

## The sign lands on the word that means it

Each term is pinned to its own word in the narration where that word is
actually spoken, measured against `speakable()` — the string the engine indexes
its boundary events into, not the raw line.

The sign matters most. `+` is up the tank and `−` is down it, and that is the
whole lesson, so it arrives exactly as Guddu says the word:

| Screen | Word | Sign lands at |
| --- | --- | --- |
| `l2-1` | "increases" | 0.341 — exact |
| `l2-3` | "increase" | 0.300 — exact |
| `g-1` | "used" | 0.532 — exact |
| the other four | — | proportional |

Four of the seven lines are "Find the new water level." or "Your turn! Find the
new water level." and name nothing at all, so those keep the even spread. There
is no fixing that in code; it needs copy written into the flow doc.

**The build may never run backwards.** `g-1` is *"Now 3 levels are used"* — it
says the amount before the direction, so pinning both to their words would show
the `3` before the `−`. The sign keeps its word and the terms after it are
pushed past it, which lands `0 − 3` complete on "...are used": the moment the
line is describing anyway. If the pushing would run the last term off the end
of the line, the whole run is squeezed back inside it.

`eqAnchors()` in game.js. It is recomputed per screen in `EqStage.reset()`.

## Motion: a spring, and no library

The entrances are driven by the **Web Animations API**, with the CSS keyframes
left in as the fallback — `body.jsMotion` switches them off so the two cannot
fight over `transform`.

No library, deliberately. This game is opened by double-clicking index.html:
there is no server and no build step, so a CDN `<script>` would make it need the
internet to animate, and an ES-module library cannot be loaded over `file://` at
all — module scripts are CORS-checked and a `file://` origin is opaque. WAAPI is
already in every browser this runs on and gives the one thing a motion library
was wanted for: a real spring.

A spring is worth it because a cubic-bezier **cannot overshoot and settle**. It
can only approximate the first half of that curve, which is why an eased pop
reads as mechanical next to a sprung one. `Spring.curve()` samples the closed
form of a damped harmonic oscillator into keyframes — 45 of them, peaking at
about 1.24 before settling — and hands them to `Element.animate()`.

Each kind of thing enters in character:

| | Entrance |
| --- | --- |
| **value** (a level or a count) | drops in and settles |
| **sign** (`+` / `−`) | stamped down from twice size with a tilt, a heavier spring so it lands with weight, and a gold flash to land on |
| **sym** (`=`) | a small pop; it is punctuation and must not compete |
| **role labels** | ride in just behind the box they name |
| **tiles** | sprung, staggered 75 ms, alternating tilt, so the row lands as a handful of cards |

`fill` is `backwards`, never `both` — the same trap as the CSS version: `both`
latches the last keyframe onto the element and beats the tile `:hover` and
`.pick` transforms. `prefers-reduced-motion` drops every entrance to a plain
fade.

## The tiles are earned, not given

On an equation screen the tiles do not exist until the water has been moved and
come to rest somewhere other than where the screen started.

Without that gate the tank is optional. `−2 + 4 = ?` with four numbers under it
is a multiple-choice question, answerable by reading the sentence and picking,
and the one thing in the game that actually *shows* what adding 4 to −2 does
can be skipped entirely. The gauge is where the answer is worked out; the tiles
are only where it gets said. So the working comes first.

Three details decide whether this teaches or just annoys:

* **Coming to rest, not the first touch.** Tiles appearing mid-drag is something
  moving under the hand. They arrive when the marker is let go.
* **Any level, never the right one.** Unlocking on the correct level would hand
  over the answer and make the tiles a formality. Resting anywhere that is not
  the starting level opens them — including a wrong one.
* **A staged tile is out of reach, not merely invisible.** `opacity:0` still
  takes clicks, so `#answerTiles.staged` is `pointer-events:none` and `pick()`
  refuses anything before `tilesOffered`. Otherwise the answer can be tapped
  straight through the hidden row.

Every equation in the game has a non-zero second term, so the target is never
the starting level and the water always has to move — no screen can be locked
out by this. `offerTiles()` in game.js, and the check is in `onMoveSettled()`.

Level 1 is untouched: it has no tiles, and its marker still commits by resting.

## Nothing to confirm

The game has **one button**, on the last screen, and it says *Play again*.
Check and Continue are both gone.

**Check went because the answer was already given.** Tapping a tile is not
nominating an answer for approval, it is answering; asking the learner to then
confirm it adds a step that decides nothing. A tap now resolves on its own,
one beat later — long enough for the tile to be seen to be chosen before the
verdict lands on it.

It also took a bug with it. `check()` read `Game.answer`, which is `null` until
a tile is tapped, so pressing Check with nothing selected compared `null`
against the target, failed, and burned a hint tier for it.

**Marker screens commit by coming to rest.** Level 1 has no tiles, so bringing
the marker to a level and leaving it there is what names that level.
`COMMIT_MS` (900 ms) is the grace before resting counts, and it is the whole
trick: letting go to change grip, or overshooting and coming back, must not
read as an answer. Touching the marker again cancels the pending commit and
the clock restarts from wherever they stop next. Resting on the level the
screen *started* on never commits — there is nothing to say yet.

**A spent tile is retired.** With no Check in the way, a wrong tile left live
invites the same tap again, which is a loop with nothing in it. The tile that
was just spent is struck through and disabled; the rest stay live.

**Continue went because every screen already moves on by itself.** Cutscenes
advanced on their own, and so did correct answers — Continue was only ever a
way of getting there sooner. The finish screen is the one place the game must
not move on by itself, which is what the remaining button is for. It reloads.

One thing this exposed: `correct()`, `wrong()` and `onIdle()` had no generation
guard, unlike `show()`. Changing screen mid-celebration left `correct()`
running against whatever had replaced it — it read the *new* screen's correct
line and then armed an auto-advance that skipped it. Only the QA jumper and the
editor transport can cause that, but both are how anyone actually works on this.
All three now carry the same `gen` check `show()` uses.

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
| Screen count | 20 — 9 / 5 / 6 across the three chapters |
| VO on every screen | pass |
| Correct-answer line on every `move` screen | pass |
| Three escalating wrong-answer tiers, each with `vo` **and** `anim` | pass, all 13 |
| Inactivity prompt on every `move` screen | pass, all 13 |
| Equation targets derived, never hand-written | pass |
| Every level inside the ±6 gauge | pass |
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

## Two leaks that were fixed

**The pipes kept running after the flow changed direction.** `Flow.want()`
started the new side without ever closing the old one, and `Flow.tick()` only
ever cleaned up whichever direction was *current* — so the moment a drag
changed direction, the side it left behind kept its pipe glow, its spinning
valve, its in-pipe dashes and its audio loop, permanently. There is now a
`Flow.close(dir)` that shuts one side down completely; `want()` calls it on
every change of direction, and `tick()` calls it when a tail finishes.

Verified with real timers: drag up, switch to down, settle — the inlet closes
the instant the direction changes and everything reaches `dir:null phase:off`.

Two smaller ones alongside it: `Flood.wipe()` set `Audio_.want('fill', true)`
and never cleared it, so `resumeLoops()` restarted the fill loop on the next
tab switch with nothing pouring; and the idle spout drip now only runs on a
question the learner has not answered yet, because after the answer is in the
same drip reads as a leak rather than as ambience.

## Where the speech bubble sits

Figma puts it at 1222,101. That frame had a single character still at
1563,328 424×637; the nine-pose box is registered differently (1550,266
450×675) and the poses that raise an arm reach further up, so the balloon's
tail was landing in his hair — and on `cheer`, straight through his raised
fist. Measured overlap of opaque pixels at the Figma rect:

| pose | overlapping px | | pose | overlapping px |
| --- | --- | --- | --- | --- |
| think | 1668 | | neutral | 1052 |
| happy | 1432 | | worried | 792 |
| idle | 1140 | | cheer | 756 |
| point | 500 | | talk / surprised | clear |

**1170,49** is the nearest position that clears all nine poses with 12px to
spare while keeping the tail pointing down-right at his head. `#bubbleText` is
a child of `#bubble`, so it rides along.

## The in-pipe direction dashes, and why they are gone

There used to be a `#pipeFx` layer drawing cyan dashes along each pipe's bore
so the direction of travel was readable on the pipe itself. They were removed.

The paths were wrong to begin with — the inlet one ran along the bottom lip and
then straight off into open sky, because the svg's `viewBox` clipped the true
centreline (the inlet riser is at negative x *and* y). Tracing both bores off
the artwork and adding `overflow:visible` fixed the geometry, and it still
looked wrong: the pipe art is opaque, fully-rendered steel with specular
highlights, so anything painted over it reads as a decal on the surface, never
as fluid inside it. Aligned or not, it was a blue smear on the metal.

Direction is carried by three other cues, all of which survive: the valve wheel
spins, the pipe body glows (`#pipeIn.active` / `#pipeOut.active`), and the water
column visibly leaves the mouth. The dashes were the only one of the four that
looked wrong and the only one that was redundant.

**To bring them back properly** the pipe needs redrawing with a glass or
cut-away section, with the dashes moved *behind* the pipe so they show through
it. A `mix-blend-mode:screen` sheen over the metal is the no-new-art middle
option, but blend modes force a backdrop readback — the river section above
measured that at 38fps vs 59.8 — so it would need measuring before it stays.

## The sentence builds itself as he talks

The number sentence and its four answer tiles used to arrive in one block the
moment the screen opened — nine new objects landing together while Guddu was
still explaining what the screen was about. Nothing told the learner where to
look first.

It is assembled one term at a time instead, in the order the sentence is read
and in the order the narration says it:

| Beat | What appears | Why there |
| --- | --- | --- |
| 1 | the starting level `−2` | the level the water is on now |
| 2 | the sign `+` / `−` | **the increase or the decrease** — the line says it here |
| 3 | the amount `4` | by how much |
| 4 | `=` | |
| 5 | the empty answer box `?` | the question, asked last |

The sign is its own beat because it is the thing the line is actually about:
"it increases by 3" and "3 levels are used" differ in that symbol and nothing
else. Each term brings in the role label underneath it, and the three value
boxes get a soft tick; the two operators arrive silently, so five beats do not
become five noises over the narration.

**The tiles are held back** until the sentence is complete *and* the narration
has stopped — `Promise.all` on the two, so whichever finishes last is what they
wait for. There is only ever one new thing on screen to look at.

**The beat is paced off the length of the line**, not fixed. A fixed 430 ms ran
the sentence on for a second after "Find the new water level." had finished, and
was over long before the end of a line three times that. `EqStage.pace()` uses
the same length estimate the muted branch of `VO.speak()` times itself with, so
the sentence keeps step whether the narration is really being spoken or not —
`EQ_BEAT_MIN` / `EQ_BEAT_MAX` clamp it at 300 and 620 ms.

The reveal is **not** driven by speech-boundary events. They are the obvious way
to sync to the actual spoken word, and they are not reliable: several engines
never fire them, and none fire when the sound is muted, which would leave the
sentence permanently half-built. A cadence that runs alongside the narration is
what actually stays in step.

Everything is `EqStage` in game.js and the `.staged` / `.in` rules in style.css.
One trap worth knowing: those animations use `animation-fill-mode: backwards`,
never `both`. `both` latches the last keyframe onto the element permanently,
which beats the plain `transform` in the tile `:hover` and `.pick` rules and
freezes every tile at its landing size.

## No brackets

The sentence is written `−2 + 4 = ?`, never `(−2) + (+4) = ?`.

Brackets are the notation of the **sign rules** — they ask the learner to
resolve a signed quantity against an operator, which is the lesson where "two
minuses make a plus" lives. That is not this lesson, and the tank cannot show
it. Here the operator means one thing and one thing only: **`+` is up the tank
and `−` is down it.**

So the three boxes hold three different kinds of thing, which is what the role
labels underneath them have always said:

| Box | Role | Written as | Example |
| --- | --- | --- | --- |
| first | **started at** | a level, exactly as the gauge writes it | `−2` |
| middle | **jumped** | a count of levels — unsigned, the operator carries the direction | `4` |
| answer | **landed on** | a level again | `+2` |

All seven sentences in the game read this way:

```
0 + 3 = ?     +2 + 3 = ?     −2 + 4 = ?
0 − 3 = ?     +4 − 2 = ?     +2 − 4 = ?     −1 − 3 = ?
```

`−1 − 3 = ?` is "start at −1, go down 3" and nothing else. It is `fmt()` for the
two levels and `count()` for the middle box, both in game.js; the old `wrap()`
that added the brackets is gone. Putting a bracket back would put a rule on
screen that the game never teaches and the tank cannot demonstrate — and it
only stays honest while the second term is positive, which is the next section.

## No negative second term

Every number sentence in the game adds or subtracts a **positive** quantity.
Three screens were removed because their second term was negative:

| Removed | Was | Why |
| --- | --- | --- |
| `l2-4` | `(+3) + (−5)` | adding a negative |
| `l2-5` | `(−2) + (−3)` | adding a negative |
| `g-5`  | `(−3) − (−2)` | subtracting a negative — "two minuses make a plus" |

The tank cannot honestly show any of them. Its whole model is *the water rises
by this much* or *this much is used up*, and a negative second term inverts that
reading: `− (−2)` has to make the water **go up** while the sentence says
"minus", which teaches the sign rule as an arbitrary trick rather than as
something the tank demonstrates. The rule is now structural — `equation.b` is
positive on all seven remaining sentences — so anything added later has to obey
it or the tank will contradict the maths.

Removing them closed two of the water discontinuities as a side effect: `g-4`
now lands on −4 and the finish screen opens there, and Level 2 ends on +2
instead of −5.

## Two interaction models, one per level

**Level 1 is a marker level.** The water moves on its own, exactly as the
narration describes, and the learner's only job is to bring the marker to where
it went. It rained, so the water *actually rises to +2* — then you drag the
marker to +2. Every Level 1 screen works this way (`markerOnly: true`, with
`waterTo` naming where the water travels during the narration). Dragging the
marker never drags the water.

**Levels 2 and 3 are equation levels.** The number sentence is complete from the
moment the screen opens and the learner moves the *water* to solve the
right-hand side.

## Lines that came out, and one the doc gets wrong

Everything spoken or written on screen is the doc's own wording, with a single
marked exception (screen 1's third hint, below). These were written for the game
and have been removed:

| Removed | Was |
| --- | --- |
| the spoken number sentence | a second VO line reading the equation aloud after the screen's own line |
| the hint strip | `Read −2 + 4 = ? then drag the red marker to the answer` and a per-screen `hint` on every screen |
| the fourth-attempt walkthrough | "Watch carefully — I will show you", a scripted demo, then "Now you try." The doc defines three tiers, so a fourth attempt now repeats the third |
| the first-try tally | `You answered 12 of 16 first time.` on the finish screen |

Two places where the source itself needs a look:

* **`−2 + 4`** — the doc's VO is *"Water level is increase. Find the new
  water level."* It is transcribed verbatim and read aloud as written.
* **Screen 1** — the doc says *"Learner taps 0"* and its third hint was
  *"Tap 0."*, left over from when that screen was a tap target; from screen 3
  onward the same doc says *"Drag the marker to ..."*. As written it told the
  learner to do something the game does not accept, so it now reads **"Drag the
  marker to 0."** — same structure, the doc's own verb. This is the **only**
  wording in the game that differs from the source, and it is marked as such in
  data.js. Change the doc and the comment comes out.

The finish screen is the only screen with no doc entry at all; the game needs
somewhere to stop, so its line is a placeholder.

## What the tank shows about the maths

Three of the four learning objectives were being carried by narration alone —
the tank itself showed only *where the water is*, never where the move began or
how far it travelled. These make them visible. No new artwork was needed: the
start pin reuses `marker-dot-round.png`, which was already in the repo unused.

**The zero band.** 0 is the reference point the whole lesson turns on, so it is
drawn into the tank rather than left to a label on the rail: a wash over the
above-zero zone, a darker one below, and a hard yellow line between them. It
covers the empty glass as well as the water, so the two *zones* read even when
the water is nowhere near 0. Positioned from `svgYFor(0)`, so it follows the
scale rather than being hand-placed.

**The start pin.** A second, quieter marker drops onto the level a move began
from and stays there for the whole screen — blue-grey, hue-rotated off the same
red artwork so it never competes with the marker you drag. "I started at −2, I
am now at +2" becomes something the learner can see instead of something they
have to hold in their head, which is the objective it exists for.

**The jumps.** One arc per level crossed, drawn from the pin to the marker as a
single tapered ribbon, with a node on every level it touches and a running
count beside it (`4 ▲`). This is the number-line hop the learner will meet in
the textbook, and it is the only place the *size* of a move is visible rather
than merely spoken. The whole chain is rebuilt from `(start, current)` on every
change, so dragging back and forth stays honest.

It took three goes to make it read as hops rather than as a glyph, and the
failures are worth keeping:

* **A bulge near the step height makes a circle, not a leap.** The first
  version used a 50 bulge against a 51px chord; with round caps and a gap
  curling both tips inward, each arc closed into a **"C"**. `HOP_BULGE` is 36
  now, which puts the apex about 27px out against the same chord.
* **Flattening them alone makes a curly brace.** Shallow same-side scallops
  with small gaps fuse into a `}`. On a real number line the hops sit *on an
  axis*; there is no axis here, so nothing broke them apart.
* **The nodes are what fixed it.** A dot on every level the chain touches,
  sitting exactly on that level's line, does two jobs at once: it ties each arc
  end to a real level, and it breaks the scallops into separate hops. `HOP_GAP`
  is 0 — the arcs meet *at* the nodes, the way textbook hops meet on the line.
* **A short stub** runs from each node back toward its number. It starts at
  `HOP_X - 34`, right of the label box, which ends at tank-local 308 — anything
  further left is drawn through the digits.

`HOP_X` stays at **326**, and moving it onto the ticks is a trap: the labels
occupy 238..308, so the arcs would strike the numbers.

**There is no arrowhead.** The old one was a 22×15 triangle drawn axis-aligned
pointing up or down, sitting on a curve that arrives travelling *horizontally* —
both control points share their endpoint's y, so the tangent at the end is
`(-bulge, 0)`. The arrow and the line it capped disagreed, which was most of why
the marker looked wrong. A filled landing disc is what a number line actually
uses, cannot contradict the curve, and direction is already carried by the count
chip's arrow and by the start pin.

**Depth.** The chain is a *filled, tapered ribbon*, not a stroked line — a stroke
is one width for its whole length. It is built by walking the bezier centreline
and stepping off it perpendicular, the same construction `Flow.drawOut()` uses
for the outflow jet. The taper **grows toward the landing** (`HOP_W0` 6 →
`HOP_W1` 11): that end is where the learner is now and it follows the marker as
they drag, so the weight belongs there with the filled disc. A gradient across
it gives the ribbon a lit and a shadowed side, and one `drop-shadow` over the
whole group lifts it off the water as a single object rather than each arc
casting its own. Every arc is a subpath of **one** path element, so the white
outline is drawn once; stroking a halo per arc made the joins lumpy.

### Still to come

The remaining gaps are in the *question* layer rather than the visuals: nothing
yet asks the learner to mark the start themselves, to give the number of jumps,
or to build the sentence from the action. Those need new screen types
(`markStart`, `count`, `predict`, `build`) **and VO copy written into the flow
doc** — the doc is the source of every line in this build, and these would be
the first screens without one.

## Files
```
index.html   stage markup — every element commented with its Figma rect
style.css    all positioning, transcribed from the frame
data.js      the 20 screens: VO, hints, animations, equations
game.js      engine: scaling, zoom lock, audio, TTS, sprites, water, flow
assets/img   the deduplicated Figma assets
assets/sfx   sound effects
```

---

## QA: the level jumper
A **QA · jump** tab sits under the sound buttons, top right. Click it (or press
**Q**) for a list of all 20 screens; clicking one drops you straight into it with
the water already at that screen's starting level.

**To remove it** delete three clearly fenced blocks, all marked `QA ONLY`:
the `#qaPanel` markup in `index.html`, the QA block at the bottom of
`style.css`, and the `buildQA()` block in `game.js`. Nothing else references it.

## Playthrough status
All 20 screens play through end to end with no JavaScript errors, correct water
continuity between screens, and every equation resolving. Verified by an
automated run that drags the marker to the right answer on each interactive
screen and checks the panel afterwards.
