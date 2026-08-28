import SwiftUI

struct SessionPane: View {
    @Environment(AppState.self) private var app
    var session: Session
    var compact = false

    var body: some View {
        let live = app.sessions.first { $0.id == session.id } ?? session
        let p = CatalogProviders.resolve(live.providerId, custom: app.customProviders)
        let models = Catalog.modelsFor(live.providerId, extras: p.models)
        let efforts = Catalog.effortsFor(live.providerId)

        return VStack(spacing: 0) {
            header(live, models: models, efforts: efforts, provider: p)
            if live.messages.isEmpty {
                empty(p.short, live)
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 14) {
                            ForEach(live.messages) { m in
                                MessageBubble(message: m, compact: compact)
                                    .id(m.id)
                            }
                        }
                        .padding(.horizontal, compact ? 12 : 20)
                        .padding(.vertical, 16)
                    }
                    .onChange(of: live.messages.count) { _, _ in
                        if let last = live.messages.last {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }
            ComposerView(session: live)
        }
        .background(WC.window)
    }

    private func header(_ live: Session, models: [ModelOpt], efforts: [EffortOpt], provider: Provider) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Text(live.title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(WC.foreground)
                        .lineLimit(1)
                    StatusLabel(status: live.status)
                }
                HStack(spacing: 8) {
                    ProviderChip(id: live.providerId, name: provider.short)
                    Label(live.cwd, systemImage: "folder")
                        .font(.system(size: 11))
                        .foregroundStyle(WC.mutedFg)
                        .lineLimit(1)
                }
            }
            Spacer()
            Picker("Model", selection: Binding(
                get: { live.model },
                set: { app.setSessionModel(live.id, $0) }
            )) {
                ForEach(models) { m in
                    Text(m.label).tag(m.id)
                }
                if !models.contains(where: { $0.id == live.model }) {
                    Text(live.model).tag(live.model)
                }
            }
            .labelsHidden()
            .frame(maxWidth: 150)
            Picker("Effort", selection: Binding(
                get: { live.effort },
                set: { app.setSessionEffort(live.id, $0) }
            )) {
                ForEach(efforts) { e in
                    Text(e.label).tag(e.id)
                }
            }
            .labelsHidden()
            .frame(maxWidth: 110)
            .help(efforts.first { $0.id == live.effort }?.hint ?? "")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(WC.window)
        .overlay(alignment: .bottom) { Rectangle().fill(WC.border).frame(height: 1) }
    }

    private func empty(_ name: String, _ live: Session) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Spacer()
            Text("Talk to \(name)")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(WC.foreground)
            Text("Working in \(live.cwd) · \(live.model) · \(Catalog.effortLabel(live.providerId, effort: live.effort)). Attach files with +, @ another session, or type / for commands.")
                .font(.system(size: 13))
                .foregroundStyle(WC.mutedFg)
                .frame(maxWidth: 420, alignment: .leading)
            Spacer()
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}
