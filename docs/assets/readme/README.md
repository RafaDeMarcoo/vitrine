# README media

The `vitrine-*.png` files are reproducible captures of the running demo. Three
product states feed the standalone device previews; eight consecutive
conversation states feed the animated hero, covering choice chips, inventory,
comparison, financing, trade-in, scheduling, lead capture and the final
receipt. A separate sequence of browser frames captures a customer actually
typing, tapping an inventory card and continuing while the thread fills in the
Pale tenant theme and dark mode. The Swift generator reads those captures and
produces the hero GIF, its static poster and the three previews used by the
repository README, plus a white editorial banner whose only moving content is
the live typed-and-tapped phone capture. Every
composition presents the states inside an iPhone 16 Pro-style frame with
device-correct proportions, controls, safe area and Dynamic Island.

Regenerate from the repository root on macOS:

```bash
node tools/readme_media/capture.js
swift tools/readme_media/generate.swift
```
