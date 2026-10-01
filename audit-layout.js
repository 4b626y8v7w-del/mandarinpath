/* Layout audit across real device sizes. Injected in the browser.
 *
 * Walks every screen at the current viewport and reports anything clipped,
 * overflowing, or unreachable. Run by the browser harness after
 * Emulation.setDeviceMetricsOverride.
 */
window.MP_AUDIT = function () {
  function vis() {
    const s = [...document.querySelectorAll(".screen")].filter((x) => !x.hidden);
    return s[0] ? s[0].id : "none";
  }
  function click(sel) {
    const b = document.querySelector(sel);
    if (b) { b.click(); return true; }
    return false;
  }

  function auditScreen(id) {
    const sc = document.getElementById(id);
    const issues = [];

    if (!sc) return ["missing screen " + id];

    // Children spilling below the fold.
    [...sc.children].forEach((c) => {
      const r = c.getBoundingClientRect();
      if (r.height > 0 && r.bottom > innerHeight + 1) {
        issues.push((c.className || c.tagName) + " overflows bottom by " + Math.round(r.bottom - innerHeight));
      }
    });

    // Anything wider than the viewport.
    [...sc.querySelectorAll("*")].forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)) {
        issues.push("x-overflow " + (e.tagName + "." + e.className).slice(0, 40));
      }
    });

    // Interactive controls too small to hit reliably.
    [...sc.querySelectorAll("button")].forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.height > 0 && r.height < 24) {
        issues.push("tiny target " + (b.id || b.className) + " h=" + Math.round(r.height));
      }
    });

    // Interactive controls with no accessible name.
    [...sc.querySelectorAll("button")].forEach((b) => {
      const name = (b.textContent || "").trim() || b.getAttribute("aria-label") || b.getAttribute("title");
      if (!name) issues.push("no accessible name: " + (b.id || b.className));
    });

    return issues.slice(0, 6);
  }

  return function run() {
    const W = innerWidth, H = innerHeight;
    const report = { viewport: W + "x" + H, screens: {}, modeCounts: {} };

    const screens = ["screenSplash", "screenOnboard", "screenMain", "screenLesson",
      "screenReview", "screenFlip", "screenCards", "screenTones", "screenTrace", "screenComplete"];

    // Learn + practice + progress tabs on the main screen.
    document.getElementById("screenSplash").hidden = false;
    document.getElementById("screenMain").hidden = true;
    report.screens.screenSplash = auditScreen("screenSplash");

    click("#btnStart");
    report.screens.screenOnboard = auditScreen("screenOnboard");
    click("#btnSkipOnboard");

    ["learn", "practice", "progress"].forEach((t) => {
      click('.tab[data-goto=' + t + "]");
      report.screens["main:" + t] = auditScreen("screenMain");
    });

    // Practice modes
    click('.tab[data-goto=practice]');
    report.modeCounts.modeCards = document.querySelectorAll(".mode-cards .mode-card").length;

    const nb = document.querySelector(".node-btn.unlocked, .node-btn.current");
    if (nb) { nb.click(); report.screens.screenLesson = auditScreen("screenLesson"); click("#btnCloseLesson"); }

    click("#modeReview");
    if (vis() === "screenReview") report.screens.screenReview = auditScreen("screenReview");
    click("#btnCloseReview");

    click("#modeTones");
    if (vis() === "screenTones") report.screens.screenTones = auditScreen("screenTones");
    click("#btnCloseTones");

    click("#modeWrite");
    if (vis() === "screenTrace") report.screens.screenTrace = auditScreen("screenTrace");
    click("#btnCloseTrace");

    click("#modeFlip");
    if (vis() === "screenFlip") report.screens.screenFlip = auditScreen("screenFlip");
    click("#btnCloseFlip");

    click(".deck-card");
    if (vis() === "screenCards") report.screens.screenCards = auditScreen("screenCards");
    click("#btnCloseCards");

    // Document must never scroll: the app owns the viewport.
    report.documentScrolls = document.documentElement.scrollHeight > innerHeight + 1;
    report.totalIssues = Object.values(report.screens).reduce((n, a) => n + a.length, 0);
    return report;
  };
}();
"AUDIT ready";