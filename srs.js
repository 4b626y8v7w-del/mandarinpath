/* MandarinPath spaced-repetition scheduler.
 *
 * SM-2 derived, simplified for one user on one phone:
 *  - each card has an ease factor (start 2.5, floor 1.3)
 *  - each review maps to a 4-button grade, like Anki: Again / Hard / Good / Easy
 *  - interval grows by the ease factor; lapses reset the interval but soften ease
 *  - due time is in minutes so a same-session retry is possible
 */
(function () {
  "use strict";

  const MIN = 60 * 1000;
  const DAY = 24 * 60 * MIN;

  const GRADES = {
    again: { label: "Again", mult: 0, easeDelta: -0.2, lapses: true },
    hard: { label: "Hard", mult: 0.6, easeDelta: -0.15 },
    good: { label: "Good", mult: 1.0, easeDelta: 0 },
    easy: { label: "Easy", mult: 1.35, easeDelta: 0.15 }
  };

  const RELEARNING_STEPS_MIN = [10, 60]; // 10 min, then 1 h
  const EASY_BONUS = 4;

  // First successful gap. Cepeda: the optimal gap is ~10-20% of the retention
  // horizon. With a 3-month horizon that is 9-18 days, so start at 9 rather
  // than 1 -- a 1-day first gap means the same words return every day and the
  // 250-word list never rotates. Cards the learner marks Again still come back
  // in minutes, which is where repetition is actually cheap.
  const FIRST_GAP_DAYS = 9;

  function newCard(id) {
    return {
      id: id,
      ease: 2.5,
      interval: 0,          // days
      due: 0,               // epoch ms
      reps: 0,
      lapses: 0,
      lastGrade: null,
      learnedAt: null
    };
  }

  function schedule(card, grade, now) {
    const g = GRADES[grade] || GRADES.good;
    const c = Object.assign(newCard(card.id), card);

    c.ease = Math.max(1.3, c.ease + g.easeDelta);
    c.reps = (c.reps || 0) + 1;
    c.lastGrade = grade;
    if (c.learnedAt === null) c.learnedAt = now;

    if (g.lapses) {
      c.lapses = (c.lapses || 0) + 1;
      c.interval = 0;
      c.due = now + RELEARNING_STEPS_MIN[0] * MIN;
      return c;
    }

    // First successful rep: graduate to a research-grounded gap rather than
    // 1 day, so the deck rotates through the 250 words instead of grinding
    // the first ten. Hard grades still compress it.
    if (c.interval === 0 && !c.lapses) {
      c.interval = grade === "easy" ? FIRST_GAP_DAYS * 1.35
        : grade === "hard" ? FIRST_GAP_DAYS * 0.6
        : FIRST_GAP_DAYS;
    } else {
      // SM-2 grows the interval multiplicatively by the ease factor. Dividing
      // by 2.5 here cancelled the factor out for a "good" grade and left the
      // interval creeping +1 day per rep -- a card would take ~170 reps to
      // reach the 180-day cap, so nothing ever left the short-term rotation.
      const factor = (grade === "hard" ? 1.2 : 1) * g.mult * c.ease;
      c.interval = Math.max(c.interval + 1, c.interval * factor);
    }

    // Gentle cap — a phone user reviews daily, not yearly.
    c.interval = Math.min(c.interval, 180);
    let minutes = c.interval * 24 * 60;
    if (c.lapses && minutes < 60) minutes = RELEARNING_STEPS_MIN[1] || 60;
    if (grade === "easy") minutes += EASY_BONUS * 24 * 60;
    c.due = now + minutes * MIN;
    return c;
  }

  function isDue(card, now) {
    return !card || card.due === undefined || card.due <= now;
  }

  /* Forecast: how many cards fall due over the next N days. */
  function forecast(cards, now, days) {
    const buckets = new Array(days).fill(0);
    (cards || []).forEach((c) => {
      if (!c || c.due === undefined) return;
      const d = Math.floor((c.due - now) / DAY);
      if (d < 0) buckets[0]++;
      else if (d < days) buckets[d]++;
    });
    return buckets;
  }

  /* Pick the next review: most overdue first, ties broken by lowest ease. */
  function nextDue(cards, now) {
    let best = null;
    let bestKey = -Infinity;   // must start below every candidate key
    (cards || []).forEach((c) => {
      if (!isDue(c, now)) return;
      const overdue = (now - (c.due || 0)) / DAY;
      const key = overdue * 10 - (c.ease || 2.5);
      if (key > bestKey) {
        bestKey = key;
        best = c;
      }
    });
    return best;
  }

  window.MP_SRS = {
    GRADES: GRADES,
    newCard: newCard,
    schedule: schedule,
    isDue: isDue,
    forecast: forecast,
    nextDue: nextDue,
    MIN: MIN,
    DAY: DAY
  };
})();