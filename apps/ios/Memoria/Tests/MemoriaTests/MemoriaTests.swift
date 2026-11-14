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

    @Test("Verify Expanded Timeline, Calendar, Activity, Storage, Support & Preflight DTO Decoding")
    func testExpandedDTOsAndRouteComposition() async throws {
        let timelineJson = """
        {
          "total": 1,
          "groups": [
            {
              "yearMonth": "2026-06",
              "year": "2026",
              "items": [
                {
                  "id": "mem-101",
                  "spaceId": "spc-1",
                  "authorId": "usr-1",
                  "title": "Summer Orchard",
                  "content": "Picked apples together.",
                  "format": "image",
                  "capturedAt": "2026-06-14T12:00:00Z",
                  "location": "Vermont",
                  "latitude": null,
                  "longitude": null,
                  "isFavorite": true,
                  "associatedProfileIds": [],
                  "mediaIds": [],
                  "tags": ["summer"],
                  "createdAt": "2026-06-14T12:00:00Z",
                  "updatedAt": null
                }
              ]
            }
          ]
        }
        """
        let timeline = try JSONDecoder().decode(TimelineResponseDTO.self, from: Data(timelineJson.utf8))
        #expect(timeline.total == 1)
        #expect(timeline.groups.first?.yearMonth == "2026-06")

        let storageJson = """
        {
          "spaceId": "spc-1",
          "usedBytes": 4096,
          "maxBytes": 1073741824,
          "assetCount": 2,
          "categories": {
            "imagesBytes": 3072,
            "videoBytes": 0,
            "audioBytes": 1024,
            "docsBytes": 0
          }
        }
        """
        let storage = try JSONDecoder().decode(StorageBreakdownDTO.self, from: Data(storageJson.utf8))
        #expect(storage.assetCount == 2)
        #expect(storage.categories.imagesBytes == 3072)

        let preflightJson = """
        {
          "bookId": "bk-1",
          "version": 3,
          "isFrozenForPrint": false,
          "frozenEditionHash": null,
          "passed": true,
          "checks": [
            { "id": "dpi_resolution", "label": "300 DPI Archival Print Profile", "passed": true, "detail": "OK" }
          ],
          "checkedAt": "2026-11-11T00:00:00Z"
        }
        """
        let preflight = try JSONDecoder().decode(BookPreflightReportDTO.self, from: Data(preflightJson.utf8))
        #expect(preflight.passed)
        #expect(preflight.checks.first?.id == "dpi_resolution")

        let client = MemoriaAPIClient(baseURL: URL(string: "http://127.0.0.1:4000/api/v1")!)
        let tlUrl = await client.buildURL(path: "spaces/spc-1/timeline")
        let pfUrl = await client.buildURL(path: "books/bk-1/preflight")
        #expect(tlUrl.absoluteString == "http://127.0.0.1:4000/api/v1/spaces/spc-1/timeline")
        #expect(pfUrl.absoluteString == "http://127.0.0.1:4000/api/v1/books/bk-1/preflight")
    }

    @Test("Verify Live Book, Order Quote/Tracking & Collab Governance DTO Decoding")
    func testLiveBooksCommerceAndGovernanceDTOs() async throws {
        let bookJson = """
        {
          "id": "11111111-1111-4111-8111-111111111111",
          "spaceId": "22222222-2222-4222-8222-222222222222",
          "title": "Bennett Chronicle",
          "subtitle": "1948 - 2026",
          "format": "hardcover_grand_12x12",
          "coverColor": "#76556F",
          "foilStamping": "gold",
          "coverTitle": "Bennett Chronicle",
          "spineText": "BENNETT",
          "version": 2,
          "isFrozenForPrint": true,
          "frozenEditionHash": "abcdef1234567890",
          "spreads": [
            {
              "id": "spr-1",
              "spreadIndex": 0,
              "leftPage": null,
              "rightPage": {
                "id": "pg-1",
                "pageNumber": 1,
                "layoutType": "editorial_chapter_title",
                "backgroundColor": "#F7F4ED",
                "elements": [
                  { "id": "el-1", "type": "heading", "content": "Chapter One" },
                  { "id": "el-2", "type": "caption", "content": "Summer in Sonoma" }
                ]
              }
            }
          ],
          "createdAt": "2026-11-11T00:00:00Z",
          "updatedAt": "2026-11-11T00:00:00Z"
        }
        """
        let bookDto = try JSONDecoder().decode(BookDocumentDTO.self, from: Data(bookJson.utf8))
        let volume = bookDto.toBookVolumeRecord()
        #expect(volume.id == bookDto.id)
        #expect(volume.isFrozenForPrint == true)
        #expect(volume.frozenEditionHash == "abcdef1234567890")
        #expect(volume.defaultConfiguration.leather == .plum)
        #expect(volume.spreads.first?.rightHeading == "Chapter One")

        let quoteJson = """
        {
          "currency": "USD",
          "format": "hardcover_standard_8x10",
          "shippingSpeed": "priority",
          "quantity": 2,
          "unitCents": 5200,
          "subtotalCents": 10400,
          "shippingCents": 2100,
          "taxCents": 0,
          "totalCents": 12500,
          "estimatedDays": "2-3 business days"
        }
        """
        let quote = try JSONDecoder().decode(OrderQuoteDTO.self, from: Data(quoteJson.utf8))
        #expect(quote.totalCents == 12500)
        #expect(quote.shippingSpeed == "priority")

        let trackingJson = """
        {
          "orderId": "ord-1",
          "status": "in_production",
          "carrier": "Archival Press Courier",
          "trackingNumber": "MEM-TRK-001",
          "trackingUrl": null,
          "estimatedDays": "5-7 business days",
          "timeline": [
            { "stage": "submitted", "completed": true, "active": false },
            { "stage": "preflight_passed", "completed": true, "active": false },
            { "stage": "in_production", "completed": true, "active": true },
            { "stage": "shipped", "completed": false, "active": false },
            { "stage": "delivered", "completed": false, "active": false }
          ]
        }
        """
        let tracking = try JSONDecoder().decode(OrderTrackingDTO.self, from: Data(trackingJson.utf8))
        #expect(tracking.timeline.count == 5)
        #expect(tracking.trackingNumber == "MEM-TRK-001")

        let inviteJson = """
        {
          "invitation": {
            "id": "inv-1",
            "spaceId": "spc-1",
            "inviteeEmail": "elena@family.local",
            "role": "contributor",
            "status": "pending",
            "expiresAt": "2026-11-18T00:00:00Z"
          },
          "inviteToken": "tok-abcdef"
        }
        """
        let invite = try JSONDecoder().decode(SpaceInvitationResponseDTO.self, from: Data(inviteJson.utf8))
        #expect(invite.inviteToken == "tok-abcdef")

        let client = MemoriaAPIClient(baseURL: URL(string: "http://127.0.0.1:4000/api/v1")!)
        let booksUrl = await client.buildURL(path: "spaces/spc-1/books")
        let quoteUrl = await client.buildURL(path: "orders/quote")
        let membersUrl = await client.buildURL(path: "collab/spaces/spc-1/members")
        #expect(booksUrl.absoluteString == "http://127.0.0.1:4000/api/v1/spaces/spc-1/books")
        #expect(quoteUrl.absoluteString == "http://127.0.0.1:4000/api/v1/orders/quote")
        #expect(membersUrl.absoluteString == "http://127.0.0.1:4000/api/v1/collab/spaces/spc-1/members")
    }

    @Test("Verify CollectionDetailDTO, SpaceProfileDTO, Reactions & Collection/Profile Route Encoding")
    func testCollectionDetailProfileAndReactions() async throws {
        let detailJson = """
        {
          "id": "col-99",
          "spaceId": "spc-1",
          "title": "Grandpa Letters",
          "description": "Typed and handwritten correspondence",
          "coverMemoryId": null,
          "memoryIds": ["mem-10"],
          "createdAt": "2026-11-11T00:00:00Z",
          "updatedAt": "2026-11-11T00:00:00Z",
          "memories": [
            {
              "id": "mem-10",
              "spaceId": "spc-1",
              "authorId": "usr-1",
              "title": "Letter from Lisbon",
              "content": "Arrived safely at harbor.",
              "format": "document",
              "capturedAt": "1968-05-12T10:00:00Z",
              "location": "Lisbon",
              "latitude": null,
              "longitude": null,
              "isFavorite": true,
              "associatedProfileIds": ["prof-1"],
              "mediaIds": [],
              "tags": ["letters"],
              "createdAt": "2026-11-11T00:00:00Z",
              "updatedAt": null
            }
          ]
        }
        """
        let detail = try JSONDecoder().decode(CollectionDetailDTO.self, from: Data(detailJson.utf8))
        #expect(detail.title == "Grandpa Letters")
        #expect(detail.memories?.count == 1)
        #expect(detail.memories?.first?.title == "Letter from Lisbon")

        let profileJson = """
        {
          "id": "prof-1",
          "spaceId": "spc-1",
          "name": "Eleanor Bennett",
          "relationship": "Grandmother",
          "type": "parent",
          "birthDate": "1932-05-12"
        }
        """
        let profile = try JSONDecoder().decode(SpaceProfileDTO.self, from: Data(profileJson.utf8))
        #expect(profile.name == "Eleanor Bennett")
        #expect(profile.birthDate == "1932-05-12")

        var reactions = MemoryReactionState()
        reactions.toggle(.heart)
        reactions.toggle(.gratitude)
        #expect(reactions.isSelected(.heart))
        #expect(reactions.count(for: .heart) == 1)
        #expect(reactions.count(for: .gratitude) == 1)
        reactions.toggle(.heart)
        #expect(!reactions.isSelected(.heart))
        #expect(reactions.count(for: .heart) == 0)

        let testMemoryId = "test-mem-\(UUID().uuidString)"
        try LocalStorageService.shared.saveReactionsLocally(reactions, forMemoryId: testMemoryId)
        let loadedReactions = LocalStorageService.shared.loadLocalReactions(forMemoryId: testMemoryId)
        #expect(loadedReactions == reactions)

        let client = MemoriaAPIClient(baseURL: URL(string: "http://127.0.0.1:4000/api/v1")!)
        let colDetailUrl = await client.buildURL(path: "spaces/spc-1/collections/col-99")
        let colMemUrl = await client.buildURL(path: "spaces/spc-1/collections/col-99/memories/mem-10")
        let profUrl = await client.buildURL(path: "spaces/spc-1/profiles/prof-1")
        let profMemsUrl = await client.buildURL(
            path: "spaces/spc-1/memories",
            queryItems: [URLQueryItem(name: "profileId", value: "prof-1")]
        )
        #expect(colDetailUrl.absoluteString == "http://127.0.0.1:4000/api/v1/spaces/spc-1/collections/col-99")
        #expect(colMemUrl.absoluteString == "http://127.0.0.1:4000/api/v1/spaces/spc-1/collections/col-99/memories/mem-10")
        #expect(profUrl.absoluteString == "http://127.0.0.1:4000/api/v1/spaces/spc-1/profiles/prof-1")
        #expect(profMemsUrl.absoluteString == "http://127.0.0.1:4000/api/v1/spaces/spc-1/memories?profileId=prof-1")
    }

    @Test("Verify MediaEditParameters Persistence & API Client Collection/Profile/Media Mutations via URLProtocol")
    func testCollectionProfileAndMediaAPIMutations() async throws {
        // 1. Verify MediaEditParameters durable persistence
        let mediaId = "test-media-\(UUID().uuidString)"
        let edits = MediaEditParameters(rotateDegrees: 90, warmth: 0.6, cropPreset: "square_1_1", filterPreset: "Archival Warm")
        try LocalStorageService.shared.saveMediaEditsLocally(edits, forMediaId: mediaId)
        let loadedEdits = LocalStorageService.shared.loadLocalMediaEdits(forMediaId: mediaId)
        #expect(loadedEdits == edits)

        // 2. Verify HTTP method, URL, Authorization header, and JSON body serialization
        final class StubRecorder: @unchecked Sendable {
            private let lock = NSLock()
            private var requests: [(method: String, url: String, auth: String?, body: [String: Any])] = []
            private var nextJSON: Data = Data("{\"success\":true,\"data\":{}}".utf8)

            func setNextJSON(_ data: Data) {
                lock.lock()
                defer { lock.unlock() }
                nextJSON = data
            }

            func recordAndRespond(request: URLRequest) -> (Data, HTTPURLResponse) {
                lock.lock()
                defer { lock.unlock() }
                let rawBody = request.httpBody ?? request.httpBodyStream.flatMap { stream -> Data? in
                    stream.open()
                    defer { stream.close() }
                    var buffer = [UInt8](repeating: 0, count: 4096)
                    var collected = Data()
                    while stream.hasBytesAvailable {
                        let read = stream.read(&buffer, maxLength: buffer.count)
                        if read > 0 { collected.append(buffer, count: read) } else { break }
                    }
                    return collected
                }
                let parsedBody = (rawBody.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]) ?? [:]
                requests.append((
                    method: request.httpMethod ?? "GET",
                    url: request.url?.absoluteString ?? "",
                    auth: request.value(forHTTPHeaderField: "Authorization"),
                    body: parsedBody
                ))
                let resp = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
                return (nextJSON, resp)
            }

            func lastRequest() -> (method: String, url: String, auth: String?, body: [String: Any])? {
                lock.lock()
                defer { lock.unlock() }
                return requests.last
            }
        }

        final class StubURLProtocol: URLProtocol, @unchecked Sendable {
            nonisolated(unsafe) static var recorder: StubRecorder?
            override class func canInit(with request: URLRequest) -> Bool { true }
            override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
            override func startLoading() {
                guard let recorder = Self.recorder else {
                    client?.urlProtocol(self, didFailWithError: NSError(domain: "Stub", code: 500))
                    return
                }
                let (data, response) = recorder.recordAndRespond(request: request)
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                client?.urlProtocol(self, didLoad: data)
                client?.urlProtocolDidFinishLoading(self)
            }
            override func stopLoading() {}
        }

        let recorder = StubRecorder()
        StubURLProtocol.recorder = recorder
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubURLProtocol.self]
        let session = URLSession(configuration: config)
        let client = MemoriaAPIClient(
            baseURL: URL(string: "http://127.0.0.1:4000/api/v1")!,
            urlSession: session,
            useKeychain: false
        )
        await client.setAuthToken("jwt-test-token")

        let colPayload = """
        {"success":true,"data":{"id":"col-1","spaceId":"spc-1","title":"Updated","description":null,"coverMemoryId":null,"memoryIds":["mem-2","mem-1"],"createdAt":"2026-11-11T00:00:00Z","updatedAt":"2026-11-11T00:00:00Z"}}
        """
        recorder.setNextJSON(Data(colPayload.utf8))
        let updatedCol = try await client.updateCollection(spaceId: "spc-1", collectionId: "col-1", title: "Updated", clearDescription: true)
        #expect(updatedCol.title == "Updated")
        let req1 = recorder.lastRequest()
        #expect(req1?.method == "PATCH")
        #expect(req1?.url == "http://127.0.0.1:4000/api/v1/spaces/spc-1/collections/col-1")
        #expect(req1?.auth == "Bearer jwt-test-token")
        #expect(req1?.body["description"] is NSNull)

        recorder.setNextJSON(Data(colPayload.utf8))
        let reordered = try await client.reorderCollectionMemories(spaceId: "spc-1", collectionId: "col-1", memoryIds: ["mem-2", "mem-1"])
        #expect(reordered.memoryIds == ["mem-2", "mem-1"])
        let req2 = recorder.lastRequest()
        #expect(req2?.method == "PUT")
        #expect(req2?.url == "http://127.0.0.1:4000/api/v1/spaces/spc-1/collections/col-1/reorder")
        #expect((req2?.body["memoryIds"] as? [String]) == ["mem-2", "mem-1"])

        recorder.setNextJSON(Data(colPayload.utf8))
        _ = try await client.addMemoryToCollection(spaceId: "spc-1", collectionId: "col-1", memoryId: "mem-1", sortOrder: 1)
        #expect(recorder.lastRequest()?.method == "POST")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/spaces/spc-1/collections/col-1/memories")

        recorder.setNextJSON(Data("{\"success\":true,\"data\":{\"removed\":true}}".utf8))
        try await client.removeMemoryFromCollection(spaceId: "spc-1", collectionId: "col-1", memoryId: "mem-1")
        #expect(recorder.lastRequest()?.method == "DELETE")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/spaces/spc-1/collections/col-1/memories/mem-1")

        let profPayload = """
        {"success":true,"data":{"id":"prof-1","spaceId":"spc-1","name":"Eleanor","relationship":"Grandmother","type":"parent","birthDate":null}}
        """
        recorder.setNextJSON(Data(profPayload.utf8))
        let updatedProf = try await client.updateProfile(spaceId: "spc-1", profileId: "prof-1", relationship: "Grandmother", clearBirthDate: true)
        #expect(updatedProf.type == "parent")
        let reqProf = recorder.lastRequest()
        #expect(reqProf?.method == "PATCH")
        #expect(reqProf?.url == "http://127.0.0.1:4000/api/v1/spaces/spc-1/profiles/prof-1")
        #expect(reqProf?.body["birthDate"] is NSNull)
        #expect(reqProf?.body["type"] == nil)

        recorder.setNextJSON(Data("{\"success\":true,\"data\":{\"deleted\":true}}".utf8))
        try await client.deleteProfile(spaceId: "spc-1", profileId: "prof-1")
        #expect(recorder.lastRequest()?.method == "DELETE")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/spaces/spc-1/profiles/prof-1")

        try await client.deleteCollection(spaceId: "spc-1", collectionId: "col-1")
        #expect(recorder.lastRequest()?.method == "DELETE")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/spaces/spc-1/collections/col-1")

        try await client.applyMediaNonDestructiveEdit(mediaId: "med-1", rotateDegrees: 90, warmth: 0.6, cropPreset: "square_1_1")
        #expect(recorder.lastRequest()?.method == "POST")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/media/med-1/derivatives")

        let reactionPayload = """
        {"success":true,"data":{"memoryId":"mem-1","counts":{"heart":2,"warmth":1},"selectedKinds":["heart"]}}
        """
        recorder.setNextJSON(Data(reactionPayload.utf8))
        let fetchedReactions = try await client.fetchReactions(memoryId: "mem-1")
        #expect(fetchedReactions.count(for: .heart) == 2)
        #expect(fetchedReactions.isSelected(.heart))
        #expect(recorder.lastRequest()?.method == "GET")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/memories/mem-1/reactions")

        recorder.setNextJSON(Data(reactionPayload.utf8))
        let setReact = try await client.setReaction(memoryId: "mem-1", kind: .heart, active: true)
        #expect(setReact.count(for: .heart) == 2)
        #expect(recorder.lastRequest()?.method == "PUT")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/memories/mem-1/reactions")
        #expect((recorder.lastRequest()?.body["kind"] as? String) == "heart")
        #expect((recorder.lastRequest()?.body["active"] as? Bool) == true)

        let prefsPayload = """
        {"success":true,"data":{"reducedMotion":true,"language":"en","biometricLock":false}}
        """
        recorder.setNextJSON(Data(prefsPayload.utf8))
        let prefs = try await client.fetchPreferences()
        #expect(prefs.reducedMotion == true)
        #expect(recorder.lastRequest()?.method == "GET")
        #expect(recorder.lastRequest()?.url == "http://127.0.0.1:4000/api/v1/auth/me/preferences")
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

private final class OfflineSyncURLProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (Int, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.handler else {
            client?.urlProtocol(self, didFailWithError: URLError(.cannotConnectToHost))
            return
        }
        do {
            let (status, data) = try handler(request)
            let response = HTTPURLResponse(
                url: request.url ?? URL(string: "http://127.0.0.1:4000")!,
                statusCode: status,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

@Suite("Memoria Durable Offline Storage & Sync Integrity Tests", .serialized)
struct OfflineSyncIntegrityTests {
    private func makeIsolatedDirs() -> (archive: URL, cache: URL) {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent("memoria-offline-test-\(UUID().uuidString)", isDirectory: true)
        return (base.appendingPathComponent("Archive", isDirectory: true), base.appendingPathComponent("Cache", isDirectory: true))
    }

    private func makeMockClient(token: String = "test-token", userId: String = "user-a") async -> MemoriaAPIClient {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [OfflineSyncURLProtocol.self]
        let session = URLSession(configuration: config)
        let client = MemoriaAPIClient(baseURL: URL(string: "http://127.0.0.1:4000/api/v1")!, urlSession: session, useKeychain: false)
        await client.setAuthToken(token, refreshToken: nil)
        await client.setCurrentUserId(userId)
        return client
    }

    @Test("Offline memory + original photo survive simulated restart and clearCache, then sync idempotently across interrupted upload")
    @MainActor
    func testOfflineDurabilityRestartClearCacheAndIdempotentRetry() async throws {
        let dirs = makeIsolatedDirs()
        defer { try? FileManager.default.removeItem(at: dirs.archive.deletingLastPathComponent()) }

        let photoBytes = Data([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02, 0x03, 0x04])
        let spaceId = UUID().uuidString

        // 1-2. Save offline memory with original photo
        do {
            let storage1 = LocalStorageService(baseArchiveURL: dirs.archive, baseCacheURL: dirs.cache)
            let client1 = await makeMockClient(userId: "user-a")
            let sync1 = OfflineSyncService(storage: storage1, apiClient: client1)
            let record = try sync1.saveOfflineMemory(
                spaceId: spaceId,
                authorId: "user-a",
                title: "Grandma's Garden",
                content: "Saved while offline",
                format: .image,
                location: "Kyoto",
                tags: ["garden"],
                mediaData: photoBytes,
                mediaFileName: "garden.png",
                mediaMimeType: "image/png",
                accountId: "user-a"
            )
            #expect(record.localMediaAssetIds.count == 1)
            #expect(storage1.loadPendingMutations().count == 1)
        }

        // 3-7. Simulate app restart (new LocalStorageService instance) + clear disposable caches
        let storage2 = LocalStorageService(baseArchiveURL: dirs.archive, baseCacheURL: dirs.cache)
        storage2.clearCache()

        let loadedMemories = storage2.loadLocalMemories(forSpaceId: spaceId, accountId: "user-a")
        #expect(loadedMemories.count == 1)
        #expect(loadedMemories[0].title == "Grandma's Garden")

        let assets = storage2.listLocalMediaAssets(forMemoryId: loadedMemories[0].id)
        #expect(assets.count == 1)
        let (_, loadedPhoto) = try storage2.loadOriginalMediaData(assetId: assets[0].id)
        #expect(loadedPhoto == photoBytes)

        // 8-12. Restore connectivity, interrupt upload after media completes, then retry -> no duplicate media or memory
        var uploadSessionCalls = 0
        var createMemoryCalls = 0
        var failCreateOnce = true
        let fixedMediaId = UUID().uuidString

        OfflineSyncURLProtocol.handler = { req in
            let url = req.url?.absoluteString ?? ""
            if url.contains("/media/upload-session") {
                uploadSessionCalls += 1
                let json = """
                {"success":true,"data":{"mediaId":"\(fixedMediaId)","uploadUrl":"http://127.0.0.1:4000/api/v1/media/local-upload?key=test","storageKey":"originals/test/garden.png","expiresAt":"2026-12-01T00:00:00Z"}}
                """
                return (201, Data(json.utf8))
            }
            if url.contains("/media/local-upload") {
                return (200, Data("{\"success\":true}".utf8))
            }
            if url.contains("/complete") {
                return (200, Data("{\"success\":true,\"data\":{\"id\":\"\(fixedMediaId)\"}}".utf8))
            }
            if url.contains("/memories") && req.httpMethod == "POST" {
                createMemoryCalls += 1
                if failCreateOnce {
                    failCreateOnce = false
                    throw URLError(.networkConnectionLost)
                }
                let memId = loadedMemories[0].id
                let json = """
                {"success":true,"data":{"id":"\(memId)","spaceId":"\(spaceId)","authorId":"user-a","title":"Grandma's Garden","content":"Saved while offline","format":"image","capturedAt":"2026-11-14T00:00:00Z","location":"Kyoto","isFavorite":false,"associatedProfileIds":[],"mediaIds":["\(fixedMediaId)"],"tags":["garden"],"revision":1,"createdAt":"2026-11-14T00:00:00Z","updatedAt":"2026-11-14T00:00:00Z"}}
                """
                return (201, Data(json.utf8))
            }
            return (404, Data("{}".utf8))
        }

        let client2 = await makeMockClient(userId: "user-a")
        let sync2 = OfflineSyncService(storage: storage2, apiClient: client2)

        let firstRun = await sync2.syncPendingMutations(accountId: "user-a", force: true)
        #expect(firstRun.failed == 1)
        #expect(uploadSessionCalls == 1)
        #expect(createMemoryCalls == 1)

        // Retry: media already recorded remoteMediaId, so upload-session is NOT called again!
        let secondRun = await sync2.syncPendingMutations(accountId: "user-a", force: true)
        #expect(secondRun.succeeded == 1)
        #expect(uploadSessionCalls == 1)
        #expect(createMemoryCalls == 2)
        #expect(storage2.loadPendingMutations().isEmpty)

        // Original media remains intact on disk
        let (_, stillThere) = try storage2.loadOriginalMediaData(assetId: assets[0].id)
        #expect(stillThere == photoBytes)
    }

    @Test("Version conflict preserves both local and server versions and account switching isolates mutations")
    @MainActor
    func testVersionConflictAndAccountIsolation() async throws {
        let dirs = makeIsolatedDirs()
        defer { try? FileManager.default.removeItem(at: dirs.archive.deletingLastPathComponent()) }

        let storage = LocalStorageService(baseArchiveURL: dirs.archive, baseCacheURL: dirs.cache)
        let clientA = await makeMockClient(userId: "user-a")
        let syncA = OfflineSyncService(storage: storage, apiClient: clientA)

        let spaceId = UUID().uuidString
        let memId = UUID().uuidString
        let localMemory = Memory(
            id: memId,
            spaceId: spaceId,
            authorId: "user-a",
            title: "Original Title",
            format: .story,
            revision: 1,
            updatedAt: "2026-11-14T00:00:00Z"
        )
        try syncA.enqueueMemoryUpdate(memory: localMemory, title: "Device A Edit", accountId: "user-a")

        // Account B logs in -> must NOT sync Account A's mutation
        let clientB = await makeMockClient(userId: "user-b")
        let syncB = OfflineSyncService(storage: storage, apiClient: clientB)
        let runB = await syncB.syncPendingMutations(accountId: "user-b", force: true)
        #expect(runB.skippedAccountMismatch == 1)
        #expect(runB.attempted == 0)

        // Account A syncs and receives 409 VERSION_CONFLICT
        OfflineSyncURLProtocol.handler = { req in
            if req.httpMethod == "PATCH" {
                let conflictJson = """
                {"success":false,"error":{"code":"VERSION_CONFLICT","message":"Modified","details":{"serverMemory":{"id":"\(memId)","spaceId":"\(spaceId)","authorId":"user-a","title":"Device B Edit","format":"story","capturedAt":"2026-11-14T00:00:00Z","isFavorite":false,"associatedProfileIds":[],"mediaIds":[],"tags":[],"revision":2,"createdAt":"2026-11-14T00:00:00Z","updatedAt":"2026-11-14T01:00:00Z"}}}}
                """
                return (409, Data(conflictJson.utf8))
            }
            return (404, Data("{}".utf8))
        }

        let runA = await syncA.syncPendingMutations(accountId: "user-a", force: true)
        #expect(runA.conflicts == 1)
        let conflicts = storage.loadSyncConflicts(accountId: "user-a")
        #expect(conflicts.count == 1)
        #expect(conflicts[0].localMemory.title == "Device A Edit")
        #expect(conflicts[0].serverMemory.title == "Device B Edit")
    }

    @Test("Missing and corrupted local original media files fail integrity check explicitly")
    func testMissingAndCorruptedOriginalMedia() throws {
        let dirs = makeIsolatedDirs()
        defer { try? FileManager.default.removeItem(at: dirs.archive.deletingLastPathComponent()) }

        let storage = LocalStorageService(baseArchiveURL: dirs.archive, baseCacheURL: dirs.cache)
        let original = Data("heirloom-photo-bytes".utf8)
        let asset = try storage.saveOriginalMedia(
            data: original,
            memoryId: UUID().uuidString,
            spaceId: UUID().uuidString,
            fileName: "photo.jpg",
            mimeType: "image/jpeg"
        )

        let fileURL = storage.archiveDirectory.appendingPathComponent(asset.relativePath)

        // Corrupt the file on disk
        try Data("corrupted-bytes".utf8).write(to: fileURL)
        #expect(throws: LocalStorageError.self) {
            _ = try storage.loadOriginalMediaData(assetId: asset.id)
        }

        // Delete the file on disk
        try FileManager.default.removeItem(at: fileURL)
        #expect(throws: LocalStorageError.self) {
            _ = try storage.loadOriginalMediaData(assetId: asset.id)
        }
    }
}
