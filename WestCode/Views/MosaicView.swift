import SwiftUI

struct MosaicView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(app.sessions) { s in
                    card(s)
                }
            }
            .padding(16)
        }
        .background(WC.window)
    }

    private func card(_ s: Session) -> some View {
        let p = CatalogProviders.resolve(s.providerId, custom: app.customProviders)
        let last = ParseAgent.lastSnippet(s.messages.last?.blocks ?? [])
        return Button {
            app.setActive(s.id)
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    ProviderChip(id: s.providerId, name: p.short)
                    Spacer()
                    StatusLabel(status: s.status)
                }
                Text(s.title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(WC.foreground)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                Text(last)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(WC.mutedFg)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
                HStack {
                    Label(s.cwd, systemImage: "folder")
                        .lineLimit(1)
                    Spacer()
                    Text(Catalog.effortLabel(s.providerId, effort: s.effort))
                    Text("·")
                    Text(RelTime.format(s.updatedAt, now: app.clock))
                }
                .font(.system(size: 10))
                .foregroundStyle(WC.subtle)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 168, alignment: .topLeading)
            .background(WC.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(WC.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct ProviderChip: View {
    var id: String
    var name: String
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(WC.providerColor(id)).frame(width: 7, height: 7)
            Text(name).font(.system(size: 11, weight: .medium))
        }
        .foregroundStyle(WC.foreground)
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(WC.muted)
        .clipShape(Capsule())
    }
}

struct StatusLabel: View {
    var status: SessionStatus
    var body: some View {
        Text(status.rawValue)
            .font(.system(size: 10, weight: .medium))
            .foregroundStyle(WC.statusColor(status))
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .background(WC.statusColor(status).opacity(0.12))
            .clipShape(Capsule())
    }
}
