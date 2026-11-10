import Foundation

/// Durable atomic persistence for user-authored book customization and reading position.
/// Kept strictly independent of transient RealityKit entities or disposable texture caches
/// so renderer failures, thermal fallback, or app backgrounding never lose user data.
public final class BookStatePersistenceService: @unchecked Sendable {
    public static let shared = BookStatePersistenceService()

    private let fileManager = FileManager.default
    private let stateFileURL: URL
    private let lock = NSLock()

    public init(directoryURL: URL? = nil) {
        let baseDir: URL
        if let directoryURL {
            baseDir = directoryURL
        } else {
            let paths = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
            baseDir = paths[0].appendingPathComponent("MemoriaArchive", isDirectory: true)
        }
        try? fileManager.createDirectory(at: baseDir, withIntermediateDirectories: true)
        self.stateFileURL = baseDir.appendingPathComponent("book_states.json")
    }

    public func loadConfiguration(
        for bookId: String,
        fallback defaultConfig: Book3DConfiguration = Book3DConfiguration()
    ) -> Book3DConfiguration {
        lock.lock()
        defer { lock.unlock() }
        let all = loadAllInternal()
        return all[bookId] ?? defaultConfig
    }

    public func saveConfiguration(_ configuration: Book3DConfiguration, for bookId: String) throws {
        lock.lock()
        defer { lock.unlock() }
        var all = loadAllInternal()
        var normalized = configuration
        normalized.bookId = bookId
        all[bookId] = normalized
        let data = try JSONEncoder().encode(all)
        try data.write(to: stateFileURL, options: .atomic)
    }

    public func updateSpreadIndex(_ spreadIndex: Int, isOpen: Bool, for bookId: String, defaultConfig: Book3DConfiguration = Book3DConfiguration()) throws {
        lock.lock()
        defer { lock.unlock() }
        var all = loadAllInternal()
        var current = all[bookId] ?? defaultConfig
        current.bookId = bookId
        current.currentSpreadIndex = max(0, spreadIndex)
        current.isOpen = isOpen
        all[bookId] = current
        let data = try JSONEncoder().encode(all)
        try data.write(to: stateFileURL, options: .atomic)
    }

    public func clearAll() {
        lock.lock()
        defer { lock.unlock() }
        try? fileManager.removeItem(at: stateFileURL)
    }

    private func loadAllInternal() -> [String: Book3DConfiguration] {
        guard let data = try? Data(contentsOf: stateFileURL),
              let decoded = try? JSONDecoder().decode([String: Book3DConfiguration].self, from: data) else {
            return [:]
        }
        return decoded
    }
}
