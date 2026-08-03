# README media

The three `vitrine-*.png` product states are reproducible captures of the
running demo. The Swift generator reads them without modifying them and
produces the animated hero, its static poster and three standalone device
previews used by the repository README. Every composition presents those
states inside an iPhone 16 Pro-style frame with device-correct proportions,
controls, safe area and Dynamic Island.

Regenerate from the repository root on macOS:

```bash
node tools/readme_media/capture.js
swift tools/readme_media/generate.swift
```
