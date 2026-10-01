/* Verifies the generated curriculum. Run: node check-curriculum.js
 *
 * Guards the properties the app depends on: every quiz has the answer among
 * its options, no duplicate options, every exercise is a type the renderer
 * knows, and the sentence unit actually produced lessons.
 */
const fs = require("fs");
const vm = require("vm");

const sb = { window: {}, console, Math, Set, JSON };
vm.createContext(sb);
["vocab-data.js", "sentences-data.js", "data.js"].forEach((f) =>
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), sb)
);
const M = sb.window.MP;

let fails = 0;
function fail(m) { fails++; console.log("FAIL  " + m); }

const KNOWN_TYPES = new Set([
  "teach", "mc", "listen", "tiles", "speakBack", "toneSet", "tricky", "phrase", "sentence"
]);

console.log("units: " + M.UNITS.length);
let totalLessons = 0;
let totalEx = 0;

M.UNITS.forEach((u) => {
  if (!u.lessons.length) fail(u.id + " has no lessons");
  let ids = new Set();
  u.lessons.forEach((l) => {
    totalLessons++;
    if (ids.has(l.id)) fail("duplicate lesson id " + l.id);
    ids.add(l.id);
    if (!l.exercises || !l.exercises.length) fail(l.id + " has no exercises");
    (l.exercises || []).forEach((ex, i) => {
      totalEx++;
      if (!KNOWN_TYPES.has(ex.type)) fail(l.id + " ex#" + i + " unknown type " + ex.type);
      if (ex.options) {
        if (new Set(ex.options).size !== ex.options.length) {
          fail(l.id + " ex#" + i + " duplicate options: " + JSON.stringify(ex.options));
        }
        if (!ex.options.includes(ex.answer)) {
          fail(l.id + " ex#" + i + " answer missing from options: " + ex.answer);
        }
        if (ex.options.length < 2) fail(l.id + " ex#" + i + " only " + ex.options.length + " options");
      }
      if (ex.type === "sentence" && !ex.en) fail(l.id + " sentence has no English");
      if ((ex.type === "phrase" || ex.type === "tricky") && !ex.zh) fail(l.id + " missing zh");
    });
  });
  console.log("  " + u.id + " (" + u.kind + "): " + u.lessons.length + " lessons");
});

console.log("total lessons: " + totalLessons + " | total exercises: " + totalEx);

const sentenceUnit = M.UNITS.find((u) => u.kind === "sentences");
if (!sentenceUnit) fail("no sentence unit");
else {
  const n = sentenceUnit.lessons.reduce((a, l) => a + l.exercises.length, 0);
  console.log("sentence unit: " + sentenceUnit.lessons.length + " lessons, " + n + " exercises");
  if (sentenceUnit.lessons.length < 3) fail("sentence unit too small");
}

// Lesson ids must form a total order for the unlock chain.
const flat = M.UNITS.flatMap((u) => u.lessons.map((l) => l.id));
if (new Set(flat).size !== flat.length) fail("lesson ids are not unique across units");

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " PROBLEMS");
process.exit(fails === 0 ? 0 : 1);