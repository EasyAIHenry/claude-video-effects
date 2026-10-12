// Person matte + face boxes for every frame of a video with Apple Vision.
// usage: matte <in.mp4> <out_dir> [step] [divisor]
//   out_dir/%05d.png  grayscale person matte at (W/div x H/div)
//   out_dir/faces.jsonl  one line per processed frame: {"i":n,"faces":[[x0,y0,x1,y1],...]} in pixels of the input, top-left origin
import Foundation
import AVFoundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let step = args.count > 3 ? Int(args[3])! : 1
let div = args.count > 4 ? Int(args[4])! : 4
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let asset = AVURLAsset(url: url)
let track = asset.tracks(withMediaType: .video)[0]
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(out); reader.startReading()
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
let faceReq = VNDetectFaceRectanglesRequest()
let ctx = CIContext()
FileManager.default.createFile(atPath: outDir.appendingPathComponent("faces.jsonl").path, contents: nil)
let fh = try! FileHandle(forWritingTo: outDir.appendingPathComponent("faces.jsonl"))
var i = 0
while let sb = out.copyNextSampleBuffer() {
    defer { i += 1 }
    if i % step != 0 { continue }
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    let W = CVPixelBufferGetWidth(pb), H = CVPixelBufferGetHeight(pb)
    let h = VNImageRequestHandler(cvPixelBuffer: pb, options: [:])
    try? h.perform([req, faceReq])
    var boxes: [String] = []
    for f in faceReq.results ?? [] {
        let b = f.boundingBox
        let x0 = Int(b.minX * CGFloat(W)), x1 = Int(b.maxX * CGFloat(W))
        let y0 = Int((1 - b.maxY) * CGFloat(H)), y1 = Int((1 - b.minY) * CGFloat(H))
        boxes.append("[\(x0),\(y0),\(x1),\(y1)]")
    }
    fh.write("{\"i\":\(i),\"faces\":[\(boxes.joined(separator: ","))]}\n".data(using: .utf8)!)
    guard let m = req.results?.first?.pixelBuffer else { continue }
    var ci = CIImage(cvPixelBuffer: m)
    let sx = CGFloat(W) / CGFloat(div) / ci.extent.width, sy = CGFloat(H) / CGFloat(div) / ci.extent.height
    ci = ci.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    let cg = ctx.createCGImage(ci, from: CGRect(x: 0, y: 0, width: W / div, height: H / div), format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())!
    let f = outDir.appendingPathComponent(String(format: "%05d.png", i))
    let d = CGImageDestinationCreateWithURL(f as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, cg, nil); CGImageDestinationFinalize(d)
}
fh.closeFile()
print("frames", i)
