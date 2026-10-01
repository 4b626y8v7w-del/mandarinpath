/* Tracing-grader tests. Run: node test-trace.js
 *
 * The grader has to DISCRIMINATE, not just return a number. These cases use a
 * synthetic two-stroke reference (a cross: horizontal + vertical) so the right
 * answer is unambiguous by construction.
 */
const fs = require("fs");
const vm = require("vm");

const sandbox = { window: {}, console, Math, Set };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + "/trace-grade.js", "utf8"), sandbox);
const T = sandbox.window.MP_TRACE;

// Reference: 十 as a cross — horizontal (200,500)->(800,500), vertical
const REF = {
  count: 2,
  strokes: [
    { name: "横", pts: [[200, 500], [800, 500]] },
    { name: "竖", pts: [[500, 200], [500, 800]] }
  ]
};

const BOX = { x: 0, y: 0, w: 1000, h: 1000 };

// Perfect trace, drawn in canvas pixels matching the box exactly.
const perfect = [
  { pts: [[200, 500], [500, 500], [800, 500]] },
  { pts: [[500, 200], [500, 500], [500, 800]] }
];

// Same shape, jittered by ~25px — a realistic fingertip wobble.
const wobbly = [
  { pts: [[205, 512], [400, 492], [610, 515], [795, 498]] },
  { pts: [[512, 210], [492, 400], [515, 610], [498, 790]] }
];

// One stroke correct, one missing entirely ( drew only the 横 ).
const halfDone = [{ pts: [[200, 500], [500, 500], [800, 500]] }];

// A square in the corner — nothing like the reference.
const scribbleInCorner = [
  { pts: [[60, 60], [200, 60], [200, 200], [60, 200], [60, 60]] }
];

// A single dot.
const dot = [{ pts: [[500, 500]] }];

// Correct shape but drawn in the wrong quadrant of the box.
const wrongPlace = [
  { pts: [[100, 100], [250, 100], [400, 100]] },
  { pts: [[100, 100], [100, 250], [100, 400]] }
];

let fails = 0;
function check(label, actual, expected, cmp) {
  const ok = cmp ? cmp(actual, expected) : actual === expected;
  if (!ok) fails++;
  const shown = typeof actual === "number" ? actual.toFixed(3) : actual;
  console.log((ok ? "PASS  " : "FAIL  ") + label + ": " + shown);
}

const gPerfect = T.grade(perfect, REF, BOX);
const gWobbly = T.grade(wobbly, REF, BOX);
const gHalf = T.grade(halfDone, REF, BOX);
const gScribble = T.grade(scribbleInCorner, REF, BOX);
const gDot = T.grade(dot, REF, BOX);
const gWrong = T.grade(wrongPlace, REF, BOX);
const gEmpty = T.grade([], REF, BOX);

console.log("scores:");
console.log("  perfect      ", gPerfect.score.toFixed(3), gPerfect.verdict);
console.log("  wobbly       ", gWobbly.score.toFixed(3), gWobbly.verdict);
console.log("  half done    ", gHalf.score.toFixed(3), gHalf.verdict);
console.log("  corner square", gScribble.score.toFixed(3), gScribble.verdict);
console.log("  single dot   ", gDot.score.toFixed(3), gDot.verdict);
console.log("  wrong place  ", gWrong.score.toFixed(3), gWrong.verdict);
console.log("  empty        ", gEmpty.score.toFixed(3), gEmpty.verdict);

console.log("\ndiscrimination:");
// Both a clean trace and a realistically wobbly one are correct answers and
// must score equally high — the grader is not a handwriting-forensics tool.
check("wobbly scores as high as perfect", Math.abs(gWobbly.score - gPerfect.score) < 0.02, true,
  (a, e) => Math.abs(a - e) < 0.02);
check("wobbly still passes as great", gWobbly.verdict, "great");
check("perfect is great", gPerfect.verdict, "great");
check("half done scores below perfect", gHalf.score < gPerfect.score, true);
check("half done is not great", gHalf.verdict !== "great", true);
check("corner square is rejected", gScribble.verdict === "try-again", true);
check("single dot is rejected", gDot.verdict === "try-again", true);
check("wrong place is rejected", gWrong.verdict === "try-again", true);
check("empty is rejected", gEmpty.verdict, "empty");
check("empty scores zero", gEmpty.score, 0);
check("perfect scores high", gPerfect.score > 0.9, true);
check("perfect has no overflow", gPerfect.overflow < 0.05, true);
check("scribble has high overflow", gScribble.overflow > 0.8, true);
check("stroke counts reported", gPerfect.strokesDrawn + "," + gPerfect.strokesExpected, "2,2");
check("sparse tap across a stroke counts as covered", T.grade(
  [{ pts: [[200, 500], [800, 500]] }], { strokes: REF.strokes.slice(0, 1) }, BOX
).coverage > 0.95, true);

console.log("\nscale invariance (same trace, different canvas size):");
const smallBox = { x: 10, y: 10, w: 300, h: 300 };
const scaledStroke = (s) => ({ pts: s.pts.map(([x, y]) => [x * 0.3 + 10, y * 0.3 + 10]) });
const gSmall = T.grade(perfect.map(scaledStroke), REF, smallBox);
check("scores the same when scaled", Math.abs(gSmall.score - gPerfect.score) < 0.06, true,
  (a, e) => Math.abs(a - e) < 0.06);

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);