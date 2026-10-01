/* MandarinPath — freehand tracing grader.
 *
 * Scores a traced character by sampling the learner's ink and comparing it to
 * the reference strokes in a normalised 1000x1000 box (the same box the
 * stroke-order data uses). Two signals:
 *
 *   coverage — how much of the reference ink the learner actually passed over
 *              (ctx.isPointInStroke against each reference polyline)
 *   overflow — how much of their ink landed far away from any reference
 *              stroke (the "wrote it in the wrong place" penalty)
 *
 * Stroke ORDER is not graded. Detecting it reliably needs a recogniser, not
 * geometry, and a wrong order signal would teach the learner something false.
 * Order is taught by animation instead. This grades shape only, and says so.
 */
(function () {
  "use strict";

  const GRID = 1000;

  /* Shortest distance from point p to segment ab. */
  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function pointNearStrokes(x, y, strokes, tol) {
    for (const s of strokes) {
      const pts = s.pts;
      if (pts.length === 1) {
        if (Math.hypot(x - pts[0][0], y - pts[0][1]) <= tol) return true;
        continue;
      }
      for (let i = 1; i < pts.length; i++) {
        if (distToSegment(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= tol) return true;
      }
    }
    return false;
  }

  /* Sample evenly along each reference polyline and ask whether the learner
   * covered that spot. Coverage is the honest signal: it is what "did you
   * draw this stroke" means.
   *
   * Distance is measured to the learner's stroke SEGMENTS, not their vertices.
   * A learner who taps two points across a long horizontal has drawn that
   * stroke; testing only vertices left the middle uncovered, so adding points
   * (even in the wrong places) inflated the score. */
  function coverageOf(learnerStrokes, refStrokes, tol) {
    const learnerPts = flatten(learnerStrokes);
    const learnerSegs = [];
    for (const s of learnerStrokes) {
      for (let i = 1; i < s.pts.length; i++) {
        learnerSegs.push([s.pts[i - 1][0], s.pts[i - 1][1], s.pts[i][0], s.pts[i][1]]);
      }
      if (s.pts.length === 1) learnerSegs.push([s.pts[0][0], s.pts[0][1], s.pts[0][0], s.pts[0][1]]);
    }
    if (!learnerPts.length) return 0;

    const samples = [];
    refStrokes.forEach((s) => {
      const pts = s.pts;
      if (pts.length === 1) { samples.push([pts[0][0], pts[0][1]]); return; }
      for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0], ay = pts[i - 1][1];
        const bx = pts[i][0], by = pts[i][1];
        const segLen = Math.hypot(bx - ax, by - ay);
        const steps = Math.max(2, Math.ceil(segLen / 40));
        for (let k = 0; k < steps; k++) {
          const t = k / steps;
          samples.push([ax + t * (bx - ax), ay + t * (by - ay)]);
        }
      }
    });

    let hit = 0;
    for (const [x, y] of samples) {
      const near = learnerSegs.some(
        ([ax, ay, bx, by]) => distToSegment(x, y, ax, ay, bx, by) <= tol
      );
      if (near) hit++;
    }
    return samples.length ? hit / samples.length : 0;
  }

  /* Fraction of the learner's ink that strayed beyond tolerance of any
   * reference stroke. A correct character has very little. */
  function overflowOf(learnerStrokes, refStrokes, tol) {
    const pts = flatten(learnerStrokes);
    if (!pts.length) return 1;
    let stray = 0;
    for (const [x, y] of pts) {
      if (!pointNearStrokes(x, y, refStrokes, tol)) stray++;
    }
    return stray / pts.length;
  }

  function flatten(strokes) {
    const out = [];
    for (const s of strokes) for (const p of s.pts) out.push(p);
    return out;
  }

  /* Normalise canvas-space points into the 1000x1000 reference box. */
  function normalise(learnerStrokes, box) {
    const sx = GRID / box.w;
    const sy = GRID / box.h;
    return learnerStrokes.map((s) => ({
      pts: s.pts.map(([x, y]) => [
        Math.max(0, Math.min(GRID, (x - box.x) * sx)),
        Math.max(0, Math.min(GRID, (y - box.y) * sy))
      ])
    }));
  }

  /**
   * Grade one attempt.
   * @param learnerStrokes array of {pts:[[x,y],...]} in canvas CSS pixels
   * @param refChar        reference entry {strokes:[{pts:[[x,y],...]}], count}
   * @param box            {x,y,w,h} the square the glyph occupies
   * @returns {{score:number, coverage:number, overflow:number, verdict:string}}
   */
  function grade(learnerStrokes, refChar, box) {
    if (!learnerStrokes.length) {
      return { score: 0, coverage: 0, overflow: 1, verdict: "empty" };
    }
    const norm = normalise(learnerStrokes, box);
    const ref = refChar.strokes;
    // Tolerance scales with the box: 8% of the glyph is a forgiving brush
    // width, and anything tighter makes a fingertip feel hopeless on a phone.
    const tol = GRID * 0.085;

    const coverage = coverageOf(norm, ref, tol);
    const overflow = overflowOf(norm, ref, tol * 1.6);

    // Coverage dominates: drawing the right shape slightly off-centre should
    // pass, while filling the box correctly but off-target shape should not.
    const score = Math.max(0, Math.min(1, coverage * 1.0 - overflow * 0.45));

    let verdict;
    if (coverage >= 0.82 && overflow <= 0.22) verdict = "great";
    else if (coverage >= 0.62 && overflow <= 0.34) verdict = "good";
    else if (coverage >= 0.38) verdict = "close";
    else verdict = "try-again";

    return {
      score: score,
      coverage: coverage,
      overflow: overflow,
      verdict: verdict,
      strokesDrawn: norm.length,
      strokesExpected: ref.length
    };
  }

  const MESSAGES = {
    great: { text: "Well written", tone: "ok" },
    good: { text: "Good — shape is there", tone: "ok" },
    close: { text: "Close — follow the grey stroke", tone: "bad" },
    "try-again": { text: "Not yet — trace over the grey lines", tone: "bad" },
    empty: { text: "Trace the character first", tone: "bad" }
  };

  window.MP_TRACE = { grade: grade, GRID: GRID, MESSAGES: MESSAGES };
})();