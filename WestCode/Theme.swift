import SwiftUI

enum WC {
    static let background = Color(red: 12 / 255, green: 12 / 255, blue: 14 / 255)
    static let foreground = Color(red: 243 / 255, green: 241 / 255, blue: 236 / 255)
    static let surface = Color(red: 20 / 255, green: 20 / 255, blue: 22 / 255)
    static let surface2 = Color(red: 27 / 255, green: 27 / 255, blue: 30 / 255)
    static let muted = Color(red: 38 / 255, green: 38 / 255, blue: 42 / 255)
    static let mutedFg = Color(red: 156 / 255, green: 154 / 255, blue: 150 / 255)
    static let subtle = Color(red: 111 / 255, green: 109 / 255, blue: 105 / 255)
    static let accent = Color(red: 216 / 255, green: 212 / 255, blue: 204 / 255)
    static let accentFg = Color(red: 20 / 255, green: 20 / 255, blue: 22 / 255)
    static let border = Color.white.opacity(0.10)
    static let borderStrong = Color.white.opacity(0.18)
    static let desktop = Color(red: 8 / 255, green: 8 / 255, blue: 9 / 255)
    static let menubar = Color(red: 18 / 255, green: 18 / 255, blue: 20 / 255).opacity(0.92)
    static let window = Color(red: 17 / 255, green: 17 / 255, blue: 19 / 255)
    static let claude = Color(red: 196 / 255, green: 122 / 255, blue: 90 / 255)
    static let codex = Color(red: 106 / 255, green: 143 / 255, blue: 122 / 255)
    static let cursor = Color(red: 122 / 255, green: 136 / 255, blue: 153 / 255)
    static let grok = Color(red: 216 / 255, green: 212 / 255, blue: 204 / 255)
    static let danger = Color(red: 180 / 255, green: 84 / 255, blue: 76 / 255)
    static let success = Color(red: 106 / 255, green: 143 / 255, blue: 122 / 255)
    static let warn = Color(red: 196 / 255, green: 165 / 255, blue: 116 / 255)
    static let trafficClose = Color(red: 1, green: 95 / 255, blue: 87 / 255)
    static let trafficMin = Color(red: 254 / 255, green: 188 / 255, blue: 46 / 255)
    static let trafficMax = Color(red: 40 / 255, green: 200 / 255, blue: 64 / 255)

    static func providerColor(_ id: String) -> Color {
        switch id {
        case "claude": return claude
        case "codex": return codex
        case "cursor": return cursor
        case "grok": return grok
        default: return accent
        }
    }

    static func statusColor(_ status: SessionStatus) -> Color {
        switch status {
        case .running: return warn
        case .waiting: return success
        case .idle: return mutedFg
        case .error: return danger
        }
    }
}

struct WCButtonStyle: ButtonStyle {
    var prominent = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(prominent ? WC.accentFg : WC.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(prominent ? WC.accent : WC.surface2)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(WC.border, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.78 : 1)
    }
}

struct WCIconButtonStyle: ButtonStyle {
    var active = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(WC.foreground)
            .frame(width: 28, height: 28)
            .background(active ? WC.muted : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
