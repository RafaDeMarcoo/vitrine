/* ==========================================================================
   npm run audit
   --------------------------------------------------------------------------
   Measures the running widget against the four rules stated at the top of
   src/vitrine.css and exits non-zero if any of them is broken.

   The point is that "looks Apple" stops being an opinion. Every rule here is
   a number, the browser reports the number, and a regression fails CI instead
   of quietly shipping. The first run of this script found six violations in a
   UI that looked fine, including secondary text at 3.44:1 in a project whose
   headline feature is a contrast gate.

     TYPE      the type scale only, no fractional sizes
     SPACING   UISpacing: spaceUnit 16 in quarters (4/8/12/16/20/24/32)
     TARGETS   44×44pt minimum on everything interactive
     CONTRAST  every text colour ≥ 4.5:1 against its surface

   Requires playwright (a devDependency; the library itself has none).
   ========================================================================== */

const path = require("path");
const { chromium } = require("playwright");

// The project's own scale, not Apple's. The audit enforces whatever
// system the project declares — the point is that a system is declared.
const SCALE = [12, 14, 16, 18, 20, 23, 24, 32, 36, 40, 45, 56];
const GRID = 4;          // UISpacing steps in quarters of a 16pt unit
const TAP = 44;
const AA = 4.5;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e.message)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // A blocked or offline image CDN is not a defect in this code — the demo
    // hot-links its photos and is built to fall back. Script errors still count.
    if (/Failed to load resource/i.test(m.text())) return;
    consoleErrors.push(m.text());
  });

  await page.goto("file://" + path.resolve(__dirname, "..", "index.html"));
  await page.waitForTimeout(1800);

  // Drive the widget until every component type is on screen — auditing an
  // empty thread proves nothing.
  await page.click(".vt-sugg >> nth=0");            await page.waitForTimeout(2600);
  await page.locator(".vt-unit").first().click();   await page.waitForTimeout(2600);
  await page.locator(".vt-composer textarea").fill("what are the payments?");
  await page.keyboard.press("Enter");               await page.waitForTimeout(3000);
  await page.locator(".vt-composer textarea").fill("book a test ride");
  await page.keyboard.press("Enter");               await page.waitForTimeout(2600);

  const r = await page.evaluate(({ SCALE, GRID, TAP, AA }) => {
    const root = document.querySelector(".vt");
    const out = { targets: [], type: [], spacing: [], contrast: [], sizes: {} };

    const lum = (c) => {
      const m = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    // Walk up for the nearest painted background — text sits on whatever
    // ancestor actually has a colour, not on the body.
    const bgOf = (n) => {
      let e = n;
      while (e && e !== document.documentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        e = e.parentElement;
      }
      return "rgb(255,255,255)";
    };

    root.querySelectorAll("button, input, textarea, [role=button], [role=slider], a[href]").forEach((n) => {
      const b = n.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (b.height < TAP - 0.5 || b.width < TAP - 0.5) {
        out.targets.push((n.className || n.tagName) + " " + b.width.toFixed(0) + "×" + b.height.toFixed(0));
      }
      const label = (n.getAttribute("aria-label") || n.textContent || n.placeholder || "").trim();
      if (!label) out.targets.push("UNLABELLED " + (n.className || n.tagName));
    });

    root.querySelectorAll("*").forEach((n) => {
      const cs = getComputedStyle(n);

      const hasOwnText = Array.from(n.childNodes).some((c) => c.nodeType === 3 && c.textContent.trim());
      if (hasOwnText) {
        const fs = parseFloat(cs.fontSize);
        out.sizes[fs] = (out.sizes[fs] || 0) + 1;
        if (fs % 1 !== 0 || SCALE.indexOf(fs) === -1) {
          out.type.push(fs + "px on ." + (n.className || n.tagName));
        }
        const cr = ratio(cs.color, bgOf(n));
        if (cr < AA) out.contrast.push("." + (n.className || n.tagName) + " " + cr.toFixed(2) + ":1 at " + fs + "px");
      }

      ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
       "marginTop", "marginBottom", "gap", "rowGap", "columnGap"].forEach((k) => {
        const v = parseFloat(cs[k]);
        if (v && !isNaN(v) && v % GRID !== 0) out.spacing.push(k + ":" + v + "px on ." + (n.className || n.tagName));
      });
    });

    const uniq = (a) => Array.from(new Set(a));
    out.type = uniq(out.type); out.spacing = uniq(out.spacing);
    out.contrast = uniq(out.contrast); out.targets = uniq(out.targets);
    return out;
  }, { SCALE, GRID, TAP, AA });

  await browser.close();

  const section = (name, rule, fails) => {
    const ok = fails.length === 0;
    console.log("\n  " + (ok ? "PASS" : "FAIL") + "  " + name.padEnd(10) + rule);
    if (!ok) fails.slice(0, 10).forEach((f) => console.log("          · " + f));
    if (fails.length > 10) console.log("          … and " + (fails.length - 10) + " more");
    return ok;
  };

  console.log("\n  Vitrine UI — design system audit");
  console.log("  " + "─".repeat(64));
  const results = [
    section("TARGETS", "44×44pt minimum, everything labelled", r.targets),
    section("TYPE", "type scale only, no fractional sizes", r.type),
    section("SPACING", "4pt grid", r.spacing),
    section("CONTRAST", "all text ≥ 4.5:1 against its own background", r.contrast),
    section("RUNTIME", "no console errors during the funnel", consoleErrors)
  ];

  console.log("\n  type scale in use: " +
    Object.keys(r.sizes).map(Number).sort((a, b) => b - a).map((s) => s + "px×" + r.sizes[s]).join("  "));
  console.log();

  process.exit(results.every(Boolean) ? 0 : 1);
})();
