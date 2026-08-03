# Credits and third-party licences

The **code** in this repository is MIT (see `LICENSE`). The font and the demo photographs are not — they keep their own licences, listed here.

---

## Design system

The visual language is ported from **Spoken UI** (`spoken_ui`, a private Flutter package). Colour roles, the type scale and its tracking, the 16pt spacing unit, the 6/8/16 radius steps and the flat elevation-0 treatment all come from that system. Used with permission of its author.

The parts that did **not** come from Spoken, and are deliberately kept regardless of what a design system says: the 44×44pt minimum hit area, the three accessibility media queries, and the WCAG contrast gate. Those are correctness, not style.

## Typeface

**Archivo** — Omnibus-Type. Licensed under the **SIL Open Font License 1.1**, which permits bundling and redistribution.

Shipped as `assets/fonts/*.woff2`: six weights (Archivo 400/500/600/700, Archivo Condensed 500/600), subsetted to Latin and converted to WOFF2 — 76 KB total, down from 732 KB of TTF. Subsetting and format conversion are explicitly permitted by the OFL; the font is not renamed and is not sold on its own.

- Project: <https://github.com/Omnibus-Type/Archivo>
- Licence text: <https://openfontlicense.org/open-font-license-official-text/>

## Photographs

Every photograph in the demo is **vendored** under `assets/units/`. Both licences below permit redistribution, and bundling them means the demo works offline and does not depend on someone else's CDN staying up. Neither licence requires attribution; the credits are given anyway, because not crediting a photographer you didn't pay is a choice rather than a requirement.

Each file was cropped to the card's 1.758:1 slot, resized to 640×364 (2.75× the rendered size) and re-encoded as progressive JPEG at quality 78 — **544 KB for all twelve, down from 3.3 MB** of originals. Three needed a hand-placed crop rather than a centre one: the BMW and the MT-09 are portrait shots where the subject is off-centre vertically, and the wake boat is a speck in a wide lake, so that one is cropped in 2.1×.

If an image fails to load anyway, the renderer drops the `<img>` and falls back to the generated silhouette. The demo is designed to look intentional either way.

### Exact model

| Unit | Photograph | Licence | Credit |
|---|---|---|---|
| 2026 Yamaha MT-09 | [Yamaha MT-09](https://www.pexels.com/photo/yamaha-mt-09-motorcycle-15887144/) | Pexels | OĞUZHAN YAVUZ |
| 2025 Kawasaki Z900 | [Kawasaki Z900 at sunset](https://unsplash.com/photos/black-and-gray-motorcycle-on-gray-asphalt-road-during-sunset-Yq0JPlNqrIQ) | Unsplash | Pairach Boriboonmee |
| 2026 Polaris RZR Pro R | [Polaris RZR 1000 EPS](https://unsplash.com/photos/TVqjKLxraos) | Unsplash | Brandon Gardiner |

### Same marque or class, not the exact model

Stated plainly rather than implied. The demo inventory is fictional anyway, so a representative photograph is consistent with the rest of it — but it should not be mistaken for a manufacturer image.

| Unit | Photograph shows | Licence | Credit |
|---|---|---|---|
| 2024 Moto Guzzi V7 Stone | A Moto Guzzi T-3 — same marque, same retro-standard class | Unsplash | Bob Osias |
| 2025 BMW R 1300 GS | A BMW GS-series adventure bike; the generation is not stated on the source page | Unsplash | Ilya Godze |
| 2024 Can-Am Maverick X3 | A Can-Am Maverick racing; the source does not confirm the X3 trim | Pexels | Joaquin Delgado |
| 2025 Bayliner VR5 Bowrider | An outboard runabout at a marina; hull class unverified | Pexels | Bal Jinder |
| 2026 Bennington 22 SVL | A pontoon boat at sunrise; brand not identified | Unsplash | Natalia Ailatan |
| 2024 Malibu Wakesetter | A wakeboarding scene, Lake Eildon; brand not identified | Pexels | Aiden Begg |
| 2026 Sea-Doo GTI SE 170 | A personal watercraft under way | Pexels | Anton Kudryashov |
| 2025 Grand Design Imagine | An SUV towing a travel trailer | Unsplash | Benjamin Zanatta |
| 2024 Winnebago Solis 59P | A Sprinter-based camper van | Unsplash | Negley Stockman |

### Licence notes

- **Unsplash Licence** — <https://unsplash.com/license>. Free for commercial use, no attribution required. Cannot be sold as unmodified copies, cannot be used to build a competing stock-photo service. Nothing here is from Unsplash+ (the paid tier), which is not redistributable.
- **Pexels Licence** — <https://www.pexels.com/license/>. Same shape: free commercial use, no attribution required, no reselling unmodified copies.
- Neither licence is a CC or OSI licence, and neither becomes MIT by being referenced from an MIT project. The code is MIT; the photographs stay under the terms above.
- **Trademark is not copyright.** These photographs show branded vehicles. That is fine for a demo, but nothing here implies any manufacturer endorses or is associated with this project.

### Why not Wikimedia Commons

Commons would have given properly free (CC BY-SA / public domain) images and, for the motorcycles, more exact models. It was unreachable from the environment this was built in, so every licence below was instead verified on a page that *was* reachable. If you fork this and can reach Commons, `Category:Yamaha MT-09` and its neighbours are the better source.

## Replacing all of this

In production none of it applies: `image` on each unit points at the dealer's own inventory photography, which they own. The registry field, the renderer's `<img>`, and the silhouette fallback are all that the code cares about.
