import SwiftUI

struct LibraryView: View {
    @Environment(AppState.self) private var app
    @State private var tab: AddonKind = .skill
    @State private var importing = false
    @State private var inName = ""
    @State private var inRepo = ""
    @State private var inSummary = ""
    @State private var inInstall = ""

    var body: some View {
        let items = LibraryCatalog.combined(custom: app.customAddons).filter { $0.kind == tab }
        return VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Library")
                    .font(.system(size: 22, weight: .semibold))
                Spacer()
                Picker("", selection: $tab) {
                    Text("Skills").tag(AddonKind.skill)
                    Text("Plugins").tag(AddonKind.plugin)
                    Text("Connectors").tag(AddonKind.connector)
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 280)
                Button("Import") { importing = true }
                    .buttonStyle(WCButtonStyle())
            }
            .padding(20)
            Text("Sourced from GitHub — anthropics/skills, knowledge-work-plugins, community packs, and official MCP servers. Enable what this desk should load.")
                .font(.system(size: 13))
                .foregroundStyle(WC.mutedFg)
                .padding(.horizontal, 20)
            ScrollView {
                VStack(spacing: 10) {
                    ForEach(items) { a in
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(a.name).font(.system(size: 14, weight: .medium))
                                Text(a.summary).font(.system(size: 12)).foregroundStyle(WC.mutedFg)
                                Text("\(a.source) · \(a.repo)")
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundStyle(WC.subtle)
                            }
                            Spacer()
                            Toggle("", isOn: Binding(
                                get: { app.enabledAddons.contains(a.id) },
                                set: { _ in app.toggleAddon(a.id) }
                            ))
                            .labelsHidden()
                            .toggleStyle(.switch)
                            if a.custom == true {
                                Button("Remove") { app.removeAddon(a.id) }
                                    .buttonStyle(WCButtonStyle())
                            }
                        }
                        .padding(12)
                        .background(WC.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(WC.border, lineWidth: 1))
                    }
                }
                .padding(20)
            }
        }
        .background(WC.window)
        .sheet(isPresented: $importing) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Import \(tab.rawValue)").font(.system(size: 16, weight: .semibold))
                TextField("Name", text: $inName)
                TextField("GitHub repo (org/name)", text: $inRepo)
                TextField("Summary", text: $inSummary)
                TextField("Install command", text: $inInstall)
                HStack {
                    Spacer()
                    Button("Cancel") { importing = false }.buttonStyle(WCButtonStyle())
                    Button("Add") {
                        app.importAddon(Addon(
                            id: "", kind: tab, name: inName, source: "Custom",
                            repo: inRepo, summary: inSummary,
                            providers: ["*"], install: inInstall, custom: true
                        ))
                        inName = ""; inRepo = ""; inSummary = ""; inInstall = ""
                        importing = false
                    }
                    .buttonStyle(WCButtonStyle(prominent: true))
                    .disabled(inName.isEmpty)
                }
            }
            .textFieldStyle(.roundedBorder)
            .padding(20)
            .frame(width: 400)
        }
    }
}
