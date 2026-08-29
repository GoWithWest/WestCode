import SwiftUI

@main
struct WestCodeApp: App {
    @State private var app = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(app)
                .frame(minWidth: 980, minHeight: 640)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(WC.desktop)
                .onAppear { app.restore() }
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1280, height: 820)
        .commands { WestCodeCommands(app: app) }

        Settings {
            SettingsView()
                .environment(app)
        }
    }
}

struct WestCodeCommands: Commands {
    var app: AppState

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("New Session") {
                app.newOpen = true
            }
            .keyboardShortcut("n", modifiers: [.command])
        }
        CommandGroup(after: .sidebar) {
            Button("Mosaic") { app.setView(.mosaic) }
                .keyboardShortcut("1", modifiers: [.command])
            Button("Split") {
                if app.sessions.count >= 2 {
                    app.setSplit(app.sessions[0].id, app.sessions[1].id)
                }
            }
            .keyboardShortcut("2", modifiers: [.command])
            Button("Connections") { app.setView(.providers) }
                .keyboardShortcut("3", modifiers: [.command])
            Button("Library") { app.setView(.library) }
                .keyboardShortcut("4", modifiers: [.command])
        }
        CommandMenu("Session") {
            Button("Delete All Sessions") { app.deleteAllSessions() }
        }
    }
}
