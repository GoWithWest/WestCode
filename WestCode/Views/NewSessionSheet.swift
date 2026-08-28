import SwiftUI

struct NewSessionSheet: View {
    @Environment(AppState.self) private var app
    @State private var providerId = "claude"
    @State private var projectId = "harbor"
    @State private var prompt = ""
    @State private var cwd = ""
    @State private var model: String = BuiltinProviders.claude.defaultModel
    @State private var effort: String = Catalog.defaultEffortFor("claude")
    @State private var files: [Attachment] = []

    private var providers: [Provider] { CatalogProviders.all(app.customProviders) }
    private var selected: Provider { CatalogProviders.resolve(providerId, custom: app.customProviders) }

    var body: some View {
        ZStack {
            Color.black.opacity(0.45).ignoresSafeArea()
                .onTapGesture { app.newOpen = false }
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("New session")
                        .font(.system(size: 16, weight: .semibold))
                    Spacer()
                    Button { app.newOpen = false } label: {
                        Image(systemName: "xmark")
                    }
                    .buttonStyle(WCIconButtonStyle())
                }

                Text("PROVIDER").sectionLabel()
                HStack(spacing: 8) {
                    ForEach(providers) { p in
                        Button {
                            providerId = p.id
                            model = p.defaultModel
                            effort = Catalog.defaultEffortFor(p.id)
                        } label: {
                            HStack(spacing: 6) {
                                Circle().fill(WC.providerColor(p.id)).frame(width: 7, height: 7)
                                Text(p.short)
                            }
                            .font(.system(size: 12, weight: .medium))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(providerId == p.id ? WC.muted : WC.surface2)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(WC.border, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(WC.foreground)
                    }
                }

                Text("FOLDER").sectionLabel()
                HStack(spacing: 8) {
                    TextField("~/src/harbor", text: $cwd)
                        .textFieldStyle(.plain)
                        .padding(8)
                        .background(WC.surface2)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    Button("Browse") {
                        if let url = FilePicking.pickDirectory() {
                            cwd = FilePicking.prettyPath(url.path)
                            app.rememberFolder(RecentFolder(
                                name: url.lastPathComponent,
                                path: FilePicking.prettyPath(url.path),
                                language: FilePicking.language(for: url),
                                hint: "Opened from disk"
                            ))
                        }
                    }
                    .buttonStyle(WCButtonStyle())
                }
                HStack {
                    ForEach(Projects.all) { p in
                        chip(p.name, active: projectId == p.id && cwd.isEmpty) {
                            projectId = p.id
                            cwd = p.path
                        }
                    }
                }
                if !app.recentFolders.isEmpty {
                    HStack {
                        ForEach(app.recentFolders) { f in
                            chip(f.name, active: cwd == f.path) { cwd = f.path }
                        }
                    }
                }

                HStack {
                    Picker("Model", selection: $model) {
                        ForEach(Catalog.modelsFor(providerId, extras: selected.models)) { m in
                            Text(m.label).tag(m.id)
                        }
                    }
                    Picker("Effort", selection: $effort) {
                        ForEach(Catalog.effortsFor(providerId)) { e in
                            Text(e.label).tag(e.id)
                        }
                    }
                }

                Text("TASK").sectionLabel()
                TextEditor(text: $prompt)
                    .font(.system(size: 13))
                    .scrollContentBackground(.hidden)
                    .padding(8)
                    .frame(minHeight: 90)
                    .background(WC.surface2)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(WC.border, lineWidth: 1))

                if !files.isEmpty {
                    HStack {
                        ForEach(files) { a in
                            Text(a.name).font(.system(size: 11)).padding(6).background(WC.muted).clipShape(Capsule())
                        }
                    }
                }

                HStack {
                    Button("Attach") { files += FilePicking.pickFiles() }
                        .buttonStyle(WCButtonStyle())
                    Spacer()
                    Button("Start") {
                        app.createSession(
                            providerId: providerId, projectId: projectId, prompt: prompt,
                            model: model, effort: effort, cwd: cwd.isEmpty ? nil : cwd, attachments: files
                        )
                    }
                    .buttonStyle(WCButtonStyle(prominent: true))
                    .disabled(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && files.isEmpty)
                }
            }
            .padding(20)
            .frame(width: 560)
            .background(WC.window)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(WC.border, lineWidth: 1))
            .shadow(color: .black.opacity(0.5), radius: 24, y: 12)
        }
    }

    private func chip(_ title: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(.system(size: 11, weight: .medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(active ? WC.muted : WC.surface2)
            .clipShape(Capsule())
            .buttonStyle(.plain)
            .foregroundStyle(WC.foreground)
    }
}

private extension Text {
    func sectionLabel() -> some View {
        self.font(.system(size: 10, weight: .semibold))
            .tracking(0.7)
            .foregroundStyle(WC.subtle)
    }
}
