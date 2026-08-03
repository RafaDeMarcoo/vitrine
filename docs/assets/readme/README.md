# README media

The three product states are cropped reproducibly from the real
[`docs/hero.png`](../../hero.png) composition. The animated hero and static
screenshots are generated locally; they are not reconstructed mockups.
The animated composition presents those states inside an iPhone 16 Pro-style
frame with device-correct proportions, controls, safe area and Dynamic Island.

Regenerate from the repository root on macOS:

```bash
swift tools/readme_media/generate.swift
```
