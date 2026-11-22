// Renders a short H.264 MP4 (an animated skyline) for demo property data. macOS only (AVFoundation).
// Usage: swift make_demo_video.swift <output.mp4> <hue 0-1> [seconds]
import AVFoundation
import CoreGraphics
import Foundation

let args = CommandLine.arguments
guard args.count >= 3, let hue = Double(args[2]) else {
    FileHandle.standardError.write("usage: make_demo_video.swift <output.mp4> <hue 0-1> [seconds]\n".data(using: .utf8)!)
    exit(2)
}
let output = URL(fileURLWithPath: args[1])
let seconds = args.count > 3 ? Int(args[3]) ?? 4 : 4
let width = 640, height = 360, fps: Int32 = 24
try? FileManager.default.removeItem(at: output)

let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 600_000],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func color(_ h: Double, _ s: Double, _ b: Double) -> CGColor {
    // HSB to RGB.
    let i = floor(h * 6), f = h * 6 - i
    let p = b * (1 - s), q = b * (1 - f * s), t = b * (1 - (1 - f) * s)
    let (r, g, bl): (Double, Double, Double)
    switch Int(i) % 6 {
    case 0: (r, g, bl) = (b, t, p)
    case 1: (r, g, bl) = (q, b, p)
    case 2: (r, g, bl) = (p, b, t)
    case 3: (r, g, bl) = (p, q, b)
    case 4: (r, g, bl) = (t, p, b)
    default: (r, g, bl) = (b, p, q)
    }
    return CGColor(red: r, green: g, blue: bl, alpha: 1)
}

// Building outlines: x, width, height (fractions of the frame).
let buildings: [(Double, Double, Double)] = [
    (0.02, 0.12, 0.45), (0.15, 0.09, 0.62), (0.26, 0.14, 0.38), (0.42, 0.10, 0.74),
    (0.54, 0.13, 0.50), (0.69, 0.08, 0.66), (0.79, 0.15, 0.42),
]
let frames = seconds * Int(fps)
for frame in 0..<frames {
    while !input.isReadyForMoreMediaData { usleep(1000) }
    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
    guard let pixels = buffer else { fatalError("no pixel buffer") }
    CVPixelBufferLockBaseAddress(pixels, [])
    let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixels), width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixels), space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    let progress = Double(frame) / Double(frames)
    // Sky: day to dusk over the clip.
    let sky = CGGradient(colorsSpace: nil, colors: [
        color(hue, 0.55, 0.95 - 0.35 * progress), color((hue + 0.08).truncatingRemainder(dividingBy: 1), 0.35, 0.75),
    ] as CFArray, locations: [0, 1])!
    context.drawLinearGradient(sky, start: CGPoint(x: 0, y: height), end: .zero, options: [])
    // Sun moving across.
    context.setFillColor(CGColor(red: 1, green: 0.92, blue: 0.6, alpha: 0.9))
    let sunX = Double(width) * (0.1 + 0.8 * progress)
    context.fillEllipse(in: CGRect(x: sunX - 22, y: Double(height) * 0.72, width: 44, height: 44))
    // Skyline with lit windows.
    for (index, b) in buildings.enumerated() {
        let rect = CGRect(x: b.0 * Double(width), y: 0, width: b.1 * Double(width), height: b.2 * Double(height))
        context.setFillColor(color(hue, 0.25, 0.22 + 0.04 * Double(index % 3)))
        context.fill(rect)
        context.setFillColor(CGColor(red: 1, green: 0.85, blue: 0.45, alpha: 0.35 + 0.6 * progress))
        var y = 12.0
        while y < rect.height - 14 {
            var x = rect.minX + 6
            while x < rect.maxX - 10 {
                if (Int(x) + Int(y) + index) % 3 != 0 { context.fill(CGRect(x: x, y: y, width: 6, height: 8)) }
                x += 12
            }
            y += 16
        }
    }
    CVPixelBufferUnlockBaseAddress(pixels, [])
    adaptor.append(pixels, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: fps))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed {
    FileHandle.standardError.write("failed: \(String(describing: writer.error))\n".data(using: .utf8)!)
    exit(1)
}
