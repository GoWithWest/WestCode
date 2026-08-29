import SwiftUI

struct ProvidersView: View {
    @Environment(AppState.self) private var app
    @State private var adding: AvailableToAdd?
    @State private var customOpen = false
    @State private var editing: Provider?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Connections")
                    .font(.system(size: 22, weight: .semibold))
                Text("Nothing is connected until you say so. Claude, Codex, and Cursor sign in through their own CLIs — WestCode never stores those tokens. Grok can use a CLI or an xAI API key.")
                    .font(.system(size: 13))
                    .foregroundStyle(WC.mutedFg)
                    .frame(maxWidth: 560, alignment: .leading)

                ForEach(app.providers) { p in
                    providerCard(p)
                }

                Text("ADD")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(0.7)
                    .foregroundStyle(WC.subtle)
                HStack {
                    ForEach(CatalogProviders.available.filter { a in
                        !app.customProviders.contains(where: { $0.id == a.id })
                    }) { a in
                        Button(a.name) { adding = a }
                            .buttonStyle(WCButtonStyle())
                    }
                    Button("Custom endpoint") { customOpen = true }
                        .buttonStyle(WCButtonStyle())
                }
            }
            .padding(24)
        }
        .background(WC.window)
        .sheet(item: $adding) { a in
            AddProviderSheet(preset: a)
        }
        .sheet(isPresented: $customOpen) {
            AddProviderSheet(preset: nil)
        }
        .sheet(item: $editing) { p in
            EditConnectionSheet(provider: p)
        }
    }

    private func providerCard(_ p: Provider) -> some View {
        let ready = app.isReady(p.id)
        let detected = app.detectedBinary(for: p.id)
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle().fill(WC.providerColor(p.id)).frame(width: 9, height: 9)
                Text(p.name).font(.system(size: 14, weight: .medium))
                Spacer()
                Text(statusLabel(p, ready: ready))
                    .font(.system(size: 11))
                    .foregroundStyle(ready ? WC.success : WC.mutedFg)
            }
            Text(p.how)
                .font(.system(size: 12))
                .foregroundStyle(WC.mutedFg)
            Text(CatalogProviders.loginHint(p.id))
                .font(.system(size: 11))
                .foregroundStyle(WC.subtle)
            HStack(spacing: 12) {
                meta("Auth", p.authLabel)
                meta("Protocol", p.protocolLabel)
                meta("Binary", p.binary)
                if let detected {
                    meta("Found", detected.path)
                }
            }
            HStack(spacing: 8) {
                if p.connected {
                    Button("Edit") { editing = p }
                        .buttonStyle(WCButtonStyle())
                    Button("Disconnect") { app.disconnectProvider(p.id) }
                        .buttonStyle(WCButtonStyle())
                } else {
                    Button("Connect") { editing = p }
                        .buttonStyle(WCButtonStyle(prominent: true))
                }
                if !p.builtin {
                    Button("Remove") { app.removeCustomProvider(p.id) }
                        .buttonStyle(WCButtonStyle())
                }
            }
        }
        .padding(14)
        .background(WC.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(WC.border, lineWidth: 1))
    }

    private func statusLabel(_ p: Provider, ready: Bool) -> String {
        if ready { return "Connected" }
        if p.connected { return "Needs CLI or key" }
        return "Not connected"
    }

    private func meta(_ k: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(k).font(.system(size: 10)).foregroundStyle(WC.subtle)
            Text(v).font(.system(size: 11, design: .monospaced)).foregroundStyle(WC.foreground)
                .lineLimit(1)
        }
    }
}

struct EditConnectionSheet: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    var provider: Provider
    @State private var binaryPath = ""
    @State private var endpoint = ""
    @State private var apiKey = ""
    @State private var note = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(provider.name)
                .font(.system(size: 16, weight: .semibold))
            Text(CatalogProviders.loginHint(provider.id))
                .font(.system(size: 12))
                .foregroundStyle(WC.mutedFg)

            Text("CLI BINARY").font(.system(size: 10, weight: .semibold)).foregroundStyle(WC.subtle)
            HStack {
                TextField(provider.binary, text: $binaryPath)
                    .textFieldStyle(.roundedBorder)
                Button("Browse") {
                    if let url = FilePicking.pickExecutable() {
                        binaryPath = url.path
                    }
                }
                .buttonStyle(WCButtonStyle())
                Button("Detect") {
                    if let url = BinaryProbe.locate(binaryPath.isEmpty ? provider.binary : binaryPath)
                        ?? BinaryProbe.locate(provider.binary) {
                        binaryPath = url.path
                        note = "Found \(url.path)"
                    } else {
                        note = "Not on PATH. Browse to the binary or install the CLI."
                    }
                }
                .buttonStyle(WCButtonStyle())
            }

            if provider.auth == .api || provider.id == "grok" || !provider.builtin {
                Text("API (OPTIONAL IF CLI IS PRESENT)").font(.system(size: 10, weight: .semibold)).foregroundStyle(WC.subtle)
                TextField("Endpoint", text: $endpoint)
                    .textFieldStyle(.roundedBorder)
                SecureField("API key", text: $apiKey)
                    .textFieldStyle(.roundedBorder)
            }

            if !note.isEmpty {
                Text(note).font(.system(size: 11)).foregroundStyle(WC.warn)
            }

            HStack {
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(WCButtonStyle())
                Button(provider.connected ? "Save" : "Connect") {
                    let rec = ConnectionRecord(
                        id: provider.id,
                        enabled: true,
                        binaryPath: binaryPath,
                        endpoint: endpoint
                    )
                    app.saveConnection(rec, apiKey: apiKey)
                    if !app.isReady(provider.id) && BinaryProbe.locate(binaryPath.isEmpty ? provider.binary : binaryPath) == nil && apiKey.isEmpty {
                        note = "Saved, but not ready yet — install the CLI or add a key."
                        return
                    }
                    dismiss()
                }
                .buttonStyle(WCButtonStyle(prominent: true))
            }
        }
        .padding(20)
        .frame(width: 480)
        .onAppear {
            binaryPath = provider.binary.contains("/") ? provider.binary : (app.detectedBinary(for: provider.id)?.path ?? "")
            endpoint = provider.endpoint ?? ""
            apiKey = KeychainStore.apiKey(for: provider.id) ?? ""
        }
    }
}

struct AddProviderSheet: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    var preset: AvailableToAdd?
    @State private var name = ""
    @State private var vendor = ""
    @State private var endpoint = ""
    @State private var models = ""
    @State private var key = ""
    @State private var auth: AuthKind = .api

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(preset?.name ?? "Custom provider")
                .font(.system(size: 16, weight: .semibold))
            TextField("Name", text: $name)
            TextField("Vendor", text: $vendor)
            Picker("Auth", selection: $auth) {
                Text("Subscription CLI").tag(AuthKind.subscription)
                Text("API / endpoint").tag(AuthKind.api)
            }
            if auth == .api {
                TextField("Endpoint", text: $endpoint)
                SecureField("API key", text: $key)
            }
            TextField("Models (comma-separated)", text: $models)
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }.buttonStyle(WCButtonStyle())
                Button("Add") {
                    let list = models.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                    app.addCustomProvider(
                        CustomProvider(
                            id: preset?.id ?? slug(name),
                            name: name.isEmpty ? (preset?.name ?? "Custom") : name,
                            vendor: vendor.isEmpty ? (preset?.vendor ?? "Custom") : vendor,
                            auth: auth,
                            authLabel: auth == .api ? (preset?.apiHint ?? "API") : (preset?.subscription ?? "CLI login"),
                            endpoint: endpoint,
                            models: list.isEmpty ? (preset?.models ?? ["default"]) : list,
                            defaultModel: list.first ?? preset?.models.first ?? "default",
                            connected: true
                        ),
                        apiKey: key
                    )
                    dismiss()
                }
                .buttonStyle(WCButtonStyle(prominent: true))
            }
        }
        .textFieldStyle(.roundedBorder)
        .padding(20)
        .frame(width: 420)
        .onAppear {
            if let p = preset {
                name = p.name
                vendor = p.vendor
                endpoint = p.endpoint
                models = p.models.joined(separator: ", ")
                auth = p.subscription.isEmpty ? .api : .subscription
            }
        }
    }

    private func slug(_ s: String) -> String {
        let base = s.lowercased().replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return base.isEmpty ? UID.make("prov") : base
    }
}
