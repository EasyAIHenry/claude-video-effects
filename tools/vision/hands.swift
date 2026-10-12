// Hand pose per frame with Apple Vision. usage: hands <in.mp4> <start_s> <dur_s> <out.jsonl>
// one line per frame: {"t":sec,"hands":[{"chir":"left|right","pts":{"wrist":[x,y,c],...}}]} in input pixels, top-left origin
import Foundation
import AVFoundation
import Vision
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let t0 = Double(a[2])!, dur = Double(a[3])!
let track = asset.tracks(withMediaType: .video)[0]
let reader = try! AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: CMTime(seconds: t0, preferredTimescale: 600), duration: CMTime(seconds: dur, preferredTimescale: 600))
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(out); reader.startReading()
FileManager.default.createFile(atPath: a[4], contents: nil)
let fh = FileHandle(forWritingAtPath: a[4])!
let names: [(String, VNHumanHandPoseObservation.JointName)] = [("wrist", .wrist), ("thumbTip", .thumbTip), ("indexMCP", .indexMCP), ("middleMCP", .middleMCP), ("ringMCP", .ringMCP), ("littleMCP", .littleMCP), ("middleTip", .middleTip), ("indexTip", .indexTip), ("littleTip", .littleTip)]
while let sb = out.copyNextSampleBuffer() {
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    let t = CMSampleBufferGetPresentationTimeStamp(sb).seconds
    let W = Double(CVPixelBufferGetWidth(pb)), H = Double(CVPixelBufferGetHeight(pb))
    let req = VNDetectHumanHandPoseRequest(); req.maximumHandCount = 2
    try? VNImageRequestHandler(cvPixelBuffer: pb, options: [:]).perform([req])
    var hs: [String] = []
    for o in req.results ?? [] {
        var ps: [String] = []
        for (n, j) in names {
            if let p = try? o.recognizedPoint(j), p.confidence > 0.2 {
                ps.append("\"\(n)\":[\(Int(p.location.x * W)),\(Int((1 - p.location.y) * H)),\(String(format: "%.2f", p.confidence))]")
            }
        }
        let ch = o.chirality == .left ? "left" : (o.chirality == .right ? "right" : "unknown")
        hs.append("{\"chir\":\"\(ch)\",\"pts\":{\(ps.joined(separator: ","))}}")
    }
    fh.write("{\"t\":\(String(format: "%.3f", t)),\"hands\":[\(hs.joined(separator: ","))]}\n".data(using: .utf8)!)
}
fh.closeFile()
