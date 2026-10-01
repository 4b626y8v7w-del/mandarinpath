/* Orientation test for the stroke data.
 *
 * A vertically-mirrored stroke file passes format validation and
 * ctx.isPointInStroke (both are mirror-symmetric) and only fails visually.
 * This asserts the geometric conventions instead, so a mirrored build breaks
 * a test rather than shipping silently.
 */
const fs = require("fs");
const vm = require("vm");

const sb = { window: {}, console, Math, Set };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(__dirname + "/strokes-data.js", "utf8"), sb);
const S = sb.window.MP_STROKES;

let fails = 0;
function check(label, ok, detail) {
  if (!ok) { fails++; console.log("FAIL  " + label + (detail ? "  " + detail : "")); }
  else console.log("PASS  " + label);
}

// Traversal direction per stroke name.
const DESCENDING = ["竖", "撇", "捺", "点", "弯钩", "斜钩", "竖钩", "竖弯", "撇折", "撇点", "斜钩"];

function endpoints(stroke) {
  return [stroke.pts[0], stroke.pts[stroke.pts.length - 1]];
}

let verticalChecked = 0, horizontalChecked = 0, wrongDir = [];

Object.keys(S).forEach((ch) => {
  S[ch].strokes.forEach((st, i) => {
    const [a, b] = endpoints(st);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const name = st.name;

    // Vertical-descending strokes must go top -> bottom (increasing y).
    if (/^(竖|撇|捺|斜钩)/.test(name) && Math.abs(dy) > 40) {
      verticalChecked++;
      if (dy < 0) wrongDir.push(ch + " stroke " + i + " " + name + " runs bottom-to-top (dy=" + Math.round(dy) + ")");
    }
    // Pure 横 must go left -> right (increasing x).
    // Compounds deliberately excluded: 横折 turns downward, 横撇 ends by
    // falling to the LEFT, and both are correct.
    if (name === "横" && Math.abs(dx) > 40) {
      horizontalChecked++;
      if (dx < 0) wrongDir.push(ch + " stroke " + i + " " + name + " runs right-to-left (dx=" + Math.round(dx) + ")");
    }
  });
});

check("vertical strokes descend (" + verticalChecked + " checked)", wrongDir.filter((w) => /top/.test(w)).length === 0,
  wrongDir.filter((w) => /top/.test(w)).slice(0, 3).join(" | "));
check("horizontal strokes run left-to-right (" + horizontalChecked + " checked)", wrongDir.filter((w) => /left/.test(w)).length === 0,
  wrongDir.filter((w) => /left/.test(w)).slice(0, 3).join(" | "));

// Mirror detection: a mirrored build would make 捺/丿 slope the wrong way.
// 捺 (right-falling) must end lower-right of its start; 撇 (left-falling)
// must end lower-left.
let fallingChecked = 0;
const fallBad = [];
Object.keys(S).forEach((ch) => {
  S[ch].strokes.forEach((st, i) => {
    const [a, b] = endpoints(st);
    if (st.name === "捺" && Math.abs(b[0] - a[0]) > 40) {
      fallingChecked++;
      if (b[0] < a[0]) fallBad.push(ch + "#" + i + " 捺 goes left");
    }
    if (st.name === "撇" && Math.abs(b[0] - a[0]) > 40) {
      fallingChecked++;
      if (b[0] > a[0]) fallBad.push(ch + "#" + i + " 撇 goes right");
    }
  });
});
check("捺/撇 slope directions correct (" + fallingChecked + " checked)", fallBad.length === 0,
  fallBad.slice(0, 3).join(" | "));

// Sanity: a glyph should have real extent. Single-stroke characters are
// legitimately flat (一 is one horizontal line, 62px tall), so the height
// floor only applies once a character has 2+ strokes.
let empty = [];
Object.keys(S).forEach((ch) => {
  const ys = [], xs = [];
  S[ch].strokes.forEach((st) => st.pts.forEach((p) => { xs.push(p[0]); ys.push(p[1]); }));
  if (!xs.length) { empty.push(ch + " (no points)"); return; }
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const multi = S[ch].strokes.length > 1;
  if (w < 100 || (multi && h < 100)) {
    empty.push(ch + " extent " + Math.round(w) + "x" + Math.round(h) +
      " (" + S[ch].strokes.length + " strokes)");
  }
});
check("every glyph has real extent", empty.length === 0, empty.join(" | "));

console.log(fails === 0 ? "\nALL PASS — data is upright" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);