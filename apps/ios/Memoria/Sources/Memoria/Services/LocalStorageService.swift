import Foundation

public final class LocalStorageService: @unchecked Sendable {
    public static let shared = LocalStorageService()

    private let fileManager = FileManager.default
    private let cacheDirectory: URL

    private init() {
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        self.cacheDirectory = paths[0].appendingPathComponent("MemoriaCache", isDirectory: true)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    public func saveMemoriesLocally(_ memories: [Memory], forSpaceId spaceId: String) throws {
        let fileURL = cacheDirectory.appendingPathComponent("memories_\(spaceId).json")
        let data = try JSONEncoder().encode(memories)
        try data.write(to: fileURL)
    }

    public func loadLocalMemories(forSpaceId spaceId: String) -> [Memory] {
        let fileURL = cacheDirectory.appendingPathComponent("memories_\(spaceId).json")
        guard let data = try? Data(contentsOf: fileURL),
              let memories = try? JSONDecoder().decode([Memory].self, from: data) else {
            return []
        }
        return memories
    }

    public func clearCache() {
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}

