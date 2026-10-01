# MandarinPath

A self-hosted, offline-first Mandarin learning web app. Install it to an iPhone
home screen and it runs with no network and no account.

## What's in it

- **8 units, 29 lessons, 350 reviewable cards**
  1. Tones First — 7 minimal sets (mā má mǎ mà). Tones before characters, since
     tone carries as much meaning as the syllable.
  2–4. 250 highest-frequency words, frequency-ordered, with pinyin and HSK level
  5–7. 60 everyday phrases across 10 situations (directions, time, ordering, …)
  8. Sound It Out — 40 words beginners reliably mispronounce, with the reason
- **Four practice modes**: SM-2 spaced review, Tone Trainer, Flip Match,
  and4-grade flashcards (Again / Hard / Good / Easy)
- XP, streaks, hearts, a saga-map lesson path, and a 7-day review forecast

## Install on iPhone

1. Open the Pages URL in **Safari** (not Chrome — iOS only offers home-screen
   install from Safari)
2. Share → **Add to Home Screen**
3. Launch from the new icon: fullscreen, and it works offline

## Setup

Install the Mandarin voice first, or audio will silently no-op:
**Settings → Accessibility → Spoken Content → Voices → Chinese**

Then open it and tap **Start learning**. Progress lives in `localStorage` on the
device — nothing is sent anywhere, and there is no account to create.

## Design notes

Two findings from the learning-science research shaped the implementation, both
correcting a more obvious initial design:

- **Lessons block by recall direction** rather than alternating zh→en and
  en→zh per word. Brunmair & Richter found interleaving *harmful* for word
  material (g = −0.39) — switching format every item splits attention from the
  word itself. Interleaving is kept in the games, which discriminate formats
  deliberately.
- **First scheduling gap is 9 days**, not 1. Cepeda's optimal gap is ~10–20% of
  the retention horizon; for a 3-month target that is 9–18 days. A 1-day first
  gap means the first ten words return forever and the 250-word list never
  rotates. Failing a card still brings it back in 10 minutes, which is where
  repetition is cheap.

Worth stating plainly: the **character-pedagogy side of this app rests on much
thinner evidence** than the scheduling and retrieval side. Ordering, retrieval
practice, and spacing are well-grounded; how best to teach written characters is
not.

## Development

```bash
python -m http.server 8099 --bind 0.0.0.0   # then open http://<lan-ip>:8099
node test-srs.js                            # scheduler assertions
```

Files: `index.html` · `app.js` (engine) · `data.js` (curriculum) ·
`vocab-data.js` (250 words / 60 phrases / 40 tricky) · `srs.js` (scheduler) ·
`sw.js` (offline) · `styles.css`

All content is bundled — no network calls, no tracking, no accounts.