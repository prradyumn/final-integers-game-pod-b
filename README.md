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

## Playing just the game

Open `game/index.html`. It behaves exactly as it always has, including
**Play again** on the last screen.
