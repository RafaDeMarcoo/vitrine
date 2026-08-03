/* ==========================================================================
   Vitrine — theming
   --------------------------------------------------------------------------
   White-label in five tokens: accent, ink, radius, font, logo.

   Five rather than four because a real design system needed the fifth. A
   high-chroma accent only works with a specific dark neutral on top of it,
   and that neutral is part of the brand, not a host decision.

   The tenant does not get a CSS editor. They get four knobs, and every knob
   is validated before it is applied. This is the difference between a
   design system that survives fifty brands and a support queue.

   The interesting part is the accent. A tenant will eventually hand you a
   corporate yellow, and if you apply it naively you ship an unreadable
   product with their logo on it. So the accent goes through a contrast gate:
   we pick black or white text for on-accent surfaces by measured contrast,
   and we darken (or in dark mode, lighten) the accent until text sitting on
   the page surface clears WCAG AA. The tenant's brand colour still reads as
   their brand; it just stops being illegible.
   ========================================================================== */

(function (global) {
  "use strict";

  /* ---- colour plumbing ------------------------------------------------ */

  function hexToRgb(hex) {
    let h = String(hex).trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function rgbToHex(c) {
    const f = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return "#" + f(c.r) + f(c.g) + f(c.b);
  }

  // WCAG 2.1 relative luminance.
  function luminance(c) {
    const ch = [c.r, c.g, c.b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function mix(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
  }

  const WHITE = { r: 255, g: 255, b: 255 };
  const BLACK = { r: 0, g: 0, b: 0 };

  /**
   * Nudge an accent toward black (light mode) or white (dark mode) until text
   * in that colour clears `target` against the page surface. Steps of 4% —
   * fine enough that the brand is still recognisably itself.
   */
  function ensureReadable(accent, surface, target, towards) {
    let out = accent;
    for (let i = 0; i <= 25; i++) {
      if (contrast(out, surface) >= target) return { color: out, steps: i };
      out = mix(accent, towards, (i + 1) * 0.04);
    }
    return { color: out, steps: 25, exhausted: true };
  }

  /* ---- the public API -------------------------------------------------- */

  const PRESETS = {
    spoken: {
      label: "Spoken",
      accent: "#e8d83f",
      accentText: "#886c2c",
      ink: "#222631",
      radius: 8,
      font: 'Archivo, "Archivo Condensed", -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif',
      logoText: "N"
    },
    harbour: {
      label: "Harbour",
      accent: "#006680",          // Spoken's secondary
      ink: "#101d24",
      radius: 4,
      font: 'Archivo, "Archivo Condensed", -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif',
      logoText: "H"
    },
    violet: {
      label: "Violet",
      accent: "#8234c5",          // Spoken's tertiary
      ink: "#1d162a",
      radius: 16,
      font: 'Archivo, "Archivo Condensed", -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif',
      logoText: "V"
    },
    // Deliberately broken: a tenant hands you a pale brand colour and expects
    // it to work as text. Pick it and watch the gate refuse to ship it.
    pale: {
      label: "Pale (bad accent)",
      accent: "#ffd60a",
      ink: "#2b2a1f",
      radius: 8,
      font: 'Archivo, "Archivo Condensed", -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif',
      logoText: "P"
    }
  };

  /**
   * Apply a tenant theme to a root element.
   * @returns {{applied:object, report:Array<{check:string,status:string,detail:string}>}}
   */
  function apply(root, theme, scheme) {
    const report = [];
    const isDark = scheme === "dark";
    const surface = isDark ? { r: 26, g: 29, b: 30 } : WHITE;

    /* --- accent --- */
    let accent = hexToRgb(theme.accent);
    if (!accent) {
      report.push({ check: "accent", status: "FAIL", detail: "'" + theme.accent + "' is not a hex colour — falling back to the default" });
      accent = hexToRgb(PRESETS.spoken.accent);
    }

    const rawRatio = contrast(accent, surface);
    const suppliedAccentText = hexToRgb(theme.accentText);
    const suppliedRatio = suppliedAccentText ? contrast(suppliedAccentText, surface) : 0;
    const fixed = suppliedAccentText && suppliedRatio >= 4.5
      ? { color: suppliedAccentText, steps: 0, supplied: true }
      : ensureReadable(accent, surface, 4.5, isDark ? WHITE : BLACK);

    if (fixed.supplied) {
      report.push({
        check: "accent on surface",
        status: "ADJUSTED",
        detail: "brand " + rawRatio.toFixed(2) + ":1 was below AA; accessible token " +
                rgbToHex(fixed.color) + " selected at " + suppliedRatio.toFixed(2) + ":1. Fills keep the original."
      });
    } else if (fixed.steps === 0) {
      report.push({ check: "accent on surface", status: "PASS", detail: "contrast " + rawRatio.toFixed(2) + ":1 (AA needs 4.5)" });
    } else if (fixed.exhausted) {
      report.push({ check: "accent on surface", status: "FAIL", detail: "could not reach 4.5:1 — accent text disabled, marks only" });
    } else {
      report.push({
        check: "accent on surface",
        status: "ADJUSTED",
        detail: "brand " + rawRatio.toFixed(2) + ":1 was below AA; darkened " + (fixed.steps * 4) + "% to " +
                contrast(fixed.color, surface).toFixed(2) + ":1 for text. Fills keep the original."
      });
    }

    /* --- ink, and what sits on the accent fill ---
       The tenant supplies a dark neutral; we use it on the fill when it is
       legible there, because a brand's own ink on its own accent is the look
       the brand designed. Only when it fails do we fall back to measured
       black or white. Spoken's warm yellow with its #222631 ink is exactly this
       case: 10.31:1, far better than either default. */
    let ink = hexToRgb(theme.ink);
    if (!ink) ink = isDark ? { r: 242, g: 243, b: 245 } : { r: 34, g: 38, b: 49 };

    const inkOnFill = contrast(accent, ink);
    const fallback = contrast(accent, WHITE) >= contrast(accent, BLACK) ? WHITE : BLACK;
    const onAccent = inkOnFill >= 4.5 ? ink : fallback;
    report.push({
      check: "text on accent fill",
      status: contrast(accent, onAccent) >= 4.5 ? "PASS" : "WARN",
      detail: (onAccent === ink ? "tenant ink" : (onAccent === WHITE ? "white" : "black")) +
              " chosen, " + contrast(accent, onAccent).toFixed(2) + ":1" +
              (onAccent === ink ? "" : " (their ink was only " + inkOnFill.toFixed(2) + ":1)")
    });

    const textInk = isDark ? { r: 242, g: 243, b: 245 } : ink;
    const inkOnSurface = contrast(textInk, surface);
    report.push({
      check: "ink on surface",
      status: inkOnSurface >= 4.5 ? "PASS" : "FAIL",
      detail: inkOnSurface.toFixed(2) + ":1" + (inkOnSurface >= 7 ? " (clears AAA)" : " (AA)") +
              (isDark ? " — scheme ink; the tenant's dark ink is kept for accent fills only" : "")
    });

    /* --- radius --- */
    let radius = Number(theme.radius);
    if (!isFinite(radius)) radius = 8;
    const clamped = Math.max(0, Math.min(28, radius));
    if (clamped !== radius) {
      report.push({ check: "radius", status: "ADJUSTED", detail: radius + "px clamped to " + clamped + "px (0–28 keeps card nesting coherent)" });
    } else {
      report.push({ check: "radius", status: "PASS", detail: clamped + "px" });
    }

    /* --- write the tokens --- */
    const s = root.style;
    s.setProperty("--vt-accent", rgbToHex(accent));
    s.setProperty("--vt-accent-text", rgbToHex(fixed.color));
    s.setProperty("--vt-on-accent", rgbToHex(onAccent));
    s.setProperty("--vt-accent-soft", "rgba(" + [accent.r, accent.g, accent.b].map(Math.round).join(",") + ",0.10)");
    s.setProperty("--vt-accent-ring", "rgba(" + [accent.r, accent.g, accent.b].map(Math.round).join(",") + ",0.28)");
    s.setProperty("--vt-radius", clamped + "px");
    // The tenant's ink is a DARK neutral: correct as body text on a light
    // surface, invisible on a dark one. In dark mode we remove the inline
    // property entirely so the scheme's own light ink applies — leaving a
    // stale inline value here is dark-on-dark text, because an inline custom
    // property beats the [data-vt-scheme] rule that would have fixed it.
    if (isDark) s.removeProperty("--vt-ink");
    else s.setProperty("--vt-ink", rgbToHex(ink));
    if (theme.font) s.setProperty("--vt-font", theme.font);

    report.push({ check: "tenant surface", status: "PASS", detail: "5 tokens written; layout, spacing, depth and motion stay host-owned" });

    return {
      applied: { accent: rgbToHex(accent), accentText: rgbToHex(fixed.color), onAccent: rgbToHex(onAccent), ink: rgbToHex(ink), radius: clamped },
      report: report
    };
  }

  global.VitrineTheme = { PRESETS, apply, contrast, hexToRgb, rgbToHex };
})(typeof window !== "undefined" ? window : globalThis);
