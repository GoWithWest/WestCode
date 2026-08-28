import SwiftUI

struct ProvidersView: View {
    @Environment(AppState.self) private var app
    @State private var adding: AvailableToAdd?
    @State private var customOpen = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Connections")
                    .font(.system(size: 22, weight: .semibold))
                Text("WestCode is an ACP client. Claude, Codex, and Cursor sign in through their own CLIs. Add an API key only when you want HTTP.")
                    .font(.system(size: 13))
                    .foregroundStyle(WC.mutedFg)
                    .frame(maxWidth: 560, alignment: .leading)

                ForEach(CatalogProviders.all(app.customProviders)) { p in
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
    }

    private func providerCard(_ p: Provider) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle().fill(WC.providerColor(p.id)).frame(width: 9, height: 9)
                Text(p.name).font(.system(size: 14, weight: .medium))
                Spacer()
                Text(p.connected ? "Connected" : "Off")
                    .font(.system(size: 11))
                    .foregroundStyle(p.connected ? WC.success : WC.mutedFg)
            }
            Text(p.how)
                .font(.system(size: 12))
                .foregroundStyle(WC.mutedFg)
            HStack(spacing: 12) {
                meta("Auth", p.authLabel)
                meta("Protocol", p.protocolLabel)
                meta("Binary", p.binary)
                meta("Store", p.sessionStore)
            }
            if !p.builtin {
                Button("Remove") { app.removeCustomProvider(p.id) }
                    .buttonStyle(WCButtonStyle())
            }
        }
        .padding(14)
        .background(WC.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(WC.border, lineWidth: 1))
    }

    private func meta(_ k: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(k).font(.system(size: 10)).foregroundStyle(WC.subtle)
            Text(v).font(.system(size: 11, design: .monospaced)).foregroundStyle(WC.foreground)
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
