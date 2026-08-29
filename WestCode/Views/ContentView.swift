import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        ZStack {
            WC.window.ignoresSafeArea()
            VStack(spacing: 0) {
                titleBar
                    .frame(maxWidth: .infinity)
                HStack(spacing: 0) {
                    SidebarView()
                        .frame(width: 240)
                        .frame(maxHeight: .infinity)
                    Rectangle()
                        .fill(WC.border)
                        .frame(width: 1)
                        .frame(maxHeight: .infinity)
                    desk
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            if app.newOpen {
                NewSessionSheet()
            }
            if app.onboarding {
                OnboardingView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .preferredColorScheme(.dark)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { _ in
                Task { @MainActor in app.clock = Date() }
            }
        }
    }

    private var titleBar: some View {
        HStack(spacing: 12) {
            Color.clear.frame(width: 70)
            Spacer()
            HStack(spacing: 8) {
                WestCodeMark().frame(width: 16, height: 16)
                Text("WestCode")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(WC.foreground)
            }
            Spacer()
            HStack(spacing: 4) {
                Button {
                    app.setView(.mosaic)
                } label: {
                    Image(systemName: "square.grid.2x2")
                }
                .buttonStyle(WCIconButtonStyle(active: app.view == .mosaic))
                .help("Mosaic")

                Button {
                    if app.sessions.count >= 2 {
                        app.setSplit(app.sessions[0].id, app.sessions[1].id)
                    }
                } label: {
                    Image(systemName: "rectangle.split.2x1")
                }
                .buttonStyle(WCIconButtonStyle(active: app.view == .split))
                .help("Split")

                Button {
                    app.newOpen = true
                } label: {
                    Label("New", systemImage: "plus")
                        .labelStyle(.titleAndIcon)
                }
                .buttonStyle(WCButtonStyle(prominent: true))
            }
            .padding(.trailing, 12)
        }
        .frame(height: 44)
        .background(WC.surface)
        .overlay(alignment: .bottom) { Rectangle().fill(WC.border).frame(height: 1) }
    }

    @ViewBuilder
    private var desk: some View {
        switch app.view {
        case .mosaic:
            MosaicView()
        case .providers:
            ProvidersView()
        case .library:
            LibraryView()
        case .focus:
            if let s = app.active {
                SessionPane(session: s)
            } else {
                MosaicView()
            }
        case .split:
            if app.splitIds.count == 2,
               let a = app.sessions.first(where: { $0.id == app.splitIds[0] }),
               let b = app.sessions.first(where: { $0.id == app.splitIds[1] }) {
                HSplitView {
                    SessionPane(session: a, compact: true)
                    SessionPane(session: b, compact: true)
                }
            } else {
                MosaicView()
            }
        }
    }
}

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        VStack(spacing: 14) {
            WestCodeMark().frame(width: 48, height: 48)
            Text("WestCode").font(.title2.weight(.semibold))
            Text("All your coding agents. One desk.")
                .foregroundStyle(WC.mutedFg)
            Text("Claude Code, Codex, Cursor, and Grok over ACP. Subscription CLIs — no API keys unless you add them.")
                .font(.system(size: 12))
                .foregroundStyle(WC.subtle)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 320)
            Button("Close") { dismiss() }
                .buttonStyle(WCButtonStyle(prominent: true))
        }
        .padding(28)
        .frame(width: 400)
        .background(WC.window)
    }
}
