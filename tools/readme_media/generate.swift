import AppKit
import ImageIO
import UniformTypeIdentifiers

struct Scene {
  let image: NSImage
  let outputName: String
  let eyebrow: String
  let title: String
  let detail: String
  let accent: NSColor
}

let repository = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceURL = repository.appendingPathComponent("docs/hero.png")
let assetDirectory = repository.appendingPathComponent("docs/assets/readme")

guard let source = NSImage(contentsOf: sourceURL) else {
  throw NSError(domain: "VitrineReadmeMedia", code: 1, userInfo: [
    NSLocalizedDescriptionKey: "Missing source image at \(sourceURL.path)",
  ])
}

let ink = NSColor(calibratedRed: 0.075, green: 0.082, blue: 0.098, alpha: 1)
let paper = NSColor(calibratedRed: 0.965, green: 0.957, blue: 0.925, alpha: 1)
let surface = NSColor(calibratedRed: 0.992, green: 0.990, blue: 0.978, alpha: 1)
let muted = NSColor(calibratedRed: 0.36, green: 0.37, blue: 0.40, alpha: 1)
let lime = NSColor(calibratedRed: 0.76, green: 0.92, blue: 0.20, alpha: 1)
let violet = NSColor(calibratedRed: 0.49, green: 0.17, blue: 0.78, alpha: 1)

func crop(_ image: NSImage, sourceRect: NSRect) -> NSImage {
  NSImage(size: sourceRect.size, flipped: true) { bounds in
    image.draw(
      in: bounds,
      from: sourceRect,
      operation: .copy,
      fraction: 1,
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
    return true
  }
}

let cropDefinitions = [
  (
    NSRect(x: 27, y: 29, width: 527, height: 1028),
    "vitrine-inventory.png",
    "GENERATIVE COMMERCE",
    "Let the product\nanswer.",
    "Typed inventory cards, chosen by the model — never improvised markup.",
    lime
  ),
  (
    NSRect(x: 577, y: 29, width: 527, height: 1028),
    "vitrine-finance.png",
    "COMPLIANCE BY CONSTRUCTION",
    "Numbers that\nstay honest.",
    "Interactive financing with the disclosure structurally attached.",
    lime
  ),
  (
    NSRect(x: 1126, y: 29, width: 527, height: 1028),
    "vitrine-white-label.png",
    "WHITE-LABEL BY DESIGN",
    "One registry.\nEvery brand.",
    "Change the tenant, palette and inventory — not the trusted renderer.",
    violet
  ),
]

let scenes = cropDefinitions.map { definition in
  Scene(
    image: crop(source, sourceRect: definition.0),
    outputName: definition.1,
    eyebrow: definition.2,
    title: definition.3,
    detail: definition.4,
    accent: definition.5
  )
}

let canvas = NSSize(width: 1200, height: 675)
let sceneHoldDuration = 2.5

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

func drawProductFrame(
  scene: Scene,
  next: Scene?,
  progress: CGFloat,
  in outer: NSRect
) {
  NSGraphicsContext.current?.saveGraphicsState()
  let shadow = NSShadow()
  shadow.shadowColor = ink.withAlphaComponent(0.16)
  shadow.shadowBlurRadius = 34
  shadow.shadowOffset = NSSize(width: 0, height: 18)
  shadow.set()
  let shell = NSBezierPath(
    roundedRect: outer,
    xRadius: 38,
    yRadius: 38
  )
  ink.setFill()
  shell.fill()
  NSGraphicsContext.current?.restoreGraphicsState()

  let machinedEdge = outer.insetBy(dx: 4, dy: 4)
  let edge = NSBezierPath(
    roundedRect: machinedEdge,
    xRadius: 34,
    yRadius: 34
  )
  NSColor(calibratedWhite: 0.10, alpha: 1).setFill()
  edge.fill()
  NSColor.white.withAlphaComponent(0.24).setStroke()
  edge.lineWidth = 0.8
  edge.stroke()

  let screen = outer.insetBy(dx: 12, dy: 12)
  NSGraphicsContext.current?.saveGraphicsState()
  NSBezierPath(
    roundedRect: screen,
    xRadius: 28,
    yRadius: 28
  ).addClip()
  surface.setFill()
  screen.fill()
  NSGraphicsContext.current?.imageInterpolation = .high
  scene.image.draw(
    in: screen,
    from: NSRect(origin: .zero, size: scene.image.size),
    operation: .sourceOver,
    fraction: 1 - progress,
    respectFlipped: true,
    hints: [.interpolation: NSImageInterpolation.high]
  )
  if let next {
    next.image.draw(
      in: screen,
      from: NSRect(origin: .zero, size: next.image.size),
      operation: .sourceOver,
      fraction: progress,
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
  }
  NSGraphicsContext.current?.restoreGraphicsState()
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

    drawProductFrame(
      scene: scene,
      next: next,
      progress: progress,
      in: NSRect(x: 74, y: 35, width: 324, height: 605)
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

func writeCGPNG(_ image: CGImage, to url: URL) throws {
  let bitmap = NSBitmapImageRep(cgImage: image)
  guard let data = bitmap.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "VitrineReadmeMedia", code: 4)
  }
  try data.write(to: url)
}

try FileManager.default.createDirectory(
  at: assetDirectory,
  withIntermediateDirectories: true
)

let sourceCG = try cgImage(source)
for index in scenes.indices {
  let sourceRect = cropDefinitions[index].0
  let pixelRect = CGRect(
    x: sourceRect.minX,
    y: source.size.height - sourceRect.maxY,
    width: sourceRect.width,
    height: sourceRect.height
  )
  guard let cropped = sourceCG.cropping(to: pixelRect) else {
    throw NSError(domain: "VitrineReadmeMedia", code: 5)
  }
  try writeCGPNG(
    cropped,
    to: assetDirectory.appendingPathComponent(scenes[index].outputName)
  )
}

let gifURL = assetDirectory.appendingPathComponent("vitrine-showcase.gif")
guard let destination = CGImageDestinationCreateWithURL(
  gifURL as CFURL,
  UTType.gif.identifier as CFString,
  scenes.count * 7,
  nil
) else {
  throw NSError(domain: "VitrineReadmeMedia", code: 6)
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
  throw NSError(domain: "VitrineReadmeMedia", code: 7)
}

if let poster {
  try writePNG(
    poster,
    to: assetDirectory.appendingPathComponent("vitrine-showcase-poster.png")
  )
}

print("Generated Vitrine README media in \(assetDirectory.path)")
