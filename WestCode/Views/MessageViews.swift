import SwiftUI

struct MessageBubble: View {
    var message: ChatMessage
    var compact = false

    var body: some View {
        switch message.role {
        case .system:
            Text(plain)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(WC.subtle)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(WC.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        case .user:
            VStack(alignment: .trailing, spacing: 6) {
                if let atts = message.attachments, !atts.isEmpty {
                    HStack {
                        ForEach(atts) { a in
                            Label("\(a.name) · \(Pretty.size(a.size))", systemImage: "doc")
                                .font(.system(size: 10))
                                .padding(6)
                                .background(WC.muted)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                }
                Text(plain)
                    .font(.system(size: 13))
                    .foregroundStyle(WC.foreground)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(WC.muted)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        case .agent:
            VStack(alignment: .leading, spacing: 8) {
                Text("Message from \(message.fromProviderId?.capitalized ?? "agent")")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(WC.warn)
                blockStack
            }
        case .assistant:
            blockStack
        }
    }

    private var plain: String {
        if case .text(let t) = message.blocks.first { return t }
        return ParseAgent.blocksToPlain(message.blocks)
    }

    private var blockStack: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(message.blocks.enumerated()), id: \.offset) { _, b in
                switch b {
                case .think(let t):
                    Text(t)
                        .font(.system(size: 12).italic())
                        .foregroundStyle(WC.subtle)
                case .text(let t):
                    Text(t)
                        .font(.system(size: 13))
                        .foregroundStyle(WC.foreground)
                        .textSelection(.enabled)
                case .tool(let t):
                    ToolCard(block: t)
                }
            }
            if message.streaming {
                ProgressView().controlSize(.small)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ToolCard: View {
    var block: Block.ToolBlock
    @State private var open = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundStyle(WC.mutedFg)
                    .frame(width: 14)
                Text(block.name)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(WC.foreground)
                Text(block.to ?? block.path ?? block.command ?? "")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(WC.mutedFg)
                    .lineLimit(1)
                Spacer()
                Circle()
                    .fill(block.status == .running ? WC.warn : (block.status == .error ? WC.danger : WC.success))
                    .frame(width: 6, height: 6)
            }
            if open || block.status == .running || !block.content.isEmpty && block.content.count < 400 {
                Text(block.content)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(WC.mutedFg)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(10)
        .background(WC.surface2)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(WC.border, lineWidth: 1)
        )
        .onTapGesture { open.toggle() }
    }

    private var icon: String {
        switch block.name.lowercased() {
        case "read": return "doc.text"
        case "edit", "write": return "pencil"
        case "bash": return "terminal"
        case "sendmessage": return "paperplane"
        case "listagents": return "person.2"
        default: return "wrench.and.screwdriver"
        }
    }
}
