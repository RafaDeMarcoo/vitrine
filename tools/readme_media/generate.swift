import AppKit
import ImageIO
import UniformTypeIdentifiers

struct Scene {
  let image: NSImage
  let eyebrow: String
  let title: String
  let detail: String
  let accent: NSColor
  let screenFill: NSColor
  let screenChrome: NSColor
}

let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let assetDirectory = repository.appendingPathComponent("docs/assets/readme")

let ink = NSColor(calibratedRed: 0.075, green: 0.082, blue: 0.098, alpha: 1)
let paper = NSColor(calibratedRed: 0.965, green: 0.957, blue: 0.925, alpha: 1)
let surface = NSColor(calibratedRed: 0.992, green: 0.990, blue: 0.978, alpha: 1)
let muted = NSColor(calibratedRed: 0.36, green: 0.37, blue: 0.40, alpha: 1)
let warmYellow = NSColor(calibratedRed: 232 / 255, green: 216 / 255, blue: 63 / 255, alpha: 1)
let paleYellow = NSColor(calibratedRed: 255 / 255, green: 214 / 255, blue: 10 / 255, alpha: 1)
let violet = NSColor(calibratedRed: 0.49, green: 0.17, blue: 0.78, alpha: 1)
let darkScreen = NSColor(calibratedWhite: 0.025, alpha: 1)

typealias SceneDefinition = (
  fileName: String,
  eyebrow: String,
  title: String,
  detail: String,
  accent: NSColor,
  screenFill: NSColor,
  screenChrome: NSColor
)

let productDefinitions: [SceneDefinition] = [
  (
    "vitrine-inventory.png",
    "GENERATIVE COMMERCE",
    "Let the product\nanswer.",
    "Typed inventory cards, chosen by the model — never improvised markup.",
    warmYellow,
    surface,
    ink
  ),
  (
    "vitrine-finance.png",
    "COMPLIANCE BY CONSTRUCTION",
    "Numbers that\nstay honest.",
    "Interactive financing with the disclosure structurally attached.",
    warmYellow,
    surface,
    ink
  ),
  (
    "vitrine-white-label.png",
    "WHITE-LABEL BY DESIGN",
    "One registry.\nEvery brand.",
    "Change the tenant, palette and inventory — not the trusted renderer.",
    violet,
    darkScreen,
    NSColor.white
  ),
]

let conversationDefinitions: [SceneDefinition] = [
  (
    "vitrine-choice-chips.png",
    "01 / CHOICE CHIPS",
    "Ask less.\nChoose faster.",
    "Useful next steps arrive as trusted controls, not another paragraph.",
    paleYellow, darkScreen, NSColor.white
  ),
  (
    "vitrine-unit-carousel.png",
    "02 / INVENTORY CAROUSEL",
    "The floor,\nin the thread.",
    "Live inventory becomes a draggable, typed product surface with real photography.",
    paleYellow, darkScreen, NSColor.white
  ),
  (
    "vitrine-unit-compare.png",
    "03 / UNIT COMPARE",
    "Side by side,\nthen.",
    "The model selects the comparison; the renderer owns every row and value.",
    paleYellow, darkScreen, NSColor.white
  ),
  (
    "vitrine-finance-slider.png",
    "04 / FINANCE SLIDER",
    "Payments with\nthe fine print.",
    "Interactive terms and Regulation Z disclosures stay structurally attached.",
    paleYellow, darkScreen, NSColor.white
  ),
  (
    "vitrine-trade-in.png",
    "05 / TRADE-IN",
    "A number before\na lead form.",
    "Give value first: an indicative range without demanding contact details.",
    paleYellow, darkScreen, NSColor.white
  ),
  (
    "vitrine-schedule.png",
    "06 / SCHEDULING",
    "Pick a slot.\nKeep moving.",
    "Availability becomes the next turn instead of sending the buyer elsewhere.",
    paleYellow, darkScreen, NSColor.white
  ),
  (
    "vitrine-lead-capture.png",
    "07 / LEAD CAPTURE",
    "Contact details,\nasked last.",
    "The form appears only after the buyer has chosen something concrete.",
    paleYellow, darkScreen, NSColor.white
  ),
  (
    "vitrine-summary-receipt.png",
    "08 / RECEIPT",
    "Booked without\na detour.",
    "The final state carries the unit, appointment and customer into one receipt.",
    paleYellow, darkScreen, NSColor.white
  ),
]

func loadScenes(_ definitions: [SceneDefinition]) throws -> [Scene] {
  try definitions.map { definition in
  let sourceURL = assetDirectory.appendingPathComponent(definition.fileName)
  guard let source = NSImage(contentsOf: sourceURL) else {
    throw NSError(domain: "VitrineReadmeMedia", code: 1, userInfo: [
      NSLocalizedDescriptionKey: "Missing source image at \(sourceURL.path)",
    ])
  }
  return Scene(
    image: source,
    eyebrow: definition.eyebrow,
    title: definition.title,
    detail: definition.detail,
    accent: definition.accent,
    screenFill: definition.screenFill,
    screenChrome: definition.screenChrome
  )
  }
}

let productScenes = try loadScenes(productDefinitions)
let scenes = try loadScenes(conversationDefinitions)

let canvas = NSSize(width: 1200, height: 675)
let sceneHoldDuration = 1.8

func drawText(
  _ value: String,
  in rect: NSRect,
  font: NSFont,
  color: NSColor,
  alpha: CGFloat = 1,
  lineSpacing: CGFloat = 0
) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.lineBreakMode = .byWordWrapping
  paragraph.lineSpacing = lineSpacing
  (value as NSString).draw(
    in: rect,
    withAttributes: [
      .font: font,
      .foregroundColor: color.withAlphaComponent(alpha),
      .paragraphStyle: paragraph,
    ]
  )
}

func drawIPhone16Pro(
  scene: Scene,
  next: Scene?,
  progress: CGFloat,
  in outer: NSRect
) {
  let scale = outer.width / 430
  func scaled(_ value: CGFloat) -> CGFloat { value * scale }

  NSGraphicsContext.current?.saveGraphicsState()
  let actionButton = NSBezierPath(
    roundedRect: NSRect(
      x: outer.minX - scaled(5),
      y: outer.minY + scaled(145),
      width: scaled(7),
      height: scaled(54)
    ),
    xRadius: scaled(3.5),
    yRadius: scaled(3.5)
  )
  NSColor(calibratedWhite: 0.34, alpha: 1).setFill()
  actionButton.fill()

  for y in [230.0, 310.0] {
    let volumeButton = NSBezierPath(
      roundedRect: NSRect(
        x: outer.minX - scaled(5),
        y: outer.minY + scaled(y),
        width: scaled(7),
        height: scaled(66)
      ),
      xRadius: scaled(3.5),
      yRadius: scaled(3.5)
    )
    NSColor(calibratedWhite: 0.34, alpha: 1).setFill()
    volumeButton.fill()
  }

  let sideButton = NSBezierPath(
    roundedRect: NSRect(
      x: outer.maxX - scaled(2),
      y: outer.minY + scaled(245),
      width: scaled(7),
      height: scaled(110)
    ),
    xRadius: scaled(3.5),
    yRadius: scaled(3.5)
  )
  NSColor(calibratedWhite: 0.34, alpha: 1).setFill()
  sideButton.fill()

  NSGraphicsContext.current?.saveGraphicsState()
  let shadow = NSShadow()
  shadow.shadowColor = ink.withAlphaComponent(0.16)
  shadow.shadowBlurRadius = scaled(38)
  shadow.shadowOffset = NSSize(width: 0, height: scaled(18))
  shadow.set()
  let shell = NSBezierPath(
    roundedRect: outer,
    xRadius: scaled(64),
    yRadius: scaled(64)
  )
  NSColor(calibratedWhite: 0.38, alpha: 1).setFill()
  shell.fill()
  NSGraphicsContext.current?.restoreGraphicsState()

  let machinedEdge = outer.insetBy(dx: scaled(3), dy: scaled(3))
  let edge = NSBezierPath(
    roundedRect: machinedEdge,
    xRadius: scaled(61),
    yRadius: scaled(61)
  )
  NSColor(calibratedWhite: 0.018, alpha: 1).setFill()
  edge.fill()
  NSColor.white.withAlphaComponent(0.28).setStroke()
  edge.lineWidth = scaled(0.8)
  edge.stroke()

  let screen = outer.insetBy(dx: scaled(13), dy: scaled(13))
  NSGraphicsContext.current?.saveGraphicsState()
  NSBezierPath(
    roundedRect: screen,
    xRadius: scaled(51),
    yRadius: scaled(51)
  ).addClip()
  scene.screenFill.setFill()
  screen.fill()
  if let next {
    next.screenFill.withAlphaComponent(progress).setFill()
    screen.fill()
  }
  NSGraphicsContext.current?.imageInterpolation = .high

  func contentRect(for source: NSImage) -> NSRect {
    let safeAreaTop = scaled(48)
    let availableHeight = screen.height - safeAreaTop
    let fit = min(
      screen.width / source.size.width,
      availableHeight / source.size.height
    )
    let fittedSize = NSSize(
      width: source.size.width * fit,
      height: source.size.height * fit
    )
    return NSRect(
      x: screen.midX - fittedSize.width / 2,
      y: screen.minY + safeAreaTop,
      width: fittedSize.width,
      height: fittedSize.height
    )
  }

  scene.image.draw(
    in: contentRect(for: scene.image),
    from: NSRect(origin: .zero, size: scene.image.size),
    operation: .sourceOver,
    fraction: 1 - progress,
    respectFlipped: true,
    hints: [.interpolation: NSImageInterpolation.high]
  )
  if let next {
    next.image.draw(
      in: contentRect(for: next.image),
      from: NSRect(origin: .zero, size: next.image.size),
      operation: .sourceOver,
      fraction: progress,
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
  }
  NSGraphicsContext.current?.restoreGraphicsState()
  NSGraphicsContext.current?.restoreGraphicsState()

  let island = NSBezierPath(
    roundedRect: NSRect(
      x: screen.midX - scaled(47),
      y: screen.minY + scaled(13),
      width: scaled(94),
      height: scaled(27)
    ),
    xRadius: scaled(14),
    yRadius: scaled(14)
  )
  NSColor(calibratedWhite: 0.008, alpha: 1).setFill()
  island.fill()
  NSColor.white.withAlphaComponent(0.10).setStroke()
  island.lineWidth = scaled(0.65)
  island.stroke()

  let sensor = NSBezierPath(
    ovalIn: NSRect(
      x: screen.midX + scaled(30),
      y: screen.minY + scaled(22),
      width: scaled(5),
      height: scaled(5)
    )
  )
  NSColor(calibratedRed: 0.04, green: 0.07, blue: 0.12, alpha: 1).setFill()
  sensor.fill()

  let homeIndicatorRect = NSRect(
    x: screen.midX - scaled(46),
    y: screen.maxY - scaled(17),
    width: scaled(92),
    height: scaled(5)
  )
  let currentIndicator = NSBezierPath(
    roundedRect: homeIndicatorRect,
    xRadius: scaled(2.5),
    yRadius: scaled(2.5)
  )
  scene.screenChrome.withAlphaComponent(0.62 * (1 - progress)).setFill()
  currentIndicator.fill()
  if let next {
    let nextIndicator = NSBezierPath(
      roundedRect: homeIndicatorRect,
      xRadius: scaled(2.5),
      yRadius: scaled(2.5)
    )
    next.screenChrome.withAlphaComponent(0.62 * progress).setFill()
    nextIndicator.fill()
  }
}

func renderDevicePreview(_ scene: Scene) -> NSImage {
  let previewSize = NSSize(width: 500, height: 950)
  return NSImage(size: previewSize, flipped: true) { _ in
    drawIPhone16Pro(
      scene: scene,
      next: nil,
      progress: 0,
      in: NSRect(x: 35, y: 25, width: 430, height: 900)
    )
    return true
  }
}

func render(scene: Scene, next: Scene?, progress: CGFloat, index: Int) -> NSImage {
  NSImage(size: canvas, flipped: true) { bounds in
    paper.setFill()
    bounds.fill()

    ink.withAlphaComponent(0.075).setStroke()
    let divider = NSBezierPath()
    divider.lineWidth = 1
    divider.move(to: NSPoint(x: 438, y: 44))
    divider.line(to: NSPoint(x: 438, y: 631))
    divider.stroke()

    drawText(
      "VITRINE / UI",
      in: NSRect(x: 474, y: 48, width: 220, height: 26),
      font: .systemFont(ofSize: 15, weight: .bold),
      color: ink
    )
    drawText(
      "COMPONENTS, NOT MARKUP",
      in: NSRect(x: 900, y: 51, width: 230, height: 24),
      font: .systemFont(ofSize: 11, weight: .semibold),
      color: muted
    )

    drawIPhone16Pro(
      scene: scene,
      next: next,
      progress: progress,
      in: NSRect(x: 88, y: 32, width: 291, height: 609)
    )

    func drawCopy(_ value: Scene, alpha: CGFloat) {
      let dot = NSBezierPath(
        ovalIn: NSRect(x: 474, y: 128, width: 9, height: 9)
      )
      value.accent.withAlphaComponent(alpha).setFill()
      dot.fill()
      drawText(
        value.eyebrow,
        in: NSRect(x: 497, y: 123, width: 520, height: 24),
        font: .systemFont(ofSize: 13, weight: .semibold),
        color: ink,
        alpha: alpha
      )
      drawText(
        value.title,
        in: NSRect(x: 468, y: 174, width: 670, height: 190),
        font: .systemFont(ofSize: 67, weight: .bold),
        color: ink,
        alpha: alpha,
        lineSpacing: -6
      )
      drawText(
        value.detail,
        in: NSRect(x: 474, y: 394, width: 580, height: 86),
        font: .systemFont(ofSize: 21, weight: .medium),
        color: muted,
        alpha: alpha,
        lineSpacing: 2
      )

      let chip = NSBezierPath(
        roundedRect: NSRect(x: 474, y: 525, width: 214, height: 42),
        xRadius: 21,
        yRadius: 21
      )
      value.accent.withAlphaComponent(alpha).setFill()
      chip.fill()
      drawText(
        "MODEL → TYPED SPEC",
        in: NSRect(x: 503, y: 537, width: 175, height: 22),
        font: .systemFont(ofSize: 12, weight: .bold),
        color: ink,
        alpha: alpha
      )
    }

    drawCopy(scene, alpha: 1 - progress)
    if let next { drawCopy(next, alpha: progress) }

    drawText(
      String(format: "%02d / %02d", index + 1, scenes.count),
      in: NSRect(x: 1062, y: 610, width: 82, height: 22),
      font: .monospacedDigitSystemFont(ofSize: 12, weight: .medium),
      color: muted
    )
    return true
  }
}

func cgImage(_ image: NSImage) throws -> CGImage {
  var rect = NSRect(origin: .zero, size: image.size)
  guard let result = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
    throw NSError(domain: "VitrineReadmeMedia", code: 2)
  }
  return result
}

func writePNG(_ image: NSImage, to url: URL) throws {
  let bitmap = NSBitmapImageRep(cgImage: try cgImage(image))
  guard let data = bitmap.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "VitrineReadmeMedia", code: 3)
  }
  try data.write(to: url)
}

try FileManager.default.createDirectory(
  at: assetDirectory,
  withIntermediateDirectories: true
)

let gifURL = assetDirectory.appendingPathComponent("vitrine-showcase-refined.gif")
guard let destination = CGImageDestinationCreateWithURL(
  gifURL as CFURL,
  UTType.gif.identifier as CFString,
  scenes.count * 7,
  nil
) else {
  throw NSError(domain: "VitrineReadmeMedia", code: 4)
}
CGImageDestinationSetProperties(destination, [
  kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0],
] as CFDictionary)

var poster: NSImage?
for index in scenes.indices {
  let current = scenes[index]
  let next = scenes[(index + 1) % scenes.count]
  for step in 0..<7 {
    let progress: CGFloat = step == 0 ? 0 : CGFloat(step) / 6
    let frame = render(scene: current, next: next, progress: progress, index: index)
    if poster == nil { poster = frame }
    let delay = step == 0 ? sceneHoldDuration : 0.075
    CGImageDestinationAddImage(
      destination,
      try cgImage(frame),
      [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFDelayTime: delay]] as CFDictionary
    )
  }
}

guard CGImageDestinationFinalize(destination) else {
  throw NSError(domain: "VitrineReadmeMedia", code: 5)
}

if let poster {
  try writePNG(
    poster,
    to: assetDirectory.appendingPathComponent("vitrine-showcase-poster.png")
  )
}

let devicePreviews = [
  (productScenes[0], "vitrine-inventory-iphone16-pro.png"),
  (productScenes[1], "vitrine-finance-iphone16-pro.png"),
  (productScenes[2], "vitrine-white-label-iphone16-pro.png"),
]
for preview in devicePreviews {
  try writePNG(
    renderDevicePreview(preview.0),
    to: assetDirectory.appendingPathComponent(preview.1)
  )
}

print("Generated Vitrine README media in \(assetDirectory.path)")
