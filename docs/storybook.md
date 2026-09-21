# The Village Water Tank — scrolling storybook

One continuous scroll. No page switching: scroll position drives the artwork, the
voiceover and the typewriter captions. 12 scenes, 73.7 s of narration.

## Run it

Open `index.html` directly, or in VS Code use **Live Server** (recommended — it
makes the audio seek behave and matches how you'll host it).

No build step, no dependencies, no framework. Plain HTML/CSS/JS.

## Files

```
index.html          markup + the three <audio> elements
styles.css          all styling, including Studio mode
app.js              scroll engine, voiceover, typewriter, rain, ducking
studio.js           the visual editor (see below)
story.js            GENERATED — scenes, word-level timings, layout seeds
assets/scenes/      01–12 .webp  (full) and @sm.webp (phones)
assets/audio/       12 voiceover mp3s + full_story.mp3 + music.mp3 + rain.mp3
assets/ui/          bubble-speech.png (box + tail in one piece; the live asset),
                    plus the retired bubble-body.png / tail.svg / bubble.png
```

## Studio mode — edit the layout, export JSON

Press **E**, click **Studio** in the bottom bar, or open `index.html#studio`.

It pauses everything, reveals the full line, and makes the current caption editable:

| Action | How |
|---|---|
| Move the box | drag it |
| Resize the width | drag the **blue** grip (bottom-right) |
| Nudge | arrow keys (hold **Shift** for 10×) |
| Previous / next scene | `[` and `]`, or the arrows in the panel |
| Flip tail (mirrors the bubble art) | button |
| Left, top, width, text size | number fields |
| Replay just this line | **Replay line** |

**Copy all JSON** puts the full 12-scene layout on your clipboard. Paste it back to
me (or into `LAYOUT` in `app.js`) and those become the exact values.
**Apply pasted JSON** goes the other way, so you can hand-write values and see them.

Edits autosave to `localStorage`, so a reload keeps them. **Reset** clears them and
falls back to the defaults in `app.js`.

### The JSON shape

```json
{
  "scene": 3, "kind": "bubble",
  "left": 58, "top": 4, "width": 40,   // % of the 16:9 frame
  "size": 1,                            // multiplier on the base text size
  "align": "left",
  "tailFlip": true                      // mirror the art so the tail comes out left
}
```

The bubble is one image — `assets/ui/bubble-speech.png` carries the box and its
tail together, stretched to the caption box (the art is 80.07% body / 19.93%
tail, hence the `-24.95%` bottom inset on `.skin`). The tail therefore sits near
one corner and `tailFlip` chooses which corner; position the box so that corner
falls nearest the speaker.

Narrator scenes (1 and 12) use `{"kind":"narration","bottom","width","size","align"}`
instead — they're a caption band, not a bubble.

## Emphasis, not reveal

The captions used to type themselves out letter by letter. That is gone. It
cost two things that were not worth it: a bubble sitting at its full final size
while holding two words, and a caret that had to be kept out of the line
breaking or the text re-wrapped mid-line.

Every line is now rendered whole the moment its scene opens, so a caption's box
is the size it will stay. What draws the eye instead is the words:

* **`.key`** - the lesson's own vocabulary, given a highlighter swipe and left
  marked for the whole scene: *zero, above, below, positive, negative, more,
  less, reference*, and any bare number. Marked once when the caption is built.
  It covers exactly the five teaching scenes (5, 6, 7, 8, 10) and leaves the
  seven narrative ones untouched, which is what keeps it reading as emphasis
  rather than decoration.
* **`.now`** - whichever word the voice is on, straight from the same `.srt`
  word timings that used to drive the typewriter. A reader following along gets
  a place-marker; a reader who is not is not chased across the line.

Neither changes an element's size, so a caption can no longer re-wrap: verified
by walking the mark through every word of every line at six widths from 390 to
2560, with zero height changes.

If a voiceover file fails to load, the same fallback clock still drives the
highlight, so the words still light in time.

## Text style

Measured off your original scenes: the Canva board was 1280 wide and the dialogue
was **Poppins SemiBold 32pt**, which is 48px at 1920 — so the size is set to
**2.5% of the frame width** with line-height 1.25. Phones use 3.8% for legibility.
Poppins loads from Google Fonts; if that's blocked the fallback stack is a
geometric sans.

## Audio

- `music.mp3` — soft bansuri-and-tanpura bed in raga Bhoop, 64 s seamless loop
- `rain.mp3` — monsoon ambience, 48 s seamless loop
- Both duck automatically to ~⅓ volume whenever a line is being spoken

Both beds were **synthesised for this project**, so there is nothing to licence and
no attribution required. To swap in a different track, drop it in as
`assets/audio/music.mp3` (or `rain.mp3`) — nothing else needs to change.

## Known content issues (from the art, not the code)

- **Scenes 6 and 7** narrate "above zero" and "below zero" but the artwork shows
  the water sitting exactly **at 0** in both. This is the one thing worth re-rendering.
- **Scene 9**'s tank has tick marks with no numerals, unlike every other scene.
