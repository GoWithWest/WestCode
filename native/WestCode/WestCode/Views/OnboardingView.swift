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
                    bullet("Subscription CLIs", "Claude Code, Codex, and Cursor keep their own login. WestCode speaks ACP over stdio — no API keys.")
                    bullet("Pick a provider", "New session → choose Claude, Codex, Cursor, or Grok, then a folder.")
                    bullet("Desk bus", "Sessions message each other with /msg, @mentions, or SendMessage. Claude’s ListAgents pattern, across every provider.")
                    bullet("Library", "Skills, plugins, and MCP connectors from GitHub. Enable what this Mac should load.")
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
