/* ============================================================================
   Integers — Water Tank  ·  Pod B
   FLOW DATA  —  transcribed verbatim from "Integers - Game V2.tsv"
   ----------------------------------------------------------------------------
   EVERY line of VO, correct feedback, wrong-answer feedback and inactivity
   prompt below is the doc's own wording. Nothing here is written for the game.
   If a line reads oddly, it reads oddly in the source — see README, "Lines the
   doc gets wrong", rather than editing it here.

   type      'observe' | 'move' | 'finish'

   ── Level 1 is a MARKER level ────────────────────────────────────────────
   The water moves on its own, exactly as the narration describes it, and the
   learner's only job is to bring the marker to where the water went. So:

     start       water level the screen opens on
     waterTo     level the water travels to by itself, during the narration
     markerStart where the marker is parked (it stays put while water moves)
     target      level the learner must bring the marker to  ( === waterTo )
     markerOnly  true — dragging the marker does NOT drag the water

   ── Levels 2 and 3 are EQUATION levels ───────────────────────────────────
   The left-hand side is established from the moment the screen opens; the
   learner solves the right-hand side by moving the water itself.

     start       water level the screen opens on   ( === equation.a )
     equation    {a, op, b}  → target is derived, never hand-written

   wrong[]   the doc's three escalating tiers  {vo, anim}
   idle      the doc's inactivity prompt        {vo, anim, speaker}

   anim keys are handled in game.js → runHintAnim()
     highlightCentre  highlightZero  pulseZero
     highlightUp      highlightDown
     stepThrough      pulseSpan
     pulseStart       resetToStart   pulseEquation
   ========================================================================== */

/* The doc's Level 1 reaches +6, so the gauge runs −6 … +6 (13 ticks).
   Every level in the flow stays inside that range. */
const GAUGE_MIN = -6;
const GAUGE_MAX = 6;

const FLOW = [

  /* ═══════════════ LEVEL 1 — The village tank (doc rows 1–8) ═════════════
     Nine screens: six the learner acts on, three they watch.              */

  {
    id: 'l1-find0', chapter: 1, chapterName: 'The Village Tank',
    screen: 'Find 0', type: 'move',
    start: 0, target: 0, markerOnly: true, markerStart: 6,
    speaker: 'guddu',
    vo: 'Find 0, the level that shows sufficient water.',
    correct: 'Correct! At 0, we have sufficient water for the village.',
    wrong: [
      { vo: 'Look at the water reference level in the centre of the tank.', anim: 'highlightCentre' },
      { vo: 'Look for the level that shows we have sufficient water.',      anim: 'highlightZero'   },
      { vo: 'Tap 0.',                                                       anim: 'pulseZero'       }
    ],
    idle: { speaker: 'pari', vo: 'Look for the water reference level at 0.', anim: 'pulseZero' }
  },

  {
    id: 'l1-rain', chapter: 1, screen: 'Water level rises above 0', type: 'observe',
    start: 0, to: 2, weather: 'rain',
    speaker: 'guddu',
    vo: 'It rained heavily, so the water level has risen above 0.'
  },

  {
    id: 'l1-plus2', chapter: 1, screen: 'Guided gameplay: +2', type: 'move',
    start: 2, target: 2, markerOnly: true, markerStart: 0,
    speaker: 'guddu',
    vo: 'The water is 2 levels above 0. That is +2. Drag the water level marker to +2',
    correct: 'Yes! The water level rises 2 levels above 0. This is as +2.',
    wrong: [
      { vo: 'The water level has risen. Move 2 levels above 0.',                anim: 'highlightUp' },
      { vo: 'Water level rises 2 levels up. Start at 0 and count 2 levels up.', anim: 'stepThrough' },
      { vo: 'Count the levels carefully.',                                      anim: 'pulseSpan'   }
    ],
    idle: { speaker: 'guddu', vo: 'The water rises 2 levels. Start from 0 and count.', anim: 'stepThrough' }
  },

  {
    id: 'l1-plus6', chapter: 1, screen: '(+2) to +6', type: 'move',
    start: 2, waterTo: 6, target: 6, markerOnly: true, markerStart: 2,
    speaker: 'guddu',
    vo: 'The water level rises 4 levels from +2. Drag the marker to the correct level.',
    correct: 'Yes! The water rises 4 levels from +2 and reaches +6.',
    wrong: [
      { vo: 'The water level rises from +2. Move 4 levels upward.',                 anim: 'highlightUp' },
      { vo: 'Water level rises 4 levels up. Start at +2 and count 4 levels up.',    anim: 'stepThrough' },
      { vo: 'Count the 4 levels carefully.',                                        anim: 'pulseSpan'   }
    ],
    idle: { speaker: 'guddu', vo: 'Start at +2 and count 4 levels up.', anim: 'stepThrough' }
  },

  {
    id: 'l1-down1', chapter: 1, screen: 'Water level comes down', type: 'observe',
    start: 6, to: 6, weather: 'drain',
    speaker: 'guddu',
    vo: 'The villagers have used some of the stored water, so the water level has come down.'
  },

  {
    id: 'l1-plus3', chapter: 1, screen: '(+6) to +3', type: 'move',
    start: 6, waterTo: 3, target: 3, markerOnly: true, markerStart: 6,
    speaker: 'guddu',
    vo: 'The water level comes down 3 levels from +6. Drag the marker to the new water level.',
    correct: 'Yes! The water comes down 3 levels from +6 and reaches +3.',
    wrong: [
      { vo: 'The water level comes down from +6. Move 3 levels downward.',                    anim: 'highlightDown' },
      { vo: 'The water level comes down 3 levels. Start at +6 and count 3 levels down.',      anim: 'stepThrough'   },
      { vo: 'Count the 3 levels carefully.',                                                  anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at +6 and count 3 levels down.', anim: 'stepThrough' }
  },

  {
    id: 'l1-down2', chapter: 1, screen: 'Water level comes down further', type: 'observe',
    start: 3, to: 3, weather: 'drain',
    speaker: 'guddu',
    vo: 'The villagers have used more of the stored water, so the water level has dropped further.'
  },

  {
    id: 'l1-minus1', chapter: 1, screen: '(+3) to −1', type: 'move',
    start: 3, waterTo: -1, target: -1, markerOnly: true, markerStart: 3,
    speaker: 'guddu',
    vo: 'The water level comes down 4 levels from +3. Drag the marker to the new water level.',
    correct: 'Yes! The water comes down 4 levels from +3 and reaches −1.',
    wrong: [
      { vo: 'The water level comes down from +3. Move 4 levels downward.', anim: 'highlightDown' },
      { vo: 'Start at +3 and count 4 levels down.',                        anim: 'stepThrough'   },
      { vo: 'Count the 4 levels carefully.',                               anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at +3 and count 4 levels down.', anim: 'stepThrough' }
  },

  {
    id: 'l1-minus4', chapter: 1, screen: '(−1) to −4', type: 'move',
    start: -1, waterTo: -4, target: -4, markerOnly: true, markerStart: -1,
    speaker: 'guddu',
    vo: 'The water level comes down 3 levels from −1. Drag the marker to the new water level.',
    correct: 'Yes! The water comes down 3 levels from −1 and reaches −4.',
    wrong: [
      { vo: 'The water level comes down from −1. Move 3 levels downward.', anim: 'highlightDown' },
      { vo: 'Start at −1 and count 3 levels down.',                        anim: 'stepThrough'   },
      { vo: 'Count the 3 levels carefully.',                               anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at −1 and count 3 levels down.', anim: 'stepThrough' }
  },

  /* ═══════════ LEVEL 2 — Calculate the water levels (doc Level 2) ════════ */

  {
    id: 'l2-intro', chapter: 2, chapterName: 'Calculate The Level',
    screen: 'Transition', type: 'observe',
    start: 0, to: 0,
    speaker: 'guddu',
    vo: 'Now let’s calculate the water levels exactly.'
  },

  {
    id: 'l2-1', chapter: 2, screen: '0 + (+3)', type: 'move',
    start: 0, equation: { a: 0, op: '+', b: 3 },
    speaker: 'guddu',
    vo: 'The water level is at 0. It increases by 3 levels. Let’s find the new water level.',
    correct: 'Correct! The water level rises from 0 to +3.',
    wrong: [
      { vo: 'The water level needs to rise.',                    anim: 'highlightUp' },
      { vo: 'Start at 0 and watch how the water level changes.', anim: 'pulseStart'  },
      { vo: 'Count 3 levels carefully.',                         anim: 'pulseSpan'   }
    ],
    idle: { speaker: 'guddu', vo: 'Start at 0 and move the water 3 levels up.', anim: 'stepThrough' }
  },

  {
    id: 'l2-turn', chapter: 2, screen: 'Now it’s your turn', type: 'observe',
    start: 3, to: 3,
    speaker: 'guddu',
    vo: 'Now it’s your turn'
  },

  {
    id: 'l2-2', chapter: 2, screen: '(+2) + (+3)', type: 'move',
    start: 2, equation: { a: 2, op: '+', b: 3 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    correct: 'Correct! The water level rises from +2 to +5.',
    wrong: [
      { vo: 'Check how the water level needs to change.',     anim: 'pulseStart'   },
      { vo: 'Look at the starting level and try again.',      anim: 'resetToStart' },
      { vo: 'Check how many levels the water needs to move.', anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at +2 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'l2-3', chapter: 2, screen: '(−2) + (+4)', type: 'move',
    start: -2, equation: { a: -2, op: '+', b: 4 },
    speaker: 'guddu',
    /* doc verbatim — the source reads "Water level is increase." */
    vo: 'Water level is increase. Find the new water level.',
    correct: 'Correct! The water level rises from −2 to +2.',
    wrong: [
      { vo: 'Check how the water level should change.',                anim: 'pulseStart'   },
      { vo: 'Start again from −2 and watch the level carefully.',      anim: 'resetToStart' },
      { vo: 'Count the levels as the water moves.',                    anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at −2 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'l2-4', chapter: 2, screen: '(+3) + (−5)', type: 'move',
    start: 3, equation: { a: 3, op: '+', b: -5 },
    speaker: 'guddu',
    vo: 'Your turn! Find the new water level.',
    correct: 'Correct! The water level comes down from +3 to −2.',
    wrong: [
      { vo: 'Check whether the water level should rise or come down.', anim: 'pulseEquation' },
      { vo: 'Start again from +3 and watch the water level.',          anim: 'resetToStart'  },
      { vo: 'Count the levels carefully as the water moves.',          anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at +3 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'l2-5', chapter: 2, screen: '(−2) + (−3)', type: 'move',
    start: -2, equation: { a: -2, op: '+', b: -3 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    correct: 'Correct! The water level comes down from −2 to −5.',
    wrong: [
      { vo: 'Check how the water level should change.',               anim: 'pulseStart'   },
      { vo: 'Start again from −2 and watch the level carefully.',     anim: 'resetToStart' },
      { vo: 'Count how many levels the water moves.',                 anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at −2 and find the new water level.', anim: 'pulseEquation' }
  },

  /* ═════════════ TRANSITION + LEVEL 3 — subtraction (doc "Game") ═════════ */

  {
    id: 'g-intro', chapter: 3, chapterName: 'Water Used Up',
    screen: 'Transition', type: 'observe',
    /* Level 2 ends at −5 and Level 3 opens at 0. The climb happens behind the
       flood wipe, where nothing is visible, so the cutscene can play the
       downward move the line describes instead of contradicting it. */
    start: 0, to: 0, weather: 'drain',
    speaker: 'guddu',
    vo: 'The villagers have used some of the stored water, so the water level has decreased.'
  },

  {
    id: 'g-1', chapter: 3, screen: '0 − (+3)', type: 'move',
    start: 0, equation: { a: 0, op: '−', b: 3 },
    speaker: 'guddu',
    vo: 'The water level is at 0. Now 3 levels are used. Let’s find the new water level.',
    correct: 'Correct! The water level comes down from 0 to −3.',
    wrong: [
      { vo: 'The water level needs to come down.',               anim: 'highlightDown' },
      { vo: 'Start at 0 and watch how the water level changes.', anim: 'pulseStart'    },
      { vo: 'Count 3 levels carefully.',                         anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at 0 and move the water 3 levels down.', anim: 'stepThrough' }
  },

  {
    id: 'g-2', chapter: 3, screen: '(+4) − (+2)', type: 'move',
    start: 4, equation: { a: 4, op: '−', b: 2 },
    speaker: 'guddu',
    vo: 'Now it’s your turn! Find the new water level.',
    correct: 'Correct! The water level comes down from +4 to +2.',
    wrong: [
      { vo: 'Check how the water level needs to change.',     anim: 'pulseStart'   },
      { vo: 'Look at the starting level and try again.',      anim: 'resetToStart' },
      { vo: 'Check how many levels the water needs to move.', anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at +4 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'g-3', chapter: 3, screen: '(+2) − (+4)', type: 'move',
    start: 2, equation: { a: 2, op: '−', b: 4 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    correct: 'Correct! The water level comes down from +2 to −2.',
    wrong: [
      { vo: 'Check how the water level should change.',           anim: 'pulseStart'   },
      { vo: 'Start again from +2 and watch the level carefully.', anim: 'resetToStart' },
      { vo: 'Count the levels as the water moves.',               anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at +2 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'g-4', chapter: 3, screen: '(−1) − (+3)', type: 'move',
    start: -1, equation: { a: -1, op: '−', b: 3 },
    speaker: 'guddu',
    vo: 'Your turn! Find the new water level.',
    correct: 'Correct! The water level comes down from −1 to −4.',
    wrong: [
      { vo: 'Check how the water level should change.',            anim: 'pulseStart'   },
      { vo: 'Start again from −1 and watch the water level.',      anim: 'resetToStart' },
      { vo: 'Count how many levels the water moves.',              anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at −1 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'g-5', chapter: 3, screen: '(−3) − (−2)', type: 'move',
    start: -3, equation: { a: -3, op: '−', b: -2 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    correct: 'Correct! The water level rises from −3 to −1.',
    wrong: [
      { vo: 'Check how the water level should change.',            anim: 'pulseEquation' },
      { vo: 'Start again from −3 and watch the level carefully.',  anim: 'resetToStart'  },
      { vo: 'Check how many levels the water needs to move.',      anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at −3 and find the new water level.', anim: 'pulseEquation' }
  },

  /* ──────────────────────────────── FINISH ────────────────────────────────
     The doc defines no end screen, but the game needs somewhere to stop.
     This is the ONLY screen whose line is not in the source — replace the VO
     when the doc gets one. */
  {
    id: 'done', chapter: 3, screen: 'Well done', type: 'finish',
    start: -1, to: -1,
    speaker: 'guddu',
    vo: 'Shabaash! You can now read the water level above and below zero, and calculate it too.'
  }
];

/* target for equation screens is derived, never hand-written */
FLOW.forEach(s => {
  if (s.equation) {
    const { a, op, b } = s.equation;
    s.target = op === '+' ? a + b : a - b;
  }
});

const CHAPTERS = { 1: 'The Village Tank', 2: 'Calculate The Level', 3: 'Water Used Up' };
