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

        // Enqueue durable mutation and verify clearCache() preserves pending_mutations.json
        let mutation = PendingMutation(
            entityType: "memory",
            action: "create",
            payload: Data("{\"title\":\"Pending\"}".utf8)
        )
        try LocalStorageService.shared.enqueueMutation(mutation)
        LocalStorageService.shared.clearCache()

        #expect(LocalStorageService.shared.loadLocalMemories(forSpaceId: spaceId).isEmpty)
        let pendingAfterClear = LocalStorageService.shared.loadPendingMutations()
        #expect(pendingAfterClear.contains(where: { $0.id == mutation.id }))
        try LocalStorageService.shared.removeMutation(id: mutation.id)
    }

    @Test("Verify MemoryFormat & Gateway Envelope Contract Parity")
    func testMemoryBackendContractParity() throws {
        // Backend sends format: "image" | "audio" and optional/null content inside { items, hasMore }
        let json = """
        {
          "success": true,
          "data": {
            "items": [
              {
                "id": "11111111-1111-4111-8111-111111111111",
                "spaceId": "22222222-2222-4222-8222-222222222222",
                "authorId": "33333333-3333-4333-8333-333333333333",
                "title": "Silent Photograph",
                "content": null,
                "format": "image",
                "capturedAt": "2026-11-10T10:00:00Z",
                "isFavorite": false,
                "associatedProfileIds": [],
                "mediaIds": ["44444444-4444-4444-8444-444444444444"],
                "tags": ["heirloom"],
                "createdAt": "2026-11-10T10:00:00Z"
              }
            ],
            "hasMore": false,
            "nextCursor": null
          }
        }
        """
        struct GatewayEnvelope: Decodable {
            let success: Bool
            let data: MemoryPageDTO
        }
        let decoded = try JSONDecoder().decode(GatewayEnvelope.self, from: Data(json.utf8))
        #expect(decoded.success == true)
        #expect(decoded.data.items.count == 1)
        #expect(decoded.data.items[0].format == .image)
        #expect(decoded.data.items[0].content == nil)
        #expect(decoded.data.items[0].mediaIds.count == 1)
    }

    @Test("Verify Synthetic User Authentication")
    func testAPIClientSyntheticAuth() async throws {
        let token = try await MemoriaAPIClient.shared.authenticateSyntheticUser(email: "arthur.bennett@synthetic.memoria.internal")
        #expect(token.contains("arthur.bennett"))
        let currentToken = await MemoriaAPIClient.shared.getAuthToken()
        #expect(currentToken == token)
    }
}

@Suite("Memoria Unified 3D Book Engine Parity & RealityKit Tests")
struct Book3DEngineTests {
    @Test("Verify Canonical Swatches, Camera Presets, and Node Hierarchy Parity")
    func testCanonicalContracts() {
        let defaultConfig = Book3DConfiguration()
        #expect(defaultConfig.leather == .plum)
        #expect(defaultConfig.leather.hexString == "#76556F")
        #expect(defaultConfig.foil == .gold)
        #expect(defaultConfig.coverTitle == "The Bennett Heritage")
        #expect(defaultConfig.coverSubtitle == "1948 — 2026 • Memoria Volume I")
        #expect(BookLeatherSwatch.allCases.count == 5)
        #expect(BookFoilSwatch.allCases.count == 4)
        #expect(BookCameraPreset.allCases.count == 5)
        #expect(Book3DHierarchy.requiredNodes.count == 11)
        #expect(Book3DSampleData.sampleSpreads.count == 4)

        for preset in BookCameraPreset.allCases {
            #expect(preset.minDistance > 0)
            #expect(preset.maxDistance > preset.minDistance)
            #expect(preset.fovDegrees >= 20 && preset.fovDegrees <= 75)
        }
    }

    @Test("Verify Cover Hinge & Page Turn Kinematic Interpolation")
    func testKinematics() {
        #expect(BookAnimationContract.evaluateCubicBezierEaseInOut(0.0) == 0.0)
        #expect(abs(BookAnimationContract.evaluateCubicBezierEaseInOut(0.5) - 0.5) < 0.0001)
        #expect(BookAnimationContract.evaluateCubicBezierEaseInOut(1.0) == 1.0)

        let closedAngle = BookAnimationContract.computeCoverHingeAngle(openProgress: 0.0)
        let openAngle = BookAnimationContract.computeCoverHingeAngle(openProgress: 1.0)
        #expect(closedAngle == 0.0)
        #expect(abs(openAngle - 2.764) < 0.0001)

        let pageStart = BookAnimationContract.computePageTurnAngle(turnProgress: 0.0)
        let pageEnd = BookAnimationContract.computePageTurnAngle(turnProgress: 1.0)
        #expect(pageStart == 0.0)
        #expect(abs(pageEnd - 2.88) < 0.0001)
    }

    @Test("Verify MemoriaAPIClient Query URL Composition Avoids Percent-Encoded Question Marks")
    func testAPIClientQueryComposition() async throws {
        let client = MemoriaAPIClient(baseURL: URL(string: "http://127.0.0.1:4000/api/v1")!)
        let url = await client.buildURL(
            path: "notifications",
            queryItems: [URLQueryItem(name: "unreadOnly", value: "true")]
        )
        #expect(url.absoluteString == "http://127.0.0.1:4000/api/v1/notifications?unreadOnly=true")
        #expect(!url.absoluteString.contains("%3F"))
    }

    @Test("Verify Book3DManifestDTO Decoding Matches Book Service JSON")
    func testManifestDTODecoding() throws {
        let json = """
        {
          "manifest": { "version": "2.0.0", "modelId": "memoria_heirloom_book_v2" },
          "endpoints": {
            "glb": "/api/v1/books/3d/assets/memoria_heirloom_book.glb?v=2.0.0",
            "usdz": "/api/v1/books/3d/assets/MemoriaHeirloomBook.usdz?v=2.0.0"
          }
        }
        """
        let dto = try JSONDecoder().decode(Book3DManifestDTO.self, from: Data(json.utf8))
        #expect(dto.manifest.version == "2.0.0")
        #expect(dto.manifest.modelId == "memoria_heirloom_book_v2")
        #expect(dto.endpoints.usdz.contains("MemoriaHeirloomBook.usdz"))
    }

    @Test("Verify CollectionDTO, MemoryCommentDTO, PrintCatalogDTO & PrintOrderDTO Decoding")
    func testExpandedDTOParity() throws {
        let collectionJson = """
        {
          "id": "col-1",
          "spaceId": "sp-1",
          "title": "Summer at the Lake",
          "description": "1998 family retreat",
          "coverMemoryId": null,
          "memoryIds": ["mem-1", "mem-2"],
          "createdAt": "2026-11-11T00:00:00Z",
          "updatedAt": "2026-11-11T00:00:00Z"
        }
        """
        let col = try JSONDecoder().decode(CollectionDTO.self, from: Data(collectionJson.utf8))
        #expect(col.title == "Summer at the Lake")
        #expect(col.memoryIds?.count == 2)

        let commentJson = """
        {
          "id": "cmt-1",
          "memoryId": "mem-1",
          "spaceId": "sp-1",
          "authorId": "usr-1",
          "authorName": "Elena",
          "body": "Grandma smiled all afternoon.",
          "createdAt": "2026-11-11T00:00:00Z"
        }
        """
        let cmt = try JSONDecoder().decode(MemoryCommentDTO.self, from: Data(commentJson.utf8))
        #expect(cmt.authorName == "Elena")

        let catalogJson = """
        {
          "currency": "USD",
          "pricingPolicy": "zero_markup_pass_through",
          "formats": [{ "id": "hardcover_square_8x8", "label": "Square 8x8", "dimensionsCm": "20.3 x 20.3 cm", "baseCents": 4200 }],
          "bindings": [{ "id": "hardcover_linen", "label": "Linen", "surchargeCents": 0 }],
          "paperStocks": [{ "id": "140gsm_matte", "label": "140gsm Matte", "surchargeCents": 0 }]
        }
        """
        let catalog = try JSONDecoder().decode(PrintCatalogDTO.self, from: Data(catalogJson.utf8))
        #expect(catalog.formats.first?.baseCents == 4200)
    }

    #if os(iOS) && canImport(RealityKit)
    @Test("Verify Bundled MemoriaHeirloomBook.usdz Loads and Matches Node Hierarchy")
    @MainActor
    func testBundledUSDZLoadingAndHierarchy() async throws {
        let usdzURL = Book3DAssetLocator.locateBundledUSDZ()
        #expect(usdzURL != nil)

        let root = try await Book3DRealityController.loadBookSceneRoot()
        #expect(root.findEntity(named: Book3DHierarchy.frontCoverHinge) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.turningPageHinge) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.frontCover) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.backCover) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.spine) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.textBlock) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.emblem) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.cornerGuards) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.ribbon) != nil)
        #expect(root.findEntity(named: Book3DHierarchy.turningPageLeaf) != nil)

        let controller = Book3DRealityController()
        controller.bookRoot = root
        controller.frontCoverHinge = root.findEntity(named: Book3DHierarchy.frontCoverHinge)
        controller.turningPageHinge = root.findEntity(named: Book3DHierarchy.turningPageHinge)

        var openConfig = Book3DConfiguration(leather: .plum, foil: .gold, isOpen: true)
        openConfig.reducedMotion = true
        controller.syncConfiguration(openConfig, turnNonce: 1, turnDirection: 1)
        controller.tick(deltaTime: 0.016)

        let hingeAngle = controller.frontCoverHinge?.orientation.angle ?? 0
        #expect(abs(hingeAngle - BookAnimationContract.openAngleRadians) < 0.01)
    }
    #endif
}
