/* ==========================================================================
   npm run measure
   --------------------------------------------------------------------------
   Renders one of every registry component at the real widget width and prints
   its measured height next to the height declared in renderer.js.

   Those declared heights are what the skeletons reserve. If a component's
   markup or the type scale changes and the number goes stale, the card no
   longer lands in the space its skeleton held — and a chat UI that reflows
   after a card arrives feels broken even when it is correct. So: measure,
   paste the numbers back, keep the delta near zero.

   Requires playwright (a devDependency, not a runtime one — the library
   itself still has zero dependencies).
   ========================================================================== */

const path = require("path");
const { chromium } = require("playwright");

const TOLERANCE = 24; // px — below this the gap is invisible

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  await page.goto("file://" + path.resolve(__dirname, "..", "index.html"));
  await page.waitForTimeout(1500);

  const rows = await page.evaluate(async () => {
    const Inv = window.DemoInventory;
    const probe = document.createElement("div");
    probe.className = "vt";
    probe.style.cssText =
      "position:absolute;left:-9999px;top:0;width:" +
      document.querySelector(".vt-thread").clientWidth + "px;";
    document.body.appendChild(probe);

    // One representative payload per component, sized like a realistic turn.
    const specs = {
      choice_chips: { options: [
        { label: "What's the payment?", value: "a" },
        { label: "Compare it", value: "b" },
        { label: "Book a ride", value: "c" }
      ]},
      unit_carousel: {
        title: "On the floor now",
        subtitle: "Tap one and I'll pull the numbers.",
        units: Inv.UNITS.slice(0, 4).map((u) => ({
          id: u.id, name: u.name, meta: u.meta, price: u.price,
          monthly: u.monthly, badge: u.badge, category: u.category, hue: u.hue
        }))
      },
      unit_compare: {
        title: "MT-09 · Z900",
        units: [{ id: "a", name: "Yamaha MT-09" }, { id: "b", name: "Kawasaki Z900" }],
        rows: [
          { label: "Engine", values: ["890cc triple", "948cc four"] },
          { label: "Seat height", values: ["32.5 in", "31.9 in"] },
          { label: "Weight", values: ["425 lb", "465 lb"] },
          { label: "Warranty", values: ["1 yr factory", "90 day"] },
          { label: "Est. payment", values: ["$189/mo", "$168/mo"], bestIndex: 1 }
        ]
      },
      finance_slider: {
        unitId: "mt09", unitName: "2026 Yamaha MT-09", price: 10999,
        apr: 8.99, termMonths: 60, downPayment: 1100, minDown: 0, maxDown: 5500,
        termOptions: [24, 36, 48, 60, 72],
        lenderNote: "Rate shown is a well-qualified tier example."
      },
      trade_in: {},
      schedule: {
        title: "Ride the MT-09",
        subtitle: "45 minutes. Bring a licence and we'll have it ready.",
        days: Inv.upcomingDays(5)
      },
      lead_capture: {
        title: "Where should we send the confirmation?",
        subtitle: "We'll have it out front and charged.",
        cta: "Confirm booking"
      },
      summary_receipt: {
        title: "You're booked",
        subtitle: "A text confirmation is on the way.",
        rows: [
          { label: "Unit", value: "2026 Yamaha MT-09" },
          { label: "When", value: "Mon Aug 4, 3:00 PM" },
          { label: "Name", value: "Alex Moreno" },
          { label: "Mobile", value: "(555) 012-8899" }
        ]
      }
    };

    const ctx = { emit() {}, setState() {}, state: {} };
    const out = [];
    for (const [name, props] of Object.entries(specs)) {
      probe.textContent = "";
      const node = window.VitrineRenderer.render({ component: name, props }, ctx);
      if (!node) { out.push({ name, actual: null, declared: null }); continue; }
      node.classList.remove("vt-enter");   // the entrance transform skews the box
      probe.appendChild(node);
      await new Promise((r) => requestAnimationFrame(r));
      const spec = window.VitrineRenderer.heights[name];
      out.push({
        name,
        instant: !!spec.instant,
        actual: Math.ceil(node.getBoundingClientRect().height),
        declared: spec.height
      });
    }
    probe.remove();
    return out;
  });

  let stale = 0;
  console.log("\n  component          declared   actual    delta");
  console.log("  " + "─".repeat(46));
  rows.forEach((r) => {
    if (r.actual === null) { console.log(`  ${r.name.padEnd(17)}   (failed to render)`); stale++; return; }
    if (r.instant) { console.log(`  ${r.name.padEnd(17)}   instant — renders without a skeleton`); return; }
    const d = r.actual - r.declared;
    const bad = Math.abs(d) > TOLERANCE;
    if (bad) stale++;
    console.log(
      `  ${r.name.padEnd(17)} ${String(r.declared).padStart(8)} ${String(r.actual).padStart(8)} ` +
      `${String(d > 0 ? "+" + d : d).padStart(8)}${bad ? "   ← update renderer.js" : ""}`
    );
  });
  console.log();

  await browser.close();
  process.exit(stale ? 1 : 0);
})();
