import Foundation

public struct UserProfile: Identifiable, Codable, Sendable {
    public let id: String
    public let email: String
    public let fullName: String
    public let role: String

    public init(id: String, email: String, fullName: String, role: String = "member") {
        self.id = id
        self.email = email
        self.fullName = fullName
        self.role = role
    }
}

public struct FamilyMemberProfile: Identifiable, Codable, Sendable {
    public let id: String
    public let name: String
    public let relationship: String
    public let birthYear: Int
    public let avatarUrl: String?

    public init(id: String = UUID().uuidString, name: String, relationship: String, birthYear: Int, avatarUrl: String? = nil) {
        self.id = id
        self.name = name
        self.relationship = relationship
        self.birthYear = birthYear
        self.avatarUrl = avatarUrl
    }
}

