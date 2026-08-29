import SwiftUI

struct SidebarView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            navRow("Mosaic", "square.grid.2x2", .mosaic)
            navRow("Connections", "link", .providers)
            navRow("Library", "books.vertical", .library)
            Rectangle().fill(WC.border).frame(height: 1).padding(.vertical, 8)
            Text("SESSIONS")
                .font(.system(size: 10, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(WC.subtle)
                .padding(.horizontal, 14)
                .padding(.bottom, 6)
            ScrollView {
                VStack(spacing: 2) {
                    if app.sessions.isEmpty {
                        Text("No sessions yet")
                            .font(.system(size: 11))
                            .foregroundStyle(WC.subtle)
                            .padding(.horizontal, 8)
                            .padding(.top, 8)
                    }
                    ForEach(app.sessions) { s in
                        sessionRow(s)
                    }
                }
                .padding(.horizontal, 8)
            }
            Spacer(minLength: 0)
        }
        .padding(.top, 10)
        .background(WC.surface)
    }

    private func navRow(_ title: String, _ icon: String, _ view: LayoutView) -> some View {
        Button {
            app.setView(view)
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon).frame(width: 14)
                Text(title)
                Spacer()
            }
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(app.view == view ? WC.foreground : WC.mutedFg)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(app.view == view ? WC.muted : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 8)
    }

    private func sessionRow(_ s: Session) -> some View {
        let p = CatalogProviders.resolve(s.providerId, custom: app.customProviders)
        let active = app.activeId == s.id && app.view == .focus
        return Button {
            app.setActive(s.id)
        } label: {
            HStack(alignment: .top, spacing: 8) {
                Circle()
                    .fill(WC.providerColor(s.providerId))
                    .frame(width: 7, height: 7)
                    .padding(.top, 5)
                VStack(alignment: .leading, spacing: 2) {
                    Text(s.title)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(WC.foreground)
                        .lineLimit(2)
                    HStack(spacing: 6) {
                        Text(p.short)
                        Text("·")
                        Text(s.model)
                    }
                    .font(.system(size: 10))
                    .foregroundStyle(WC.mutedFg)
                    .lineLimit(1)
                }
                Spacer(minLength: 0)
                Circle()
                    .fill(WC.statusColor(s.status))
                    .frame(width: 6, height: 6)
                    .padding(.top, 6)
            }
            .padding(8)
            .background(active ? WC.muted : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
        .contextMenu {
            Button("Delete Session", role: .destructive) {
                app.deleteSession(s.id)
            }
        }
    }
}
