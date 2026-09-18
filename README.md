# The Village Water Tank — storybook + game

One experience. Open **`index.html`** in a browser (double-click it; no server,
no build step, no dependencies).

The reader scrolls through ten scenes of story, plays the water-tank game, and
comes back for the last two scenes.

```
scenes 1–10        →        THE GAME        →        scenes 11–12
"now I understand          20 screens,              "now we can use them
 positive and               marker + number          to keep track of the
 negative numbers"          sentences                stored rainwater"
```

**The story plays itself.** There is no Auto button: it starts scrolling the
moment the reader presses Begin. Scrolling by hand only *pauses* it - with no
button to press, ending it outright would strand them - and it picks itself
back up after `AUTO_RESUME_MS` (2.6 s) from wherever they stopped. The space
bar is a real pause, held until pressed again, and the game overlay holds it
too so the story cannot scroll on behind it.

There is also a **Game** button in the bar at the bottom, which goes straight
into the game from anywhere and returns the reader to where they left off.

## Layout

```
index.html      the storybook, and the host for everything
styles.css      story styling + the handoff/overlay rules appended at the end
app.js          story engine: scroll, voiceover, typewriter, rain      (untouched)
story.js        12 scenes with word-level timings                      (untouched)
studio.js       the story's layout editor, press E                     (untouched)
bridge.js       NEW - the only file that knows about both halves
assets/         story art, audio and bubble art
game/           the game, complete and self-contained
  index.html    open this to play the game on its own
  game.js style.css data.js layout.js editor.js vo-manifest.js
  assets/       img, sfx, and the 85 pre-rendered voice lines
  README.md     the game's own design record
docs/storybook.md   the storybook's own README
```

## Why the game is in an iframe

This is the one structural decision worth understanding, and it is what let
both halves stay exactly as they were.

The two projects have **incompatible scroll models**:

* The storybook is *driven* by scroll position — `window.scrollY` chooses the
  scene, the artwork and the voiceover.
* The game pins the window to `0,0` on every scroll event **and** again on a
  500 ms interval, because it draws a fixed 1920×1080 stage that must never
  move.

In one document the game's lock wins and the story can never be scrolled at
all. They also both define `#stage`, `#gate` and `#hud`.

Giving the game its own document keeps its scroll lock where it belongs and the
three ids apart, so **no game logic and no story visuals had to change to
accommodate the other**. The frame is built when the game is needed and
destroyed on the way out.

The two halves talk over `postMessage`:

| Message | Direction | Meaning |
| --- | --- | --- |
| `{source:'integers-game', type:'finished'}` | game → story | the last screen was reached |
| `{source:'integers-game', type:'exit'}` | game → story | close me and go back |
| `{source:'integers-host', type:'silence'}` | story → game | stop all sound, now |

## What changed in each half

**The storybook: nothing.** `app.js`, `story.js` and `studio.js` are byte-for-byte
the originals. `styles.css` only has rules *appended*. `index.html` gained the
viewport zoom lock, the Game button, the handoff card, the game panel and the
`bridge.js` tag — no existing markup was altered.

**The game: three additive changes**, all no-ops when it is opened on its own
(`EMBEDDED` is false):

1. `EMBEDDED` / `tellHost()` — detects the frame and posts to the host.
2. The last screen says **Back to the story** instead of **Play again**, and
   posts `exit` instead of reloading.
3. It listens for `silence` so the host can stop it dead when the panel closes.

No screen, rule, timing or piece of game logic was modified.

## The basics

* **No zoom.** `user-scalable=no`, and `bridge.js` swallows ctrl/⌘+wheel,
  pinch, ctrl/⌘ +/−/0 and double-tap. Plain wheel and one-finger drag are left
  alone, because the story has to scroll. The game keeps its own harder lock
  inside its frame.
* **Responsive.** The story letterboxes a 16:9 frame on desktop and gives the
  art a taller window on phones; the game scales its stage with one transform.
  Verified at 390×844, 820×1180, 1440×900 and 2560×1440 with no horizontal
  overflow.
* **Audio stays in the tab.** Hiding the tab pauses the voiceover, the music bed
  and the rain; returning resumes them. Opening the game pauses all three, and
  the game's frame is destroyed on exit so nothing can play behind a hidden
  panel.

## Assets

Everything ships in a modern format, with a fallback only where one is needed.

| | Before | After |
| --- | --- | --- |
| Images | 13.0 MB PNG | **1.4 MB WebP** (−89%) |
| Audio | 8.8 MB MP3 | **3.6 MB Ogg/Opus** (−59%) |
| Unused art removed | | **9 MB** |

**Images are WebP only.** Every PNG was converted at its original pixel
dimensions (`cwebp -q 86 -alpha_q 100 -m 6 -sharp_yuv`), so nothing was resized
and alpha is intact. WebP is supported everywhere this runs, so there is no
fallback and no PNG left in the tree.

The 9 MB of deleted art was: four 1920×1080 design mock-ups under
`game/assets/img/reference/` that nothing referenced, the three retired bubble
files the storybook's own README already called retired, and a stray duplicate
`speech-bubble.png` in `assets/scenes/`.

**Audio ships as both Ogg and MP3**, and that is deliberate. Opus is roughly
40% of the size, but **Safari cannot play Opus in an Ogg container** — shipping
Ogg alone would have silently killed the sound on every iPad and iPhone. So the
format is chosen at run time:

* the two beds in `index.html` use `<source>` elements and let the browser pick;
* `bridge.js` rewrites `STORY[i].audio` to `.ogg` when `canPlayType` says yes;
* `game.js` does the same through `audioSrc()` for its SFX and its 85 voice clips.

Chrome, Firefox and Edge fetch only the Ogg files; Safari falls back to MP3.
If you only ever target Chrome, deleting every `*.mp3` saves a further 8.8 MB
and nothing needs to change in code.

Bitrates: 24 kbps mono for speech, 64 kbps stereo for the music and rain beds.
All 105 converted files were checked against their originals — every duration
matches to within 0.12 s.

## Two causes of the caption jump

The dialogue box moved up and down while a line typed. There were **two**
separate causes, and both are fixed.

**The caret.** `app.js` walks the caret element through the text, re-inserting
it before whichever letter comes next. It was an `inline-block` with
`width:.075em` and `margin-left:.04em`, so that ~0.115em travelled with it —
enough to push the last word of a line over the edge and back as it went. The
caption re-wrapped, changed height, and jumped. Measured at 1440×900, scene 5's
text block went **180px → 225px** part-way through the line, a whole extra line
appearing and vanishing.

It is now zero-width, with the visible bar drawn by an absolutely positioned
`::after` — out of flow, so it cannot influence line breaking. See the comment
on `.caret` in styles.css.

**The font.** Poppins came from Google Fonts with `display=swap`, so the
captions laid out in the fallback face and were re-laid out when Poppins
arrived. Scenes 1 and 12 changed height by 7px at that moment. Poppins is now
self-hosted in `assets/fonts/` (23 KB, three weights) with `font-display:block`,
and the page makes **no network request at all**.

Verified per-letter across 16 viewport widths from 360 to 2560, plus a full
hand-scrolled read and 60 s of Auto playback: no caption changes height.

## Playing just the game

Open `game/index.html`. It behaves exactly as it always has, including
**Play again** on the last screen.
