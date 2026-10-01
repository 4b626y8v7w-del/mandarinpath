/* Scheduler sanity check — run with: node test-srs.js */
const fs = require("fs");
const vm = require("vm");

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + "/srs.js", "utf8"), sandbox);
const SRS = sandbox.window.MP_SRS;

const DAY = 86400000;
const N = Date.now();
const days = (c) => (c.due - N) / DAY;   // numeric, so comparisons below are real

let fails = 0;
function check(label, actual, expected, cmp) {
  const ok = cmp ? cmp(actual, expected) : actual === expected;
  if (!ok) fails++;
  console.log((ok ? "PASS  " : "FAIL  ") + label + ": " + actual +
    (ok ? "" : "  (expected " + expected + ")"));
}

const base = SRS.newCard("x");
console.log("first gaps:");
check("again -> 10 min relearn", SRS.schedule(base, "again", N).due - N, 10 * 60000);
check("hard  first gap >=5d", days(SRS.schedule(base, "hard", N)) >= 5, true);
check("good  first gap in 9-18d", days(SRS.schedule(base, "good", N)) >= 9 &&
  days(SRS.schedule(base, "good", N)) <= 18, true);
check("easy  first gap > good", days(SRS.schedule(base, "easy", N)) >
  days(SRS.schedule(base, "good", N)), true);

console.log("\nspacing growth (all good):");
let c = SRS.newCard("y");
const chain = [];
for (let i = 0; i < 6; i++) {
  c = SRS.schedule(c, "good", N);
  chain.push(c.interval.toFixed(1));
}
console.log("  " + chain.join(" -> "));
check("interval grows", c.interval > SRS.schedule(SRS.newCard("y"), "good", N).interval, true);
check("capped at 180", c.interval <= 180, true);
check("ease never below 1.3",
  Array.from({ length: 12 }).reduce((acc) => SRS.schedule(acc, "again", N), SRS.newCard("z")).ease >= 1.3, true);

console.log("\nqueue behaviour:");
const now = Date.now();
const cards = [
  { id: "due-overdue", ease: 2.5, interval: 3, due: now - 5 * DAY, reps: 3, lapses: 0 },
  { id: "due-soon", ease: 2.5, interval: 3, due: now - 1 * DAY, reps: 3, lapses: 0 },
  { id: "not-due", ease: 2.5, interval: 3, due: now + 5 * DAY, reps: 3, lapses: 0 }
];
const pick = SRS.nextDue(cards, now);
check("nextDue returns a due card", pick !== null, true);
check("nextDue skips not-due cards", pick && pick.id !== "not-due", true);
check("nextDue picks most overdue", pick && pick.id, "due-overdue");
const fc = SRS.forecast(cards, now, 7);
check("forecast counts overdue in bucket 0", fc[0], 2);

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);