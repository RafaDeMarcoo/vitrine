<p align="center">
  <img src="docs/assets/readme/vitrine-showcase-refined.gif" alt="Vitrine UI in motion: generative inventory, compliant financing and a white-label dark theme" width="100%">
</p>

<h1 align="center">Vitrine UI</h1>

<p align="center">
  <strong>Generative UI for conversations that sell.</strong>
</p>

<p align="center">
  The model chooses trusted components from a typed registry.<br>
  The client renders the product experience. No model-authored markup, ever.
</p>

<p align="center">
  <a href="#try-it">Try the demo</a> ·
  <a href="docs/registry.md">Explore the registry</a> ·
  <a href="#motion-springs-not-transitions">Feel the motion</a>
</p>

<p align="center">
  <img src="docs/assets/readme/vitrine-inventory-iphone16-pro.png" alt="Vitrine rendering typed inventory inside a sales conversation, presented in an iPhone 16 Pro frame" width="31%">
  <img src="docs/assets/readme/vitrine-finance-iphone16-pro.png" alt="Vitrine rendering interactive financing with its disclosure attached, presented in an iPhone 16 Pro frame" width="31%">
  <img src="docs/assets/readme/vitrine-white-label-iphone16-pro.png" alt="Vitrine rendering a white-label marine inventory conversation in dark mode, presented in an iPhone 16 Pro frame" width="31%">
</p>

<p align="center">
  <sub>GENERATIVE INVENTORY &nbsp;·&nbsp; COMPLIANT FINANCING &nbsp;·&nbsp; WHITE-LABEL RUNTIME</sub><br>
  <sub>Reviewed product states from the running demo, not reconstructed mockups.</sub>
</p>

---

## Generative UI for conversations that sell

A white-label chat widget where the model picks components from a typed registry instead of writing prose — and never writes markup.

No build step. No dependencies. No framework. Seven files, about 3,700 lines, works from `file://`.

> *Vitrine* — /viˈtriːn/, **vee-TREEN**. French and Portuguese for the glass case a shop puts its best things in. Unrelated to Vite and Vitest, despite the prefix. On npm it's [`vitrine-ui`](https://www.npmjs.com/package/vitrine-ui).

## The idea in thirty seconds

Most "AI chat" is a text box that returns markdown. That is a bad interface for anything transactional. Picking a date, comparing three units, adjusting a down payment — these are not sentences, and rendering them as sentences is why chat widgets convert badly.

Generative UI fixes that, but the naive version — *let the model write JSX* — is untestable, unsafe, and impossible to keep on-brand across tenants.

Vitrine takes the other road, the one behind [Google's A2UI](https://a2ui.org/) and [MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/): **the model composes from a catalog the client already trusts.**

```jsonc
// Everything the model is allowed to say. That's the whole wire format.
[
  { "component": "text", "props": { "body": "Four that land under $12,000." } },
  { "component": "unit_carousel", "props": {
      "title": "On the floor now",
      "units": [{ "id": "mt09", "name": "2026 Yamaha MT-09", "price": 10999, "monthly": 189 }]
  }}
]
```

The model decides **what** to show. You decide **how** it looks. A hallucination costs you one dropped card, not an injection.

## Try it

```bash
git clone https://github.com/RafaDeMarcoo/vitrine.git
cd vitrine && open index.html      # that's it — no install, no server
```

Or drop it into a page. There is no bundle and no entry point — six scripts with a load order, by design:

```html
<link rel="stylesheet" href="src/vitrine.css">
<script src="src/registry.js"></script>   <!-- the contract -->
<script src="src/theme.js"></script>      <!-- tokens + contrast gate -->
<script src="src/spring.js"></script>     <!-- springs + gestures -->
<script src="src/renderer.js"></script>   <!-- spec -> DOM -->
<script src="src/planner.js"></script>    <!-- your planner, or the mock -->
<script src="src/vitrine.js"></script>    <!-- runtime -->
```

`src/registry.js` has no DOM dependency and runs in Node unchanged, which is how you validate blocks server-side:

```bash
npm run test:registry
# registry ok — Reg Z fields are enforced by the schema
```

The demo ships with a deterministic offline planner, so it works with no API key, no network and no rate limit, and renders identically every time. Paste an Anthropic key in the sidebar to bind the same registry schemas as tools and let a live model drive.

## What's actually interesting here

**The registry is the product.** [`src/registry.js`](src/registry.js) is the entire contract between the model and the interface: eight components, each with a JSON Schema and a description written *for the model*. Nothing else in `src/` knows what a motorcycle is. Swap that one file and the system retargets at hotels, clinics, or apartment leasing.

The same schemas are exported as tool definitions, so the model is constrained by exactly the contract the renderer trusts:

```js
VitrineRegistry.toolSpecs()   // -> [{ name: "render_unit_carousel", input_schema: {...} }, …]
```

One source of truth. No drift between what the model may emit and what the client will draw.

**Nothing from the model reaches `innerHTML`.** Every model-authored string arrives via `textContent` or a typed attribute. There is no code path from a planner response to markup — not a sanitizer, an *absence of the path*.

**Layout never jumps.** Components declare their height in the registry, so the skeleton that lands first occupies exactly the space the hydrated card will take. Text streams character by character with a trailing caret; components arrive as complete units. A chat UI that reflows after a card lands feels broken even when it's correct, and that single property is most of what separates "premium" from "widget".

**White-label is five tokens, and they're validated.** The tenant gets accent, ink, radius, typeface and logo. The host keeps layout, spacing, hierarchy, depth and motion — the parts that actually carry the design. Every accent goes through a contrast gate before it is applied: foreground on accent fills is *chosen* by measured contrast, and an accent that fails WCAG AA against the page surface is darkened in 4% steps until it passes. See *The contrast gate* below for what that looks like with a real brand colour.

**Compliance lives in the renderer, not the prompt.** `finance_slider` displays a monthly payment, which under Regulation Z is an advertised trigger term. The disclosure — down payment, amount financed, APR, term, total of payments — is recomputed from the same numbers the slider is showing, on every input event, and the schema refuses the card without `apr` and `termMonths`. The registry description tells the model, in as many words, not to route around it by putting a payment in prose. Prompt instructions get ignored; a renderer that can't draw the unsafe thing does not.

## Motion: springs, not transitions

This is the part that decides whether an interface feels alive, and it is where most web UI gives itself away.

A CSS transition cannot be interrupted usefully. Grab an element mid-flight and the browser either ignores you or snaps. So nothing here that a finger can touch uses one — [`src/spring.js`](src/spring.js) is a ~450-line spring solver and gesture layer, and everything gestural runs on it:

- **Springs start from the current on-screen value.** Retarget mid-flight and the motion continues from where it visibly is. Starting from the logical target is what produces the jump you see in most "animated" web UI.
- **Velocity is inherited, and blended on reversal.** A flick keeps flying; a gentle release settles. Reversing hard-cuts nothing — a hard cut reads as a brick wall.
- **Parameterised as damping ratio + response**, like Apple does it, not as an opaque stiffness number. `1.0 / 0.35` for general UI, `0.8` where momentum is involved, `0.72` for the one confirmation that is allowed to overshoot.
- **Feedback starts on `pointerdown`, never on `click`.** Waiting for the click is a whole human reaction time of nothing happening, and it is the single most common reason a web UI feels dead next to a native one. Presses also handle drag-away-and-back: slide off the control and it un-presses, slide back and it presses again.
- **One rAF loop** drives every spring on the page, writing only `transform` and `opacity`.

The carousel is a dragged track rather than an `overflow: auto` container, because native scrolling gives you no velocity, no rubber-banding and no say in where a flick lands. It tracks the finger 1:1 from wherever it was grabbed, resists past the ends, and on release **projects the throw forward** — `x + (v/1000) × d/(1−d)`, `d = 0.998` — and snaps to whichever card is nearest *that projection*. Snapping from the release point instead would ignore how hard you threw it.

The payment slider is custom for one reason: `<input type=range>` cannot honour a grab offset. Grab the thumb 8px off centre and it teleports under your finger. This one stays where you grabbed it, tracks 1:1 while dragging, and springs only when you tap the bare track and the thumb has to travel to meet you. The track is 6px; the control is 44.

Cards **materialise** — blur and scale resolve together off one spring — rather than fading in. A cross-fade reads as an image appearing; this reads as an object arriving.

Three accessibility signals are answered independently, because treating them as one switch is how "accessible mode" ends up ugly for everyone who only needed one of them: `prefers-reduced-motion` drops the springs to instant, `prefers-reduced-transparency` makes the glass solid, `prefers-contrast: more` darkens the ink and thickens the borders.

## The design system is a spec, not a vibe

The visual language is ported from **Spoken UI**, a Flutter design system: a high-chroma accent with a dark ink on top of it, Archivo with Archivo Condensed for titles, cool grey neutrals instead of true greys, small consistent radii, and — the part that changes everything — **positive tracking on small text**. Apple tightens large text; Spoken opens small text. Opposite instincts, and that one inversion is most of what makes this read as Spoken rather than as another Cupertino clone.

| Rule | Value | Source |
|---|---|---|
| Type | Archivo / Archivo Condensed, scale 12 / 14 / 16 / 18 / 20 / 23 / 24 / 32 / 40, in `rem` | `UITextStyle` |
| Tracking | +0.10 to +0.50px on labels and captions, ~0 on body | `UITextStyle` |
| Spacing | `spaceUnit` 16, stepped in quarters: 4 / 8 / 12 / 16 / 20 / 24 / 32 | `UISpacing` |
| Shape | 6 on controls, 8 on cards, 16 on large surfaces, pill on chips | `BorderRadius.circular(…)` |
| Depth | `elevation: 0`, rising to 3 only while pressed. Structure from hairlines | `FilledButtonStyle` |
| Hit areas | 44×44pt minimum on everything interactive | **not** Spoken — HIG's floor |
| Contrast | every text colour ≥ 4.5:1 against its own background | **not** Spoken — WCAG |

The last two rows did not come from the design system, and would not have been given up if it had asked. Hit areas and contrast are correctness, not style, and a design system does not get a vote on them.

Everything above is checkable in a browser console, and `npm run audit` checks it:

```
  PASS  TARGETS   44×44pt minimum, everything labelled
  PASS  TYPE      Spoken scale only, no fractional sizes
  PASS  SPACING   4pt grid
  PASS  CONTRAST  all text ≥ 4.5:1 against its own background
  PASS  RUNTIME   no console errors during the funnel
```

Its first run found six violations in a UI that looked fine, including secondary text at 3.44:1 in a project whose headline feature is a contrast gate. Measure before you trust it — looking is not measuring.

## The contrast gate, with a real brand colour

Spoken's accent is a warm yellow. Against white it measures **1.47:1** — as body copy it is not dim, it is invisible. Spoken pairs it with `#886C2C`, a darker token for accent-coloured text.

The gate does that automatically for any tenant, and the demo shows all three outcomes at once:

- **Fills keep the real brand colour.** The yellow button stays `#E8D83F`.
- **Accent text uses the accessible token.** `#886C2C` scores 4.97:1 on white, so highlighted text clears AA without losing the warm palette.
- **What sits on the fill is measured, not assumed.** The tenant's own ink `#222631` scores 10.31:1 on the yellow, so it wins over black or white. That is the look the brand designed; the gate only overrides it when it fails.

This is why the tenant surface is five tokens rather than four. A high-chroma accent only works with a specific dark neutral on top of it, and that neutral is part of the brand, not a host decision.

## Photographs

Units carry an `image` URL, and the renderer draws it with the generated silhouette underneath as a fallback — so a blocked CDN or an offline demo degrades to something designed rather than to a broken-image icon.

The demo's twelve photos are real and freely licensed (Unsplash and Pexels — both permit redistribution), cropped per-image to the card slot and re-encoded: **544 KB for all twelve, down from 3.3 MB.** They are bundled rather than hot-linked so the demo works offline and does not depend on someone else's CDN. [`docs/CREDITS.md`](docs/CREDITS.md) lists every attribution and is explicit about which are the exact model and which are a representative example of the same class. In production none of that applies: `image` points at the dealer's own inventory photography, which they own.

## The eight components

| Component | Job |
|---|---|
| `text` | Prose. Two sentences, for voice — never for options. |
| `choice_chips` | 2–5 mutually exclusive quick replies. |
| `unit_carousel` | Scrollable inventory rail, best match first. |
| `unit_compare` | Side-by-side spec table for 2–3 units. |
| `finance_slider` | Payment estimator with an auto-attached Reg Z disclosure. |
| `trade_in` | Four fields in, an indicative range out. |
| `schedule` | Day and time picker. |
| `lead_capture` | Name, phone, email — asked last, never first. |
| `summary_receipt` | Confirmation of a completed action. |

Full payload documentation: [`docs/registry.md`](docs/registry.md).

## Architecture

```
index.html            demo shell — theme switcher, contrast report, live wire inspector
src/registry.js       component schemas + validator + tool-spec export   ← the contract
src/renderer.js       spec -> DOM. Pure, no innerHTML, declares heights
src/theme.js          five tenant tokens + the WCAG contrast gate
src/spring.js         spring solver, momentum, rubber-band, drag + slider gestures
src/vitrine.js        conversation loop, streaming, skeleton timing
src/planner.js        MockPlanner (offline, deterministic) + LivePlanner (real model)
src/vitrine.css       host-owned design system; tenant surface at the top
demo/inventory.js     fake dealership feed, real freely-licensed photos
assets/fonts/         Archivo, subset to Latin as woff2 — 76 KB for six weights
tools/audit-hig.js    npm run audit   — measures the four HIG rules in a browser
tools/measure-heights.js  npm run measure — diffs skeleton heights against reality
```

Data flows one way:

```
user input ──> planner ──> [blocks] ──> validate ──> skeleton ──> render ──> DOM
                  ▲                        │
                  └──── card interaction ──┘   (a tapped card and a typed
                                                sentence are the same event)
```

## Retargeting it

1. Rewrite `src/registry.js` with your domain's components. Write the `description` fields for the model, not for a human — they are prompt surface, and *when not to use this component* earns its place more than what it does.
2. Add a render function per component in `src/renderer.js`, plus a `.height` for the skeleton — run `npm run measure` to get the real number rather than guessing, or set `.instant = true` if the component has nothing to load.
3. Point `LivePlanner.inventoryContext()` at your data.
4. Leave `theme.js`, `vitrine.js` and the layout half of the CSS alone.

## Going live

The demo puts an API key in the browser because a demo with a server is a demo nobody runs. Do not ship that. In production:

- Put the planner call behind your own endpoint. The browser sends a message and a session id; your server holds the key, the system prompt and the inventory context.
- Validate on the server too. `VitrineRegistry.validateBlock` runs in Node unchanged.
- Rate-limit per session, and cap components per turn — a model that emits nine carousels is a bill, not a bug.

## Honest limitations

- **The conversion claim is unproven in this setting.** There is strong academic evidence that people prefer generative interfaces to plain text — [Google Research](https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/) measures 83–97% preference over markdown and plain text, and [Generative Interfaces for Language Models](https://arxiv.org/abs/2508.19227) (ACL 2026 Findings) finds ~70% across 76 participants on their own real queries. But **no vendor has published a controlled A/B of cards versus text inside a production chat widget.** Not one. Instrument before you believe anything, including this README.
- The mock planner is keyword matching. It is a fixture for the rendering layer, not a dialogue system, and it is not trying to be one.
- No virtualised thread. Past a few hundred turns you'll want one.
- The trade-in valuation is arithmetic on a model year. Wire it to a real book-value service.
- Tested in current Chromium, Safari and Firefox. `color-mix` and `backdrop-filter` degrade gracefully; IE is not a target.

## Prior art worth reading

[A2UI](https://a2ui.org/) · [MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) · [AG-UI](https://github.com/ag-ui-protocol/ag-ui) · [Vercel AI SDK generative UI](https://ai-sdk.dev/docs/introduction) · [Thesys C1](https://www.thesys.dev/)

If you are choosing between these and rolling your own: use one of them for the protocol. Vitrine's contribution is the layer above it — the multi-tenant theming contract, the contrast gate, the skeleton timing, and putting compliance in the renderer instead of the prompt.

## About the name

"Vitrine" is a common noun in several languages, so there are unrelated neighbours: a [game launcher](https://github.com/vitrine-app/vitrine), a [static site generator](https://github.com/charlyisidore/vitrine), a jQuery image rotator, an abandoned 2020 npm stub holding the bare package name, and a cluster of Brazilian product-carousel components — *vitrine* is the standard word for a product showcase in Brazilian Portuguese. None of them are this project and none of them are affiliated with it. Hence `vitrine-ui` on npm, and the wordmark everywhere else.

## License

MIT.
