import SwiftUI

struct WestCodeMark: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            func helix(_ flip: Bool, opacity: Double) {
                var p = Path()
                p.move(to: CGPoint(x: flip ? w * 0.67 : w * 0.33, y: h * 0.12))
                p.addCurve(
                    to: CGPoint(x: flip ? w * 0.33 : w * 0.67, y: h * 0.5),
                    control1: CGPoint(x: flip ? w * 0.2 : w * 0.8, y: h * 0.28),
                    control2: CGPoint(x: flip ? w * 0.8 : w * 0.2, y: h * 0.36)
                )
                p.addCurve(
                    to: CGPoint(x: flip ? w * 0.67 : w * 0.33, y: h * 0.88),
                    control1: CGPoint(x: flip ? w * 0.2 : w * 0.8, y: h * 0.64),
                    control2: CGPoint(x: flip ? w * 0.8 : w * 0.2, y: h * 0.72)
                )
                ctx.stroke(
                    p,
                    with: .color(WC.foreground.opacity(opacity)),
                    style: StrokeStyle(lineWidth: max(1.4, w * 0.07), lineCap: .round)
                )
            }
            helix(false, opacity: 1)
            helix(true, opacity: 0.55)
        }
        .accessibilityHidden(true)
    }
}
