import SwiftUI

struct OnboardingView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 10) {
                    WestCodeMark().frame(width: 28, height: 28)
                    Text("WestCode")
                        .font(.system(size: 20, weight: .semibold))
                }
                Text("All your coding agents. One desk.")
                    .font(.system(size: 14))
                    .foregroundStyle(WC.mutedFg)
                VStack(alignment: .leading, spacing: 10) {
                    bullet("Empty desk", "First launch has no sessions and no connections. Demo chats are gone.")
                    bullet("Connect for real", "Claude, Codex, and Cursor keep their own login. Point WestCode at the CLI, or add an API key for Grok / custom endpoints.")
                    bullet("Then start a session", "Pick a connected provider and a folder on disk. Chats talk to that CLI — they are not simulated.")
                    bullet("Desk bus", "Once two sessions are live, they can message each other with /msg, @mentions, or SendMessage.")
                }
                HStack {
                    Spacer()
                    Button("Open the desk") { app.dismissOnboarding() }
                        .buttonStyle(WCButtonStyle(prominent: true))
                }
            }
            .padding(28)
            .frame(width: 480)
            .background(WC.window)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(WC.border, lineWidth: 1))
        }
    }

    private func bullet(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.system(size: 13, weight: .medium))
            Text(body).font(.system(size: 12)).foregroundStyle(WC.mutedFg)
        }
    }
}

struct SettingsView: View {
    @Environment(AppState.self) private var app
    @State private var grokKey = ""

    var body: some View {
        Form {
            Section("xAI / Grok") {
                SecureField("API key", text: $grokKey)
                Button("Save key") {
                    KeychainStore.setAPIKey(grokKey, for: "grok")
                    if !grokKey.isEmpty { app.connectProvider("grok") }
                }
                Text("Optional. If the Grok CLI is installed, WestCode uses ACP instead.")
                    .foregroundStyle(WC.mutedFg)
            }
            Section("About") {
                Text("WestCode 1.0 — ACP client for Claude Code, Codex, Cursor, and Grok.")
            }
        }
        .formStyle(.grouped)
        .frame(width: 420, height: 240)
        .onAppear { grokKey = KeychainStore.apiKey(for: "grok") ?? "" }
    }
}
