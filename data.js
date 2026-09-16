/* ============================================================================
   Integers — Water Tank  ·  Pod B
   FLOW DATA  (transcribed from "Integers - Game V2-3.csv")
   ----------------------------------------------------------------------------
   Every screen is one object in FLOW.

   type      'observe' | 'move' | 'finish'
   markerOnly / markerStart  park the slider away from the water level
   start     water level the screen opens on
   target    level the learner must reach (tap/move)
   to        level an 'observe' screen animates the water to
   equation  {a, op, b}  → target is derived:  op '+' ? a+b : a-b
   wrong[]   three escalating hint tiers  {vo, anim}
   idle      prompt after INACTIVITY_MS  {vo, anim, speaker}

   anim keys are handled in game.js → runHintAnim()
     highlightCentre  highlightZero  pulseZero
     highlightUp      highlightDown
     stepThrough      pulseSpan
     pulseStart       resetToStart   pulseEquation
   ========================================================================== */

/* The Figma gauge is +5 … −5 (11 ticks). Every level in the flow stays
   inside that range. */
const GAUGE_MIN = -5;
const GAUGE_MAX = 5;

const FLOW = [

  /* ───────────────────────── CHAPTER 1 — The village tank ───────────────── */
  {
    id: 'l1-find0', chapter: 1, chapterName: 'The Village Tank',
    screen: 'Find 0', type: 'move',
    start: 0, target: 0, markerOnly: true, markerStart: 5,
    speaker: 'guddu',
    vo: 'Find the sufficient water reference level — zero.',
    hint: 'Drag the red marker down to the 0 level, then press Check.',
    correct: 'Correct! At 0, we have sufficient water for the village.',
    wrong: [
      { vo: 'Look at the water reference level in the centre of the tank.', anim: 'highlightCentre' },
      { vo: 'Look for the level that shows we have sufficient water.',      anim: 'highlightZero'   },
      { vo: 'Drag the marker to 0.',                                                       anim: 'pulseZero'       }
    ],
    idle: { speaker: 'guddu', vo: 'Look for the water reference level at 0.', anim: 'pulseZero' }
  },

  {
    id: 'l1-rain', chapter: 1, screen: 'Water level rises above 0', type: 'observe',
    start: 0, to: 0, weather: 'rain', slosh: 1.0,
    speaker: 'guddu',
    vo: 'It rained heavily, so the water level has risen above 0.',
    hint: 'Watch the rain fill the tank.'
  },

  {
    id: 'l1-0to2', chapter: 1, screen: 'Guided gameplay: +2', type: 'move',
    start: 0, target: 2, guided: true,
    speaker: 'guddu',
    vo: 'The water is 2 levels above 0. That is plus 2. Move the water to plus 2.',
    hint: 'Drag the red marker up from 0 to +2, then press Check.',
    correct: 'Yes! The water level rises 2 levels above 0. This is written as +2.',
    wrong: [
      { vo: 'The water level has risen. Move 2 levels above 0.',                      anim: 'highlightUp'  },
      { vo: 'Water level rises 2 levels up. Start at 0 and count 2 levels up.',       anim: 'stepThrough'  },
      { vo: 'Count the levels carefully.',                                            anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'The water rises 2 levels. Start from 0 and count.', anim: 'stepThrough' }
  },

  {
    id: 'l1-2to5', chapter: 1, screen: '(+2) to +5', type: 'move',
    start: 2, target: 5, guided: true,
    speaker: 'guddu',
    vo: 'The water level rises 3 more levels from plus 2. Find the new water level.',
    hint: 'Drag the red marker up 3 levels: +2, +3, +4, +5.',
    correct: 'Yes! The water rises 3 levels from +2 and reaches +5.',
    wrong: [
      { vo: 'The water level rises from plus 2. Move 3 levels upward.',                    anim: 'highlightUp' },
      { vo: 'Water level rises 3 levels up. Start at plus 2 and count 3 levels up.',       anim: 'stepThrough' },
      { vo: 'Count the 3 levels carefully.',                                               anim: 'pulseSpan'   }
    ],
    idle: { speaker: 'guddu', vo: 'Start at plus 2 and count 3 levels up.', anim: 'stepThrough' }
  },

  {
    id: 'l1-drain1', chapter: 1, screen: 'Water level comes down', type: 'observe',
    start: 5, to: 5, weather: 'drain',
    speaker: 'guddu',
    vo: 'The villagers have used some of the stored water, so the water level has come down.',
    hint: 'Watch the water drain away.',
    resetAfter: 6
  },

  {
    id: 'l1-5to2', chapter: 1, screen: '(+5) to +2', type: 'move',
    start: 5, target: 2, guided: true,
    speaker: 'guddu',
    vo: 'The water level comes down 3 levels. Move to the new water level.',
    hint: 'Drag the red marker down 3 levels: +5, +4, +3, +2.',
    correct: 'Yes! The water comes down 3 levels from +5 and reaches +2.',
    wrong: [
      { vo: 'The water level comes down from plus 5. Move 3 levels downward.',                 anim: 'highlightDown' },
      { vo: 'The water level comes down 3 levels. Start at plus 5 and count 3 levels down.',   anim: 'stepThrough'   },
      { vo: 'Count the 3 levels carefully.',                                                   anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at plus 5 and count 3 levels down.', anim: 'stepThrough' }
  },

  {
    id: 'l1-drain2', chapter: 1, screen: 'Water level comes down further', type: 'observe',
    start: 2, to: 2, weather: 'drain',
    speaker: 'guddu',
    vo: 'The villagers have used more of the stored water, so the water level has dropped further.',
    hint: 'Watch the water level.',
    resetAfter: 3
  },

  {
    id: 'l1-2tom2', chapter: 1, screen: '(+2) to −2', type: 'move',
    start: 2, target: -2, guided: true,
    speaker: 'guddu',
    vo: 'The water level comes down 4 levels from plus 2. Move to the new water level.',
    hint: 'Drag the red marker down 4 levels: +2, +1, 0, −1, −2.',
    correct: 'Yes! The water comes down 4 levels from +2 and reaches −2.',
    wrong: [
      { vo: 'The water level comes down from plus 2. Move 4 levels downward.', anim: 'highlightDown' },
      { vo: 'Start at plus 2 and count 4 levels down.',                        anim: 'stepThrough'   },
      { vo: 'Count the 4 levels carefully.',                                   anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at plus 2 and count 4 levels down.', anim: 'stepThrough' }
  },

  /* ───────────────── CHAPTER 2 — Calculate the water levels ──────────────── */
  {
    id: 'l2-intro', chapter: 2, chapterName: 'Calculate The Level',
    screen: 'Transition', type: 'observe',
    start: -2, to: -2,
    speaker: 'guddu',
    vo: 'Now let us calculate the water levels exactly.',
    hint: 'A number sentence will appear beside the tank.'
  },

  {
    id: 'l2-1', chapter: 2, screen: '0 + (+3)', type: 'move',
    start: 0, equation: { a: 0, op: '+', b: 3 }, guided: true,
    speaker: 'guddu',
    vo: 'The water level is at 0. It increases by 3 levels. Let us find the new water level.',
    hint: 'Drag the red marker up and watch the number sentence change.',
    correct: 'Correct! The water level rises from 0 to +3.',
    wrong: [
      { vo: 'The water level needs to rise.',                              anim: 'highlightUp'   },
      { vo: 'Start at 0 and watch how the water level changes.',           anim: 'pulseStart'    },
      { vo: 'Count 3 levels carefully.',                                   anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at 0 and move the water 3 levels up.', anim: 'stepThrough' }
  },

  {
    id: 'l2-turn', chapter: 2, screen: 'Your turn', type: 'observe',
    start: 2, to: 2,
    speaker: 'guddu',
    vo: 'Now it is your turn.',
    hint: 'Read the number sentence yourself, then drag the red marker.'
  },

  {
    id: 'l2-2', chapter: 2, screen: '(+2) + (+3)', type: 'move',
    start: 2, equation: { a: 2, op: '+', b: 3 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    hint: 'Read the number sentence, then drag the red marker.',
    correct: 'Correct! The water level rises from +2 to +5.',
    wrong: [
      { vo: 'Check how the water level needs to change.',      anim: 'pulseStart'    },
      { vo: 'Look at the starting level and try again.',       anim: 'resetToStart'  },
      { vo: 'Check how many levels the water needs to move.',  anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at plus 2 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'l2-3', chapter: 2, screen: '(−2) + (+4)', type: 'move',
    start: -2, equation: { a: -2, op: '+', b: 4 },
    speaker: 'guddu',
    vo: 'The water level increases. Find the new water level.',
    hint: 'Read the number sentence, then drag the red marker.',
    correct: 'Correct! The water level rises from −2 to +2.',
    wrong: [
      { vo: 'Check how the water level should change.',              anim: 'pulseStart'   },
      { vo: 'Start again from minus 2 and watch the level carefully.', anim: 'resetToStart' },
      { vo: 'Count the levels as the water moves.',                  anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at minus 2 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'l2-4', chapter: 2, screen: '(+3) + (−5)', type: 'move',
    start: 3, equation: { a: 3, op: '+', b: -5 },
    speaker: 'guddu',
    vo: 'Your turn! Find the new water level.',
    hint: 'Watch the sign carefully — should the marker go up or down?',
    correct: 'Correct! The water level comes down from +3 to −2.',
    wrong: [
      { vo: 'Check whether the water level should rise or come down.', anim: 'pulseEquation' },
      { vo: 'Start again from plus 3 and watch the water level.',      anim: 'resetToStart'  },
      { vo: 'Count the levels carefully as the water moves.',          anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at plus 3 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'l2-5', chapter: 2, screen: '(−2) + (−3)', type: 'move',
    start: -2, equation: { a: -2, op: '+', b: -3 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    hint: 'Read the number sentence, then drag the red marker.',
    correct: 'Correct! The water level comes down from −2 to −5.',
    wrong: [
      { vo: 'Check how the water level should change.',                 anim: 'pulseStart'   },
      { vo: 'Start again from minus 2 and watch the level carefully.',  anim: 'resetToStart' },
      { vo: 'Count how many levels the water moves.',                   anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at minus 2 and find the new water level.', anim: 'pulseEquation' }
  },

  /* ─────────────────── TRANSITION — water is used up ─────────────────────── */
  {
    id: 'g-intro', chapter: 3, chapterName: 'Water Used Up',
    screen: 'Transition', type: 'observe',
    start: -5, to: 0, weather: 'drain',
    speaker: 'guddu',
    vo: 'The villagers have used some of the stored water, so the water level has decreased.',
    hint: 'Now the number sentences will use a minus sign.'
  },

  /* ───────────────────────── CHAPTER 3 — Subtraction ─────────────────────── */
  {
    id: 'g-1', chapter: 3, screen: '0 − (+3)', type: 'move',
    start: 0, equation: { a: 0, op: '−', b: 3 }, guided: true,
    speaker: 'guddu',
    vo: 'The water level is at 0. Now 3 levels are used. Let us find the new water level.',
    hint: 'Drag the red marker down, one level at a time.',
    correct: 'Correct! The water level comes down from 0 to −3.',
    wrong: [
      { vo: 'The water level needs to come down.',                anim: 'highlightDown' },
      { vo: 'Start at 0 and watch how the water level changes.',  anim: 'pulseStart'    },
      { vo: 'Count 3 levels carefully.',                          anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at 0 and move the water 3 levels down.', anim: 'stepThrough' }
  },

  {
    id: 'g-2', chapter: 3, screen: '(+4) − (+2)', type: 'move',
    start: 4, equation: { a: 4, op: '−', b: 2 },
    speaker: 'guddu',
    vo: 'Now it is your turn! Find the new water level.',
    hint: 'Read the number sentence, then drag the red marker.',
    correct: 'Correct! The water level comes down from +4 to +2.',
    wrong: [
      { vo: 'Check how the water level needs to change.',      anim: 'pulseStart'   },
      { vo: 'Look at the starting level and try again.',       anim: 'resetToStart' },
      { vo: 'Check how many levels the water needs to move.',  anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at plus 4 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'g-3', chapter: 3, screen: '(+2) − (+4)', type: 'move',
    start: 2, equation: { a: 2, op: '−', b: 4 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    hint: 'Read the number sentence, then drag the red marker.',
    correct: 'Correct! The water level comes down from +2 to −2.',
    wrong: [
      { vo: 'Check how the water level should change.',                anim: 'pulseStart'   },
      { vo: 'Start again from plus 2 and watch the level carefully.',  anim: 'resetToStart' },
      { vo: 'Count the levels as the water moves.',                    anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at plus 2 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'g-4', chapter: 3, screen: '(−1) − (+3)', type: 'move',
    start: -1, equation: { a: -1, op: '−', b: 3 },
    speaker: 'guddu',
    vo: 'Your turn! Find the new water level.',
    hint: 'Read the number sentence, then drag the red marker.',
    correct: 'Correct! The water level comes down from −1 to −4.',
    wrong: [
      { vo: 'Check how the water level should change.',                 anim: 'pulseStart'   },
      { vo: 'Start again from minus 1 and watch the water level.',      anim: 'resetToStart' },
      { vo: 'Count how many levels the water moves.',                   anim: 'pulseSpan'    }
    ],
    idle: { speaker: 'guddu', vo: 'Start at minus 1 and find the new water level.', anim: 'pulseEquation' }
  },

  {
    id: 'g-5', chapter: 3, screen: '(−3) − (−2)', type: 'move',
    start: -3, equation: { a: -3, op: '−', b: -2 },
    speaker: 'guddu',
    vo: 'Find the new water level.',
    hint: 'Taking away a negative makes the level rise.',
    correct: 'Correct! The water level rises from −3 to −1.',
    wrong: [
      { vo: 'Check how the water level should change.',                 anim: 'pulseEquation' },
      { vo: 'Start again from minus 3 and watch the level carefully.',  anim: 'resetToStart'  },
      { vo: 'Check how many levels the water needs to move.',           anim: 'pulseSpan'     }
    ],
    idle: { speaker: 'guddu', vo: 'Start at minus 3 and find the new water level.', anim: 'pulseEquation' }
  },

  /* ──────────────────────────────── FINISH ───────────────────────────────── */
  {
    id: 'done', chapter: 3, screen: 'Well done', type: 'finish',
    start: -1, to: -1,
    speaker: 'guddu',
    vo: 'Shabaash! You can now read the water level above and below zero, and calculate it too.',
    hint: 'You finished every level.'
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
