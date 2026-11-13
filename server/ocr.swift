import Foundation
import Vision
import ImageIO

// The image remains on this Mac; Vision does not require a model API key.
guard CommandLine.arguments.count == 2,
      let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let width = properties[kCGImagePropertyPixelWidth] as? Int,
      let height = properties[kCGImagePropertyPixelHeight] as? Int,
      width > 0, height > 0, width <= 12000, height <= 24000,
      width * height <= 40000000,
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("Invalid or oversized image", stderr); exit(1)
}
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "en-US"]
request.usesLanguageCorrection = true
do {
    try VNImageRequestHandler(cgImage: image).perform([request])
    let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    FileHandle.standardOutput.write(Data(text.utf8))
} catch { fputs("Text recognition failed", stderr); exit(2) }
