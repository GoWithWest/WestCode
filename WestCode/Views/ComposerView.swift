import SwiftUI

struct ComposerView: View {
    @Environment(AppState.self) private var app
    var session: Session
    @State private var value = ""
    @State private var files: [Attachment] = []
    @State private var hi = 0
    @State private var menu = false
    @State private var peersOpen = false
    @FocusState private var focused: Bool

    private var running: Bool { session.status == .running }
    private var peers: [Session] { app.sessions.filter { $0.id != session.id } }

    private var slashOpen: Bool {
        !running && value.hasPrefix("/") && !value.contains("\n") && !value.contains(" ")
    }
    private var matches: [SlashCmd] {
        slashOpen ? Catalog.filterSlash(session.providerId, query: value) : []
    }
    private var atMatch: String? {
        let re = try? NSRegularExpression(pattern: #"(?:^|\s)@([^\s]*)$"#)
        let ns = value as NSString
        guard let m = re?.firstMatch(in: value, range: NSRange(location: 0, length: ns.length)),
              m.numberOfRanges > 1 else { return nil }
        return ns.substring(with: m.range(at: 1))
    }
    private var atMatches: [Session] {
        guard !running, !slashOpen, let q = atMatch?.lowercased() else { return [] }
        if q.isEmpty { return peers }
        return peers.filter {
            $0.title.lowercased().contains(q) || $0.providerId.lowercased().contains(q) || $0.id.lowercased().contains(q)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            if slashOpen && !matches.isEmpty {
                palette(matches.map { $0.cmd }) {
                    ForEach(Array(matches.enumerated()), id: \.element.id) { i, cmd in
                        paletteRow(i, title: "/\(cmd.cmd)\(cmd.args.map { " \($0)" } ?? "")", hint: cmd.hint) {
                            choose(cmd)
                        }
                    }
                }
            } else if !atMatches.isEmpty {
                palette(atMatches.map(\.id)) {
                    ForEach(Array(atMatches.enumerated()), id: \.element.id) { i, peer in
                        paletteRow(i, title: "@\(CatalogProviders.resolve(peer.providerId, custom: app.customProviders).short)", hint: peer.title) {
                            mention(peer)
                        }
                    }
                }
            }

            if !files.isEmpty {
                HStack {
                    ForEach(files) { a in
                        HStack(spacing: 4) {
                            Text(a.name).font(.system(size: 11))
                            Button {
                                files.removeAll { $0.id == a.id }
                            } label: {
                                Image(systemName: "xmark").font(.system(size: 9))
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(WC.muted)
                        .clipShape(Capsule())
                    }
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.top, 8)
            }

            HStack(alignment: .bottom, spacing: 8) {
                ZStack(alignment: .bottomLeading) {
                    Button {
                        menu.toggle()
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 13, weight: .medium))
                            .frame(width: 28, height: 28)
                    }
                    .buttonStyle(WCIconButtonStyle(active: menu))
                    .disabled(running)
                    .popover(isPresented: $menu, arrowEdge: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Button("Attach files") {
                                files += FilePicking.pickFiles()
                                menu = false
                            }
                            Button("Message a session") {
                                peersOpen = true
                            }
                            if peersOpen {
                                ForEach(peers) { peer in
                                    Button(CatalogProviders.resolve(peer.providerId, custom: app.customProviders).short + " · " + peer.title) {
                                        value = "@\(CatalogProviders.resolve(peer.providerId, custom: app.customProviders).short) "
                                        menu = false
                                        peersOpen = false
                                        focused = true
                                    }
                                }
                            }
                        }
                        .padding(8)
                        .frame(width: 220)
                    }
                }

                TextField("Message \(CatalogProviders.resolve(session.providerId, custom: app.customProviders).short)…  /  @", text: $value, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(WC.foreground)
                    .lineLimit(1...8)
                    .focused($focused)
                    .onSubmit { submit() }
                    .disabled(running)

                if running {
                    Button {
                        app.stop(session.id)
                    } label: {
                        Image(systemName: "stop.fill").frame(width: 28, height: 28)
                    }
                    .buttonStyle(WCButtonStyle())
                } else {
                    Button {
                        submit()
                    } label: {
                        Image(systemName: "arrow.up").frame(width: 28, height: 28)
                    }
                    .buttonStyle(WCButtonStyle(prominent: true))
                    .disabled(value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && files.isEmpty)
                }
            }
            .padding(10)
        }
        .background(WC.surface)
        .overlay(alignment: .top) { Rectangle().fill(WC.border).frame(height: 1) }
        .onAppear { focused = true }
        .onChange(of: session.id) { _, _ in
            value = ""
            files = []
            focused = true
        }
    }

    private func palette<C: View>(_ ids: [String], @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 0, content: content)
            .background(WC.surface2)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(WC.border, lineWidth: 1))
            .padding(.horizontal, 10)
            .padding(.bottom, 6)
    }

    private func paletteRow(_ i: Int, title: String, hint: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title).font(.system(size: 12, design: .monospaced)).foregroundStyle(WC.foreground)
                Spacer()
                Text(hint).font(.system(size: 11)).foregroundStyle(WC.mutedFg).lineLimit(1)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(i == hi ? WC.muted : Color.clear)
        }
        .buttonStyle(.plain)
    }

    private func submit() {
        let t = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty && files.isEmpty { return }
        if running { return }
        let attached = files
        value = ""
        files = []
        Task { await app.send(session.id, t, attachments: attached) }
    }

    private func choose(_ cmd: SlashCmd) {
        if cmd.args != nil {
            value = "/\(cmd.cmd) "
            focused = true
            return
        }
        value = ""
        Task { await app.send(session.id, "/\(cmd.cmd)") }
    }

    private func mention(_ peer: Session) {
        let label = CatalogProviders.resolve(peer.providerId, custom: app.customProviders).short
        if let range = value.range(of: #"@([^\s]*)$"#, options: .regularExpression) {
            value.replaceSubrange(range, with: "@\(label) ")
        } else {
            value += "@\(label) "
        }
        focused = true
    }
}
