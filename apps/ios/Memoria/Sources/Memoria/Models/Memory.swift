import Foundation

public enum MemoryFormat: String, Codable, Sendable, CaseIterable {
    case image
    case video
    case audio
    case story
    case document
    case mixed

    // Backward-compatible aliases for legacy call sites
    public static let photo: MemoryFormat = .image
    public static let voiceNote: MemoryFormat = .audio

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self).lowercased()
        switch raw {
        case "image", "photo":
            self = .image
        case "audio", "voice_note":
            self = .audio
        case "video":
            self = .video
        case "story", "text":
            self = .story
        case "document":
            self = .document
        case "mixed":
            self = .mixed
        default:
            self = .story
        }
    }
}

public struct Memory: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let authorId: String
    public let title: String
    public let content: String?
    public let format: MemoryFormat
    public let capturedAt: String
    public let location: String?
    public let latitude: Double?
    public let longitude: Double?
    public let isFavorite: Bool
    public let associatedProfileIds: [String]
    public let mediaIds: [String]
    public let tags: [String]
    public let revision: Int?
    public let clientMutationId: String?
    public let createdAt: String
    public let updatedAt: String?

    public init(
        id: String = UUID().uuidString,
        spaceId: String,
        authorId: String,
        title: String,
        content: String? = nil,
        format: MemoryFormat = .image,
        capturedAt: String = ISO8601DateFormatter().string(from: Date()),
        location: String? = nil,
        latitude: Double? = nil,
        longitude: Double? = nil,
        isFavorite: Bool = false,
        associatedProfileIds: [String] = [],
        mediaIds: [String] = [],
        tags: [String] = [],
        revision: Int? = nil,
        clientMutationId: String? = nil,
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String? = nil
    ) {
        self.id = id
        self.spaceId = spaceId
        self.authorId = authorId
        self.title = title
        self.content = content
        self.format = format
        self.capturedAt = capturedAt
        self.location = location
        self.latitude = latitude
        self.longitude = longitude
        self.isFavorite = isFavorite
        self.associatedProfileIds = associatedProfileIds
        self.mediaIds = mediaIds
        self.tags = tags
        self.revision = revision
        self.clientMutationId = clientMutationId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct MemorySpace: Identifiable, Codable, Sendable {
    public let id: String
    public let name: String
    public let description: String?
    public let type: String
    public let role: String?

    public init(
        id: String = UUID().uuidString,
        name: String,
        description: String? = nil,
        type: String = "family",
        role: String? = "owner"
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.type = type
        self.role = role
    }
}
