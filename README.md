# MandarinPath

An offline-first Mandarin learning web app. Install it to an iPhone home
screen and it runs with no network, no account, and no tracking.

**Live:** https://4b626y8v7w-del.github.io/mandarinpath/

## Install on iPhone

1. Open the URL in **Safari** (not Chrome — iOS only offers home-screen install from Safari)
2. Share → **Add to Home Screen**
3. Launch from the new icon: fullscreen, and it works offline

Add the Mandarin voice first, or audio silently no-ops:
**Settings → Accessibility → Spoken Content → Voices → Chinese**
(then press **Check Mandarin voice** inside the app to confirm)

## What's in it

**10 units, 66 lessons, 1572 exercises, 889 reviewable cards**

| Unit | Content |
|---|---|
| 1. Tones First | 7 minimal sets (mā má mǎ mà) — tones before characters |
| 2–4. First Words / People / Daily Life | 250 highest-frequency words, frequency-ordered |
| 5–7. Directions / Time / Shop & Eat | 60 phrases across 10 situations |
| 8. Sound It Out | 40 commonly-mispronounced words, with the reason |
| 9. Put It Together | 80 real sentences across 9 situations |
| 10. Numbers & Time | 121 numbers, 28 measure words, 46 dates, 28 times |

Plus **316 themed words** (22 themes) each with a worked example sentence,
**70 grammar notes** embedded in lessons, and **stroke-order data for 120
characters**.

**Six practice modes:** SM-2 spaced review · Tone Trainer · Flip Match ·
4-grade flashcards · graded handwriting · **Type it** (productive recall)

**Word lookup:** tap any word's ℹ️ button anywhere in the app for its full
entry — characters, pinyin, meaning, HSK level, theme, stroke count, an
example sentence, and how well you've learned it. 979 words indexed across
every bundle. The sheet is a bottom sheet, not a new screen, so looking a
word up never costs you your place in a lesson.

## Beginner affordances

- **🐢 slow audio everywhere.** Every sound has a play and a play-slower
  button. Global speed steps 0.5× → 1.25×, defaulting to 0.7×. Above ~0.85×
  tone contours flatten together, so slow is the right default, not a crutch.
- **English shown before you answer.** The meaning and pinyin appear
  alongside the prompt, so recognition precedes recall. Both toggleable.
- **Graded handwriting.** Trace a character in a 田字格 grid and the app
  scores your ink against real stroke geometry. 120 characters have stroke
  data (692 strokes); the rest fall back to an honest "ink drawn" pass.
- **Sentence building.** Tap shuffled word-chunks into the right order. Word
  order is what English speakers get most wrong, and multiple choice cannot
  practise it — you have to construct it.
- **Grammar tips inline.** A short note on particles, word order or measure
  words appears inside the lesson where it is relevant, with an example.
- **Type it.** Hear a word, then type it. Every other format is recognition —
  you pick the right option among plausible ones, and elimination is a
  legitimate strategy. Typing cannot be eliminated past. Tone marks are
  optional, because on a phone keyboard they measure typing speed, not
  Mandarin.
- **Retry, then move on.** Missed items come back within the lesson, capped
  at two rounds so nobody gets trapped in a lesson they can't pass.
- **Nothing is timed.** No hearts pressure, no speed bonus.

## Honest limitations

- **Stroke order is taught by data, not graded.** The app knows the correct
  order for 120 characters and grades *shape* only. Detecting the order a
  learner actually drew needs a recogniser, not geometry, and a wrong order
  signal would teach something false.
- **Character pedagogy is the weakest-evidenced part of this app.** Spacing,
  retrieval practice and blocking-vs-interleaving are grounded in published
  research (see below); how best to teach written characters is not.
- **TTS quality depends on the installed voice.** Some system voices mangle
  tones. If pronunciation sounds wrong, try a different Chinese voice.
- **iOS evicts web-app data after ~7 days of disuse.** Use the app, and export
  your progress periodically (Settings → Export progress).
- **Sentences are checked for pinyin/character correspondence, not for
  naturalness by a native speaker.** The validator catches dropped syllables
  and mislabelled fields; it cannot catch an example that is grammatical but
  subtly unnatural.
- **Numbers and measure words are reference material, not a counting drill.**
  The app teaches the forms and their examples; it does not generate arbitrary
  arithmetic, so "how many" in a live shop is still on you.

## Design notes

Two findings from the learning-science research corrected a more obvious
initial design:

- **Lessons block by recall direction** rather than alternating zh→en and
  en→zh per word. Brunmair & Richter found interleaving *harmful* for word
  material (g = −0.39) — switching format every item splits attention from the
  word itself. Interleaving is kept in the games, which discriminate formats
  deliberately.
- **First scheduling gap is 9 days**, not 1. Cepeda's optimal gap is ~10–20%
  of the retention horizon; for a 3-month target that is 9–18 days. A 1-day
  first gap means the first ten words return forever and the 250-word list
  never rotates. Failing a card still brings it back in 10 minutes.

## Development

```bash
python -m http.server 8099 --bind 0.0.0.0   # then open http://<lan-ip>:8099

node test-srs.js          # spaced-repetition scheduler
node test-trace.js        # handwriting grader discrimination
node test-orientation.js  # stroke data is upright, not mirrored
node validate-data.js     # data bundles: format, pinyin, grid bounds
node validate-content.js  # grammar / numbers / themed vocabulary
node check-curriculum.js  # every quiz has its answer, no duplicates
node test-chunker.js      # sentence-builder puzzles are solvable
node test-typing.js       # typed-answer comparison, incl. false-pass traps
```

`probe.js` and `audit-layout.js` are injected into the running page by the
browser harness to drive the app and audit layout at real device sizes.

### Files

`index.html` · `app.js` (engine) · `data.js` (curriculum) ·
`vocab-data.js` (250 words / 60 phrases / 40 tricky) ·
`sentences-data.js` (30 patterns / 80 sentences) ·
`strokes-data.js` (120 characters) · `trace-grade.js` (handwriting scorer) ·
`srs.js` (scheduler) · `sw.js` (offline) ·
`grammar-data.js` (70 notes) · `numbers-data.js` · `vocab2-data.js` (316 themed) ·
`styles.css` (from the demo) · `shell.css` (app shell) · `beginner.css`

All content is bundled — no network calls, no accounts, no third-party code.