import Testing
import Foundation
@testable import Memoria

@Suite("Memoria iOS Core Model & Service Tests")
struct MemoriaTests {
    @Test("Verify Memory Model Initialization and Encoding")
    func testMemoryModel() throws {
        let memory = Memory(
            spaceId: "e8cf4fc3-137e-4397-883d-21cd6a7cb61f",
            authorId: "a1111111-1111-4111-8111-111111111111",
            title: "Golden Anniversary Celebration",
            content: "Fifty years of devotion, laughter, and building our family hearth.",
            format: .photo,
            location: "Mill Valley, CA",
            tags: ["anniversary", "family"]
        )

        #expect(memory.title == "Golden Anniversary Celebration")
        #expect(memory.format == .photo)
        #expect(memory.tags.count == 2)

        let encoded = try JSONEncoder().encode(memory)
        let decoded = try JSONDecoder().decode(Memory.self, from: encoded)
        #expect(decoded.id == memory.id)
        #expect(decoded.title == memory.title)
    }

    @Test("Verify Local Storage Offline Caching")
    func testLocalStorageService() throws {
        let spaceId = "test-space-\(UUID().uuidString)"
        let memory = Memory(
            spaceId: spaceId,
            authorId: "auth-123",
            title: "Offline Test Memory",
            content: "Testing offline resilience"
        )

        try LocalStorageService.shared.saveMemoriesLocally([memory], forSpaceId: spaceId)
        let loaded = LocalStorageService.shared.loadLocalMemories(forSpaceId: spaceId)

        #expect(loaded.count == 1)
        #expect(loaded.first?.title == "Offline Test Memory")
    }

    @Test("Verify Synthetic User Authentication")
    func testAPIClientSyntheticAuth() async throws {
        let token = try await MemoriaAPIClient.shared.authenticateSyntheticUser(email: "arthur.bennett@synthetic.memoria.internal")
        #expect(token.contains("arthur.bennett"))
        let currentToken = await MemoriaAPIClient.shared.getAuthToken()
        #expect(currentToken == token)
    }
}
