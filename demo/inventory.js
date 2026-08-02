/* ==========================================================================
   Demo inventory for a powersports / marine / RV dealership.
   --------------------------------------------------------------------------
   Fictional units at plausible prices. In production this is the dealer's
   feed; the shape below is what the adapter has to produce, and nothing in
   src/ knows where it came from.
   ========================================================================== */

(function (global) {
  "use strict";

  const UNITS = [
    { id: "mt09",  name: "2026 Yamaha MT-09",        category: "moto",   price: 10999, monthly: 189, meta: "890cc · new · 0 mi",        badge: "New",     hue: 208, cc: 890,  seats: 2, tags: ["moto","street","commuter","fast","cheap"] },
    { id: "z900",  name: "2025 Kawasaki Z900",       category: "moto",   price:  9799, monthly: 168, meta: "948cc · used · 3,120 mi",   badge: "Certified", hue: 128, cc: 948, seats: 2, tags: ["moto","street","commuter","fast","cheap"] },
    { id: "v7",    name: "2024 Moto Guzzi V7 Stone", category: "moto",   price:  8450, monthly: 145, meta: "853cc · used · 5,870 mi",   hue: 22,  cc: 853,  seats: 2, tags: ["moto","street","retro","cheap"] },
    { id: "gsa",   name: "2025 BMW R 1300 GS",       category: "moto",   price: 21995, monthly: 372, meta: "1300cc · new · 0 mi",       badge: "Flagship", hue: 196, cc: 1300, seats: 2, tags: ["moto","touring","adventure"] },

    { id: "rzr",   name: "2026 Polaris RZR Pro R",   category: "atv",    price: 34999, monthly: 589, meta: "2000cc · new · 4-seat",     badge: "New",     hue: 14,  cc: 2000, seats: 4, tags: ["atv","offroad","family","trail"] },
    { id: "mav",   name: "2024 Can-Am Maverick X3",  category: "atv",    price: 26400, monthly: 447, meta: "900cc turbo · used · 610 h", hue: 40,  cc: 900,  seats: 2, tags: ["atv","offroad","trail"] },

    { id: "bow21", name: "2025 Bayliner VR5 Bowrider", category: "boat", price: 41900, monthly: 498, meta: "21 ft · 200 hp · 8 people", badge: "Popular", hue: 202, seats: 8, tags: ["boat","family","lake","water"] },
    { id: "pont",  name: "2026 Bennington 22 SVL",   category: "boat",   price: 58750, monthly: 691, meta: "22 ft pontoon · 10 people", hue: 178, seats: 10, tags: ["boat","family","lake","pontoon","water"] },
    { id: "wake",  name: "2024 Malibu Wakesetter",   category: "boat",   price: 96500, monthly: 1128, meta: "23 ft · surf system · 12", badge: "Premium", hue: 220, seats: 12, tags: ["boat","wake","water","fast"] },

    { id: "ski",   name: "2026 Sea-Doo GTI SE 170",  category: "jetski", price: 12199, monthly: 209, meta: "170 hp · new · 3-seat",     badge: "New",     hue: 344, seats: 3, tags: ["jetski","water","fast","cheap"] },

    { id: "tt25",  name: "2025 Grand Design Imagine", category: "rv",    price: 42800, monthly: 389, meta: "25 ft travel trailer · 6",  hue: 32,  seats: 6, tags: ["rv","family","travel","trailer"] },
    { id: "cls",   name: "2024 Winnebago Solis 59P", category: "rv",     price: 89900, monthly: 792, meta: "Class B camper van · 4",    badge: "Certified", hue: 96, seats: 4, tags: ["rv","travel","van","couple"] }
  ];

  const SPECS = {
    mt09:  { "Engine": "890cc triple", "Seat height": "32.5 in", "Weight": "425 lb", "Warranty": "1 yr factory", "Est. payment": "$189/mo" },
    z900:  { "Engine": "948cc four",  "Seat height": "31.9 in", "Weight": "465 lb", "Warranty": "90 day", "Est. payment": "$168/mo" },
    v7:    { "Engine": "853cc twin",  "Seat height": "30.7 in", "Weight": "492 lb", "Warranty": "90 day", "Est. payment": "$145/mo" },
    gsa:   { "Engine": "1300cc boxer","Seat height": "33.5 in", "Weight": "523 lb", "Warranty": "3 yr factory", "Est. payment": "$372/mo" },
    rzr:   { "Engine": "2000cc four", "Seats": "4", "Suspension": "29 in travel", "Warranty": "1 yr factory", "Est. payment": "$589/mo" },
    mav:   { "Engine": "900cc turbo", "Seats": "2", "Suspension": "22 in travel", "Warranty": "90 day", "Est. payment": "$447/mo" },
    bow21: { "Length": "21 ft", "Power": "200 hp", "Capacity": "8 people", "Trailer": "Included", "Est. payment": "$498/mo" },
    pont:  { "Length": "22 ft", "Power": "150 hp", "Capacity": "10 people", "Trailer": "Optional", "Est. payment": "$691/mo" },
    wake:  { "Length": "23 ft", "Power": "450 hp", "Capacity": "12 people", "Trailer": "Included", "Est. payment": "$1,128/mo" },
    ski:   { "Power": "170 hp", "Capacity": "3 people", "Fuel": "15.9 gal", "Trailer": "Optional", "Est. payment": "$209/mo" },
    tt25:  { "Length": "25 ft", "Sleeps": "6", "Dry weight": "5,700 lb", "Warranty": "1 yr", "Est. payment": "$389/mo" },
    cls:   { "Length": "19.7 ft", "Sleeps": "4", "Drivetrain": "AWD", "Warranty": "3 yr", "Est. payment": "$792/mo" }
  };

  function byId(id) { return UNITS.filter((u) => u.id === id)[0]; }

  /**
   * Pull a budget out of free text — but only when the number is actually
   * behaving like a budget. A bare four-digit number is far more likely to be
   * a model year ("2024 Moto Guzzi") than a price, and reading it as a budget
   * produces the memorably wrong "four that land under $2024".
   */
  function parseBudget(text) {
    const q = String(text || "").toLowerCase();
    const m = q.match(/(?:\$|under|below|max(?:imum)?|up to|less than|around|about)\s*\$?\s*(\d[\d,]*)\s*(k\b)?/);
    if (!m) return null;
    let n = Number(m[1].replace(/,/g, ""));
    if (m[2]) n *= 1000;                    // "under 12k"
    if (n < 500) return null;               // "under 5 people" is not a budget
    const hadDollar = /\$\s*\d/.test(q);
    if (!hadDollar && n >= 1900 && n <= 2100) return null;  // a model year
    return n;
  }

  const STOP = ("the and for with that this what are you can our all any one two get has its " +
    "show them more about like want need would could tell give here have from")
    .split(" ");

  // Strip punctuation before matching so "MT-09" finds "mt09" inside
  // "2026 Yamaha MT-09". Hyphenated model names are the single most common
  // thing a naive tokenizer gets wrong in this vertical.
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

  function search(text, limit) {
    const q = String(text || "").toLowerCase();
    const budget = parseBudget(q);

    const words = q.split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]+/g, ""))
      .filter((t) => t.length >= 3 && STOP.indexOf(t) === -1);

    const scored = UNITS.map((u) => {
      let score = 0;
      const hay = norm(u.name + " " + u.category + " " + u.tags.join(" "));
      words.forEach((w) => {
        if (hay.indexOf(w) !== -1) score += 3;
      });
      if (budget) {
        if (u.price <= budget) score += 4;
        else score -= Math.min(6, (u.price - budget) / budget * 8);
      }
      if (/\b(cheap|affordable|budget|entry)\b/.test(q) && u.price < 13000) score += 3;
      if (/\b(famil|kids|everyone|group)\b/.test(q) && (u.seats || 0) >= 6) score += 3;
      return { u: u, score: score };
    });

    scored.sort((a, b) => b.score - a.score || a.u.price - b.u.price);
    const top = scored.filter((s) => s.score > 0);
    return (top.length ? top : scored).slice(0, limit || 4).map((s) => s.u);
  }

  /** Next `n` business-ish days, rendered for the schedule component. */
  function upcomingDays(n) {
    const out = [];
    const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const base = new Date();
    let added = 0, i = 1;
    while (added < (n || 5) && i < 21) {
      const d = new Date(base.getTime() + i * 86400000);
      i++;
      if (d.getDay() === 0) continue; // closed Sundays
      const slots = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM"].map((t, k) => ({
        time: t,
        // Deterministic "taken" pattern: the diary looks lived-in, and it
        // looks identical on every load. Screenshots and tests need that.
        taken: ((d.getDate() + k) % 5) === 0
      }));
      out.push({
        date: dows[d.getDay()] + " " + months[d.getMonth()] + " " + d.getDate(),
        dow: dows[d.getDay()],
        dnum: String(d.getDate()),
        slots: slots
      });
      added++;
    }
    return out;
  }

  global.DemoInventory = { UNITS, SPECS, byId, search, upcomingDays, parseBudget };
})(typeof window !== "undefined" ? window : globalThis);
