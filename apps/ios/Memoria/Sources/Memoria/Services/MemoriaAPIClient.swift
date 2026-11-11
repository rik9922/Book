import Foundation

public struct UploadSessionDTO: Decodable, Sendable {
    public let mediaId: String
    public let uploadUrl: String
    public let storageKey: String
    public let expiresAt: String
}

public struct KeysetCursorDTO: Decodable, Sendable {
    public let cursorTime: String
    public let cursorId: String
}

public struct MemoryPageDTO: Decodable, Sendable {
    public let items: [Memory]
    public let hasMore: Bool
    public let nextCursor: KeysetCursorDTO?
}

public struct AuthUserDTO: Decodable, Sendable {
    public let id: String
    public let email: String
    public let fullName: String
    public let avatarUrl: String?
}

public struct AuthSessionDTO: Decodable, Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresIn: Int
    public let user: AuthUserDTO
}

public struct NotificationItemDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let userId: String
    public let spaceId: String?
    public let type: String
    public let title: String
    public let body: String
    public let isRead: Bool
    public let createdAt: String
}

public struct SpaceProfileDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let name: String
    public let relationship: String?
    public let type: String
    public let birthDate: String?

    public init(
        id: String = UUID().uuidString,
        spaceId: String,
        name: String,
        relationship: String? = nil,
        type: String = "individual",
        birthDate: String? = nil
    ) {
        self.id = id
        self.spaceId = spaceId
        self.name = name
        self.relationship = relationship
        self.type = type
        self.birthDate = birthDate
    }
}

public struct CollectionDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let title: String
    public let description: String?
    public let coverMemoryId: String?
    public let memoryIds: [String]?
    public let createdAt: String
    public let updatedAt: String

    public init(
        id: String = UUID().uuidString,
        spaceId: String,
        title: String,
        description: String? = nil,
        coverMemoryId: String? = nil,
        memoryIds: [String]? = [],
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.spaceId = spaceId
        self.title = title
        self.description = description
        self.coverMemoryId = coverMemoryId
        self.memoryIds = memoryIds
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct CollectionDetailDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let title: String
    public let description: String?
    public let coverMemoryId: String?
    public let memoryIds: [String]?
    public let createdAt: String
    public let updatedAt: String
    public let memories: [Memory]?
}

public struct MemoryCommentDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let memoryId: String
    public let spaceId: String
    public let authorId: String
    public let authorName: String
    public let body: String
    public let createdAt: String

    public init(
        id: String = UUID().uuidString,
        memoryId: String,
        spaceId: String,
        authorId: String,
        authorName: String,
        body: String,
        createdAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.memoryId = memoryId
        self.spaceId = spaceId
        self.authorId = authorId
        self.authorName = authorName
        self.body = body
        self.createdAt = createdAt
    }
}

public struct PrintCatalogFormatDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let label: String
    public let dimensionsCm: String
    public let baseCents: Int
}

public struct PrintCatalogOptionDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let label: String
    public let surchargeCents: Int
}

public struct PrintCatalogDTO: Decodable, Sendable {
    public let currency: String
    public let pricingPolicy: String
    public let formats: [PrintCatalogFormatDTO]
    public let bindings: [PrintCatalogOptionDTO]
    public let paperStocks: [PrintCatalogOptionDTO]
}

public struct PrintOrderDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let userId: String
    public let bookId: String
    public let status: String
    public let totalCents: Int
    public let currency: String
    public let createdAt: String
}

public struct TimelineGroupDTO: Identifiable, Decodable, Sendable {
    public var id: String { yearMonth }
    public let yearMonth: String
    public let year: String
    public let items: [Memory]
}

public struct TimelineResponseDTO: Decodable, Sendable {
    public let total: Int
    public let groups: [TimelineGroupDTO]
}

public struct CalendarAnniversaryDTO: Identifiable, Decodable, Sendable {
    public var id: String { profileId }
    public let profileId: String
    public let name: String
    public let relationship: String?
    public let birthDate: String?
}

public struct CalendarResponseDTO: Decodable, Sendable {
    public let days: [String: [Memory]]
    public let anniversaries: [CalendarAnniversaryDTO]
    public let totalMemories: Int
}

public struct SpaceActivityItemDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let kind: String
    public let title: String
    public let actorId: String?
    public let timestamp: String
}

public struct StorageCategoriesDTO: Decodable, Sendable {
    public let imagesBytes: Int
    public let videoBytes: Int
    public let audioBytes: Int
    public let docsBytes: Int
}

public struct StorageBreakdownDTO: Decodable, Sendable {
    public let spaceId: String
    public let usedBytes: Int
    public let maxBytes: Int
    public let assetCount: Int
    public let categories: StorageCategoriesDTO
}

public struct UserPreferencesDTO: Codable, Sendable {
    public let reducedMotion: Bool?
    public let language: String?
    public let biometricLock: Bool?

    public init(reducedMotion: Bool? = nil, language: String? = nil, biometricLock: Bool? = nil) {
        self.reducedMotion = reducedMotion
        self.language = language
        self.biometricLock = biometricLock
    }
}

public struct SupportTicketDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let subject: String
    public let category: String
    public let message: String
    public let status: String
    public let createdAt: String
}

public struct BookPreflightCheckDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let label: String
    public let passed: Bool
    public let detail: String
}

public struct ActiveUploadSessionDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let spaceId: String?
    public let originalName: String
    public let mimeType: String
    public let sizeBytes: Int
    public let status: String
}

public struct MediaAssetDetailDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let spaceId: String
    public let originalName: String
    public let mimeType: String
    public let sizeBytes: Int
    public let status: String
    public let publicUrl: String?
}

public struct MediaOcrTranscriptDTO: Identifiable, Decodable, Sendable {
    public let id: String
    public let mediaId: String
    public let extractedText: String
}

public struct SyncBatchResultDTO: Decodable, Sendable {
    public let syncedCount: Int
    public let items: [Memory]
}

public struct BookPreflightReportDTO: Decodable, Sendable {
    public let bookId: String
    public let version: Int
    public let isFrozenForPrint: Bool
    public let frozenEditionHash: String?
    public let passed: Bool
    public let checks: [BookPreflightCheckDTO]
    public let checkedAt: String
}

public struct BookDocumentElementDTO: Codable, Sendable {
    public let id: String
    public let type: String
    public let content: String
}

public struct BookDocumentPageDTO: Codable, Sendable {
    public let id: String
    public let pageNumber: Int
    public let layoutType: String
    public let backgroundColor: String?
    public let elements: [BookDocumentElementDTO]
}

public struct BookDocumentSpreadDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spreadIndex: Int
    public let leftPage: BookDocumentPageDTO?
    public let rightPage: BookDocumentPageDTO?
}

public struct BookDocumentDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let title: String
    public let subtitle: String?
    public let format: String
    public let coverColor: String
    public let foilStamping: String
    public let coverTitle: String
    public let spineText: String?
    public let version: Int
    public let isFrozenForPrint: Bool
    public let frozenEditionHash: String?
    public let spreads: [BookDocumentSpreadDTO]
    public let createdAt: String
    public let updatedAt: String

    public func toBookVolumeRecord() -> BookVolumeRecord {
        let leather = BookLeatherSwatch.fromHexOrId(coverColor)
        let foil = BookFoilSwatch.fromRaw(foilStamping)
        let mappedSpreads: [BookSpreadPreview] = spreads.isEmpty
            ? Book3DSampleData.sampleSpreads
            : spreads.enumerated().map { idx, spread in
                let leftHead = spread.leftPage?.elements.first(where: { $0.type == "heading" })?.content ?? title
                let leftText = spread.leftPage?.elements.first(where: { $0.type == "caption" || $0.type == "text" })?.content ?? "Preserved family entry"
                let rightHead = spread.rightPage?.elements.first(where: { $0.type == "heading" })?.content ?? "Chapter \(idx + 1)"
                let rightText = spread.rightPage?.elements.first(where: { $0.type == "caption" || $0.type == "text" })?.content ?? (subtitle ?? "Curated Memoria Edition")
                return BookSpreadPreview(
                    spreadIndex: spread.spreadIndex,
                    chapterTitle: "Spread \(idx + 1)",
                    leftPageNumber: idx * 2 + 1,
                    rightPageNumber: idx * 2 + 2,
                    leftHeading: leftHead,
                    leftDate: String(createdAt.prefix(10)),
                    leftLocation: "Family Archive",
                    leftBody: leftText,
                    rightHeading: rightHead,
                    rightDate: String(updatedAt.prefix(10)),
                    rightLocation: "Memoria Vault",
                    rightBody: rightText,
                    ocrInscription: nil
                )
            }
        let cfg = Book3DConfiguration(
            bookId: id,
            leather: leather,
            foil: foil,
            paperStock: .warmCotton,
            ribbonColor: .sage,
            coverTitle: coverTitle.isEmpty ? title : coverTitle,
            coverSubtitle: subtitle ?? "Edition v\(version)",
            spineText: spineText ?? title
        )
        return BookVolumeRecord(
            id: id,
            editionBadge: isFrozenForPrint ? "Edition Frozen • v\(version)" : "Live Draft • v\(version)",
            totalPageCount: max(2, mappedSpreads.count * 2),
            isFrozenForPrint: isFrozenForPrint,
            format: format,
            version: version,
            frozenEditionHash: frozenEditionHash,
            spaceId: spaceId,
            defaultConfiguration: cfg,
            spreads: mappedSpreads
        )
    }
}

public struct OrderQuoteDTO: Codable, Sendable {
    public let currency: String
    public let format: String?
    public let shippingSpeed: String?
    public let quantity: Int
    public let unitCents: Int
    public let subtotalCents: Int
    public let shippingCents: Int
    public let taxCents: Int
    public let totalCents: Int
    public let estimatedDays: String
}

public struct OrderTrackingStageDTO: Identifiable, Codable, Sendable {
    public var id: String { stage }
    public let stage: String
    public let completed: Bool
    public let active: Bool
}

public struct OrderTrackingDTO: Codable, Sendable {
    public let orderId: String
    public let status: String
    public let carrier: String
    public let trackingNumber: String?
    public let trackingUrl: String?
    public let estimatedDays: String
    public let timeline: [OrderTrackingStageDTO]
}

public struct SpaceMemberDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let userId: String
    public let role: String
    public let joinedAt: String
}

public struct SpaceInvitationItemDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let spaceId: String
    public let inviteeEmail: String
    public let role: String
    public let status: String
    public let expiresAt: String
}

public struct SpaceInvitationResponseDTO: Decodable, Sendable {
    public let invitation: SpaceInvitationItemDTO
    public let inviteToken: String
}

public struct ShareLinkDTO: Identifiable, Codable, Sendable {
    public let id: String
    public let token: String
    public let hasPassphrase: Bool
    public let expiresAt: String
}

public actor MemoriaAPIClient {
    public static let shared = MemoriaAPIClient()

    private static let accessTokenKey = "memoria_access_token"
    private static let refreshTokenKey = "memoria_refresh_token"

    public private(set) var baseURL: URL
    private let urlSession: URLSession
    private let useKeychain: Bool
    private var authToken: String?
    private var refreshTokenValue: String?

    public init(
        baseURL: URL? = nil,
        urlSession: URLSession = .shared,
        useKeychain: Bool = true
    ) {
        if let provided = baseURL {
            self.baseURL = provided
        } else {
            self.baseURL = Self.resolveDefaultBaseURL()
        }
        self.urlSession = urlSession
        self.useKeychain = useKeychain
        if useKeychain {
            self.authToken = KeychainTokenStore.shared.read(forKey: Self.accessTokenKey)
            self.refreshTokenValue = KeychainTokenStore.shared.read(forKey: Self.refreshTokenKey)
        } else {
            self.authToken = nil
            self.refreshTokenValue = nil
        }
    }

    public static func resolveDefaultBaseURL() -> URL {
        if let envUrlString = ProcessInfo.processInfo.environment["MEMORIA_API_URL"],
           let envUrl = URL(string: envUrlString) {
            return envUrl
        }

        if let plistHost = Bundle.main.infoDictionary?["MemoriaAPIHost"] as? String,
           let plistUrl = URL(string: "http://\(plistHost)/api/v1") {
            return plistUrl
        }

        #if targetEnvironment(simulator)
        return URL(string: "http://127.0.0.1:4000/api/v1")!
        #else
        return URL(string: "http://mac.local:4000/api/v1") ?? URL(string: "http://127.0.0.1:4000/api/v1")!
        #endif
    }

    public func setBaseURL(_ url: URL) {
        self.baseURL = url
    }

    public func setAuthToken(_ token: String, refreshToken: String? = nil) {
        self.authToken = token
        if useKeychain {
            KeychainTokenStore.shared.save(token, forKey: Self.accessTokenKey)
        }
        if let refreshToken {
            self.refreshTokenValue = refreshToken
            if useKeychain {
                KeychainTokenStore.shared.save(refreshToken, forKey: Self.refreshTokenKey)
            }
        }
    }

    public func clearAuthSession() {
        self.authToken = nil
        self.refreshTokenValue = nil
        if useKeychain {
            KeychainTokenStore.shared.delete(forKey: Self.accessTokenKey)
            KeychainTokenStore.shared.delete(forKey: Self.refreshTokenKey)
        }
    }

    public func getAuthToken() -> String? {
        return self.authToken
    }

    private func createRequest(
        path: String,
        queryItems: [URLQueryItem] = [],
        method: String = "GET"
    ) -> URLRequest {
        var url = baseURL.appendingPathComponent(path)
        if !queryItems.isEmpty,
           var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            components.queryItems = queryItems
            if let composed = components.url {
                url = composed
            }
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("corr-ios-\(UUID().uuidString.prefix(8))", forHTTPHeaderField: "x-correlation-id")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    public func buildURL(path: String, queryItems: [URLQueryItem] = []) -> URL {
        createRequest(path: path, queryItems: queryItems).url ?? baseURL.appendingPathComponent(path)
    }

    private func refreshSessionIfPossible() async -> Bool {
        guard let refreshToken = refreshTokenValue, !refreshToken.isEmpty else {
            return false
        }
        var req = createRequest(path: "auth/refresh", method: "POST")
        req.setValue(nil, forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["refreshToken": refreshToken])

        guard let (data, resp) = try? await urlSession.data(for: req),
              let http = resp as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            return false
        }

        struct RefreshPayload: Decodable {
            let accessToken: String
            let refreshToken: String
        }
        struct Envelope: Decodable {
            let success: Bool
            let data: RefreshPayload
        }
        guard let decoded = try? JSONDecoder().decode(Envelope.self, from: data), decoded.success else {
            return false
        }
        setAuthToken(decoded.data.accessToken, refreshToken: decoded.data.refreshToken)
        return true
    }

    private func performAuthenticatedData(
        path: String,
        queryItems: [URLQueryItem] = [],
        method: String = "GET",
        body: Data? = nil
    ) async throws -> (Data, HTTPURLResponse) {
        var req = createRequest(path: path, queryItems: queryItems, method: method)
        req.httpBody = body
        var (data, response) = try await urlSession.data(for: req)

        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            if await refreshSessionIfPossible() {
                var retryReq = createRequest(path: path, queryItems: queryItems, method: method)
                retryReq.httpBody = body
                (data, response) = try await urlSession.data(for: retryReq)
            }
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "MemoriaAPIClient", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid HTTP response"])
        }
        return (data, httpResponse)
    }

    public func authenticateSyntheticUser(email: String = "arthur.bennett@synthetic.memoria.internal") async throws -> String {
        let syntheticToken = "synthetic-jwt-\(email)-\(UUID().uuidString.prefix(8))"
        setAuthToken(syntheticToken)
        return syntheticToken
    }

    public func login(email: String, password: String) async throws -> AuthSessionDTO {
        var request = createRequest(path: "auth/login", method: "POST")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])

        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (response as? HTTPURLResponse)?.statusCode ?? 401, userInfo: [NSLocalizedDescriptionKey: "Invalid email or password"])
        }

        struct Envelope: Decodable {
            let success: Bool
            let data: AuthSessionDTO
        }
        let decoded = try JSONDecoder().decode(Envelope.self, from: data)
        setAuthToken(decoded.data.accessToken, refreshToken: decoded.data.refreshToken)
        return decoded.data
    }

    public func register(email: String, password: String, fullName: String) async throws -> AuthSessionDTO {
        var request = createRequest(path: "auth/register", method: "POST")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email,
            "password": password,
            "fullName": fullName,
        ])

        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (response as? HTTPURLResponse)?.statusCode ?? 400, userInfo: [NSLocalizedDescriptionKey: "Registration failed"])
        }

        struct Envelope: Decodable {
            let success: Bool
            let data: AuthSessionDTO
        }
        let decoded = try JSONDecoder().decode(Envelope.self, from: data)
        setAuthToken(decoded.data.accessToken, refreshToken: decoded.data.refreshToken)
        return decoded.data
    }

    public func logout() async {
        if let refresh = refreshTokenValue {
            var request = createRequest(path: "auth/logout", method: "POST")
            request.httpBody = try? JSONSerialization.data(withJSONObject: ["refreshToken": refresh])
            _ = try? await urlSession.data(for: request)
        }
        clearAuthSession()
    }

    public func fetchSpaces() async throws -> [MemorySpace] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch spaces"])
        }

        struct Envelope: Decodable {
            let success: Bool
            let data: [MemorySpace]
        }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchMemories(spaceId: String, profileId: String? = nil) async throws -> [Memory] {
        var queryItems: [URLQueryItem] = []
        if let profileId, !profileId.isEmpty {
            queryItems.append(URLQueryItem(name: "profileId", value: profileId))
        }
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/memories",
            queryItems: queryItems,
            method: "GET"
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch memories"])
        }

        // Gateway returns `{ success, data: { items: [Memory], hasMore, nextCursor } }`
        struct GatewayEnvelope: Decodable {
            let success: Bool
            let data: MemoryPageDTO
        }
        if let paged = try? JSONDecoder().decode(GatewayEnvelope.self, from: data) {
            return paged.data.items
        }

        // Fallback for direct memory-service array responses
        struct DirectEnvelope: Decodable {
            let success: Bool
            let data: [Memory]
        }
        let decoded = try JSONDecoder().decode(DirectEnvelope.self, from: data)
        return decoded.data
    }

    public func uploadMedia(
        spaceId: String,
        fileName: String,
        mimeType: String,
        data fileData: Data
    ) async throws -> String {
        let sessionBody = try JSONSerialization.data(withJSONObject: [
            "spaceId": spaceId,
            "fileName": fileName,
            "mimeType": mimeType,
            "fileSizeBytes": fileData.count,
        ])
        let (sessionData, httpSessionResp) = try await performAuthenticatedData(
            path: "media/upload-session",
            method: "POST",
            body: sessionBody
        )
        guard (200...299).contains(httpSessionResp.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpSessionResp.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create upload session"])
        }

        struct SessionEnvelope: Decodable {
            let success: Bool
            let data: UploadSessionDTO
        }
        let session = try JSONDecoder().decode(SessionEnvelope.self, from: sessionData).data

        guard let uploadURL = URL(string: session.uploadUrl) else {
            throw NSError(domain: "MemoriaAPIClient", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid signed upload URL"])
        }

        var putReq = URLRequest(url: uploadURL)
        putReq.httpMethod = "PUT"
        putReq.setValue(mimeType, forHTTPHeaderField: "Content-Type")
        putReq.httpBody = fileData

        let (_, putResp) = try await urlSession.data(for: putReq)
        guard let httpPutResp = putResp as? HTTPURLResponse, (200...299).contains(httpPutResp.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (putResp as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: "Failed to upload media binary"])
        }

        let (_, httpCompleteResp) = try await performAuthenticatedData(
            path: "media/\(session.mediaId)/complete",
            method: "POST",
            body: Data("{}".utf8)
        )
        guard (200...299).contains(httpCompleteResp.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpCompleteResp.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to finalize media upload"])
        }

        return session.mediaId
    }

    public func createMemory(
        spaceId: String,
        title: String,
        content: String?,
        format: String = "story",
        location: String? = nil,
        tags: [String] = [],
        mediaIds: [String] = []
    ) async throws -> Memory {
        var payload: [String: Any] = [
            "title": title,
            "format": format,
            "tags": tags,
            "mediaIds": mediaIds,
            "capturedAt": ISO8601DateFormatter().string(from: Date()),
        ]
        if let content {
            payload["content"] = content
        }
        if let location {
            payload["location"] = location
        }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/memories",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create memory"])
        }

        struct SingleResponseEnvelope: Decodable {
            let success: Bool
            let data: Memory
        }

        let decoded = try JSONDecoder().decode(SingleResponseEnvelope.self, from: data)
        return decoded.data
    }

    public func fetchNotifications(unreadOnly: Bool = false) async throws -> [NotificationItemDTO] {
        let queryItems = unreadOnly ? [URLQueryItem(name: "unreadOnly", value: "true")] : []
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "notifications",
            queryItems: queryItems,
            method: "GET"
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch notifications"])
        }

        struct Envelope: Decodable {
            let success: Bool
            let data: [NotificationItemDTO]
        }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchBook3DManifest() async throws -> Book3DManifestDTO {
        let request = createRequest(path: "books/3d/manifest", method: "GET")
        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(
                domain: "MemoriaAPIClient",
                code: (response as? HTTPURLResponse)?.statusCode ?? 500,
                userInfo: [NSLocalizedDescriptionKey: "Failed to fetch 3D book manifest"]
            )
        }

        struct ManifestEnvelope: Decodable {
            let success: Bool
            let data: Book3DManifestDTO
        }

        let decoded = try JSONDecoder().decode(ManifestEnvelope.self, from: data)
        return decoded.data
    }

    public func createSpace(name: String, type: String = "family", description: String? = nil) async throws -> MemorySpace {
        var payload: [String: Any] = ["name": name, "type": type]
        if let description, !description.isEmpty { payload["description"] = description }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create space"])
        }
        struct Envelope: Decodable { let success: Bool; let data: MemorySpace }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchProfiles(spaceId: String) async throws -> [SpaceProfileDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/profiles", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch profiles"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [SpaceProfileDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func createProfile(
        spaceId: String,
        name: String,
        type: String,
        relationship: String? = nil,
        birthDate: String? = nil
    ) async throws -> SpaceProfileDTO {
        var payload: [String: Any] = ["name": name, "type": type]
        if let relationship, !relationship.isEmpty { payload["relationship"] = relationship }
        if let birthDate, !birthDate.isEmpty { payload["birthDate"] = birthDate }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/profiles", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create profile"])
        }
        struct Envelope: Decodable { let success: Bool; let data: SpaceProfileDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func updateProfile(
        spaceId: String,
        profileId: String,
        name: String? = nil,
        relationship: String? = nil,
        type: String? = nil,
        birthDate: String? = nil,
        clearRelationship: Bool = false,
        clearBirthDate: Bool = false
    ) async throws -> SpaceProfileDTO {
        var payload: [String: Any] = [:]
        if let name { payload["name"] = name }
        if clearRelationship {
            payload["relationship"] = NSNull()
        } else if let relationship {
            payload["relationship"] = relationship
        }
        if let type { payload["type"] = type }
        if clearBirthDate {
            payload["birthDate"] = NSNull()
        } else if let birthDate, !birthDate.isEmpty {
            payload["birthDate"] = birthDate
        }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/profiles/\(profileId)",
            method: "PATCH",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to update profile"])
        }
        struct Envelope: Decodable { let success: Bool; let data: SpaceProfileDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func deleteProfile(spaceId: String, profileId: String) async throws {
        let (_, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/profiles/\(profileId)",
            method: "DELETE"
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to delete profile"])
        }
    }

    public func fetchCollections(spaceId: String) async throws -> [CollectionDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/collections", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch collections"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [CollectionDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchCollectionDetail(spaceId: String, collectionId: String) async throws -> CollectionDetailDTO {
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/collections/\(collectionId)",
            method: "GET"
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch collection detail"])
        }
        struct Envelope: Decodable { let success: Bool; let data: CollectionDetailDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func createCollection(spaceId: String, title: String, description: String? = nil) async throws -> CollectionDTO {
        var payload: [String: Any] = ["title": title]
        if let description, !description.isEmpty { payload["description"] = description }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/collections", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create collection"])
        }
        struct Envelope: Decodable { let success: Bool; let data: CollectionDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func updateCollection(
        spaceId: String,
        collectionId: String,
        title: String? = nil,
        description: String? = nil,
        coverMemoryId: String? = nil,
        clearDescription: Bool = false
    ) async throws -> CollectionDTO {
        var payload: [String: Any] = [:]
        if let title { payload["title"] = title }
        if clearDescription {
            payload["description"] = NSNull()
        } else if let description {
            payload["description"] = description
        }
        if let coverMemoryId { payload["coverMemoryId"] = coverMemoryId }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/collections/\(collectionId)",
            method: "PATCH",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to update collection"])
        }
        struct Envelope: Decodable { let success: Bool; let data: CollectionDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func reorderCollectionMemories(
        spaceId: String,
        collectionId: String,
        memoryIds: [String]
    ) async throws -> CollectionDTO {
        let body = try JSONSerialization.data(withJSONObject: ["memoryIds": memoryIds])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/collections/\(collectionId)/reorder",
            method: "PUT",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to reorder collection memories"])
        }
        struct Envelope: Decodable { let success: Bool; let data: CollectionDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func addMemoryToCollection(
        spaceId: String,
        collectionId: String,
        memoryId: String,
        sortOrder: Int = 0
    ) async throws -> CollectionDTO {
        let body = try JSONSerialization.data(withJSONObject: [
            "memoryId": memoryId,
            "sortOrder": sortOrder,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/collections/\(collectionId)/memories",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to add memory to collection"])
        }
        struct Envelope: Decodable { let success: Bool; let data: CollectionDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func removeMemoryFromCollection(
        spaceId: String,
        collectionId: String,
        memoryId: String
    ) async throws {
        let (_, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/collections/\(collectionId)/memories/\(memoryId)",
            method: "DELETE"
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to remove memory from collection"])
        }
    }

    public func deleteCollection(spaceId: String, collectionId: String) async throws {
        let (_, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/collections/\(collectionId)",
            method: "DELETE"
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to delete collection"])
        }
    }

    public func fetchComments(memoryId: String) async throws -> [MemoryCommentDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "memories/\(memoryId)/comments", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch comments"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [MemoryCommentDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func addComment(memoryId: String, body commentBody: String, authorName: String? = nil) async throws -> MemoryCommentDTO {
        var payload: [String: Any] = ["body": commentBody]
        if let authorName, !authorName.isEmpty { payload["authorName"] = authorName }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(path: "memories/\(memoryId)/comments", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to add comment"])
        }
        struct Envelope: Decodable { let success: Bool; let data: MemoryCommentDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchTrashMemories(spaceId: String) async throws -> [Memory] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/memories/trash", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch trash"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [Memory] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func restoreMemory(memoryId: String) async throws -> Memory {
        let (data, httpResponse) = try await performAuthenticatedData(path: "memories/\(memoryId)/restore", method: "POST", body: Data("{}".utf8))
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to restore memory"])
        }
        struct Envelope: Decodable { let success: Bool; let data: Memory }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func markNotificationRead(id: String) async throws {
        let (_, httpResponse) = try await performAuthenticatedData(path: "notifications/\(id)/read", method: "PATCH", body: Data("{}".utf8))
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to mark notification read"])
        }
    }

    public func markAllNotificationsRead() async throws {
        let (_, httpResponse) = try await performAuthenticatedData(path: "notifications/read-all", method: "POST", body: Data("{}".utf8))
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to mark notifications read"])
        }
    }

    public func fetchBookCatalog() async throws -> PrintCatalogDTO {
        let request = createRequest(path: "books/catalog", method: "GET")
        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: "Failed to load catalog"])
        }
        struct Envelope: Decodable { let success: Bool; let data: PrintCatalogDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchMyOrders() async throws -> [PrintOrderDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "orders/me", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load orders"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [PrintOrderDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func forgotPassword(email: String) async throws {
        var request = createRequest(path: "auth/forgot-password", method: "POST")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email])
        let (_, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (response as? HTTPURLResponse)?.statusCode ?? 400, userInfo: [NSLocalizedDescriptionKey: "Failed to send password reset instructions"])
        }
    }

    public func verifyEmailCode(tokenOrCode: String) async throws {
        let payload: [String: String] = tokenOrCode.count >= 16
            ? ["token": tokenOrCode]
            : ["code": tokenOrCode]
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (_, httpResponse) = try await performAuthenticatedData(path: "auth/verify-code", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Invalid verification code"])
        }
    }

    public func acceptInvitation(token: String) async throws {
        let body = try JSONSerialization.data(withJSONObject: ["token": token])
        let (_, httpResponse) = try await performAuthenticatedData(path: "collab/invitations/accept", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Invalid or expired invitation token"])
        }
    }

    public func fetchTimeline(spaceId: String) async throws -> TimelineResponseDTO {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/timeline", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load timeline"])
        }
        struct Envelope: Decodable { let success: Bool; let data: TimelineResponseDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchCalendar(spaceId: String, year: String? = nil, month: String? = nil) async throws -> CalendarResponseDTO {
        var queryItems: [URLQueryItem] = []
        if let year, !year.isEmpty { queryItems.append(URLQueryItem(name: "year", value: year)) }
        if let month, !month.isEmpty { queryItems.append(URLQueryItem(name: "month", value: month)) }
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/calendar", queryItems: queryItems, method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load calendar"])
        }
        struct Envelope: Decodable { let success: Bool; let data: CalendarResponseDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchSpaceActivity(spaceId: String) async throws -> [SpaceActivityItemDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/activity", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load space activity"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [SpaceActivityItemDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func editMemory(
        memoryId: String,
        title: String,
        content: String?,
        location: String?,
        tags: [String]? = nil,
        capturedAt: String? = nil
    ) async throws -> Memory {
        var dict: [String: Any] = ["title": title]
        if let content { dict["content"] = content }
        if let location { dict["location"] = location }
        if let tags { dict["tags"] = tags }
        if let capturedAt, !capturedAt.isEmpty { dict["capturedAt"] = capturedAt }
        let body = try JSONSerialization.data(withJSONObject: dict)
        let (data, httpResponse) = try await performAuthenticatedData(path: "memories/\(memoryId)", method: "PATCH", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to update memory"])
        }
        struct Envelope: Decodable { let success: Bool; let data: Memory }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func applyMediaNonDestructiveEdit(mediaId: String, rotateDegrees: Int, warmth: Double, cropPreset: String = "original") async throws {
        let body = try JSONSerialization.data(withJSONObject: [
            "rotateDegrees": rotateDegrees,
            "warmth": warmth,
            "cropPreset": cropPreset,
        ])
        let (_, httpResponse) = try await performAuthenticatedData(path: "media/\(mediaId)/derivatives", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to save non-destructive image adjustments"])
        }
    }

    public func updatePreferences(biometricLock: Bool, reducedMotion: Bool, language: String = "en") async throws -> UserPreferencesDTO {
        let body = try JSONSerialization.data(withJSONObject: [
            "biometricLock": biometricLock,
            "reducedMotion": reducedMotion,
            "language": language,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(path: "auth/me/preferences", method: "PATCH", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to save preferences"])
        }
        struct Envelope: Decodable { let success: Bool; let data: UserPreferencesDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchStorageBreakdown(spaceId: String) async throws -> StorageBreakdownDTO {
        let (data, httpResponse) = try await performAuthenticatedData(path: "media/spaces/\(spaceId)/storage/breakdown", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load storage breakdown"])
        }
        struct Envelope: Decodable { let success: Bool; let data: StorageBreakdownDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func submitSupportTicket(subject: String, category: String, message: String) async throws -> SupportTicketDTO {
        let body = try JSONSerialization.data(withJSONObject: [
            "subject": subject,
            "category": category,
            "message": message,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(path: "support/tickets", method: "POST", body: body)
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to submit support ticket"])
        }
        struct Envelope: Decodable { let success: Bool; let data: SupportTicketDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func runPreflight(bookId: String) async throws -> BookPreflightReportDTO {
        let (data, httpResponse) = try await performAuthenticatedData(path: "books/\(bookId)/preflight", method: "POST", body: Data("{}".utf8))
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Preflight verification failed"])
        }
        struct Envelope: Decodable { let success: Bool; let data: BookPreflightReportDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchActiveUploadSessions(spaceId: String? = nil) async throws -> [ActiveUploadSessionDTO] {
        let queryItems = spaceId.map { [URLQueryItem(name: "spaceId", value: $0)] } ?? []
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "media/upload-sessions/active",
            queryItems: queryItems,
            method: "GET"
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load upload sessions"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [ActiveUploadSessionDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func retryUploadSession(mediaId: String) async throws {
        let (_, httpResponse) = try await performAuthenticatedData(
            path: "media/upload-sessions/\(mediaId)/retry",
            method: "POST",
            body: Data("{}".utf8)
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to retry upload session"])
        }
    }

    public func syncOfflineBatch(mutations: [[String: String]]) async throws -> SyncBatchResultDTO {
        let body = try JSONSerialization.data(withJSONObject: ["mutations": mutations])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "memories/sync/batch",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to sync offline batch"])
        }
        struct Envelope: Decodable { let success: Bool; let data: SyncBatchResultDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchMediaAsset(mediaId: String) async throws -> MediaAssetDetailDTO {
        let (data, httpResponse) = try await performAuthenticatedData(path: "media/\(mediaId)", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load media asset"])
        }
        struct Envelope: Decodable { let success: Bool; let data: MediaAssetDetailDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchMediaOcr(mediaId: String) async throws -> [MediaOcrTranscriptDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "media/\(mediaId)/ocr", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to load OCR transcripts"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [MediaOcrTranscriptDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    // MARK: - Live Books, Curation & Print Fulfillment

    public func fetchSpaceBooks(spaceId: String) async throws -> [BookDocumentDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/books", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch space books"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [BookDocumentDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func createSpaceBook(
        spaceId: String,
        title: String,
        subtitle: String? = nil,
        format: String = "hardcover_standard_8x10",
        coverColor: String = "#76556F",
        foilStamping: String = "gold"
    ) async throws -> BookDocumentDTO {
        var payload: [String: Any] = [
            "title": title,
            "format": format,
            "coverColor": coverColor,
            "foilStamping": foilStamping,
            "coverTitle": title,
        ]
        if let subtitle, !subtitle.isEmpty { payload["subtitle"] = subtitle }
        let body = try JSONSerialization.data(withJSONObject: payload)
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "spaces/\(spaceId)/books",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create book edition"])
        }
        struct Envelope: Decodable { let success: Bool; let data: BookDocumentDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func curateBookMemories(
        bookId: String,
        memories: [(id: String, title: String, content: String?, capturedAt: String)],
        template: String = "editorial_classic",
        preserveOrder: Bool = true
    ) async throws -> BookDocumentDTO {
        let memObjects: [[String: Any]] = memories.map { m in
            var dict: [String: Any] = [
                "id": m.id,
                "title": m.title,
                "capturedAt": m.capturedAt,
            ]
            if let content = m.content { dict["content"] = content }
            return dict
        }
        let body = try JSONSerialization.data(withJSONObject: [
            "memories": memObjects,
            "template": template,
            "preserveOrder": preserveOrder,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "books/\(bookId)/curate",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to curate memories into book"])
        }
        struct Envelope: Decodable { let success: Bool; let data: BookDocumentDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func reorderBookSpreads(bookId: String, spreadIds: [String]) async throws -> BookDocumentDTO {
        let body = try JSONSerialization.data(withJSONObject: ["spreadIds": spreadIds])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "books/\(bookId)/spreads/reorder",
            method: "PUT",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to reorder book spreads"])
        }
        struct Envelope: Decodable { let success: Bool; let data: BookDocumentDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func updateBook(
        bookId: String,
        coverTitle: String,
        coverColor: String,
        foilStamping: String
    ) async throws -> BookDocumentDTO {
        let body = try JSONSerialization.data(withJSONObject: [
            "coverTitle": coverTitle,
            "coverColor": coverColor,
            "foilStamping": foilStamping,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "books/\(bookId)",
            method: "PATCH",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to update book"])
        }
        struct Envelope: Decodable { let success: Bool; let data: BookDocumentDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func freezeBook(bookId: String) async throws -> BookDocumentDTO {
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "books/\(bookId)/freeze",
            method: "POST",
            body: Data("{}".utf8)
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to freeze edition"])
        }
        struct Envelope: Decodable { let success: Bool; let data: BookDocumentDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchOrderQuote(
        format: String,
        binding: String,
        paperWeight: String,
        quantity: Int,
        country: String,
        shippingSpeed: String
    ) async throws -> OrderQuoteDTO {
        let body = try JSONSerialization.data(withJSONObject: [
            "format": format,
            "binding": binding,
            "paperWeight": paperWeight,
            "quantity": quantity,
            "country": country,
            "shippingSpeed": shippingSpeed,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "orders/quote",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to calculate print quote"])
        }
        struct Envelope: Decodable { let success: Bool; let data: OrderQuoteDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func createPrintOrder(
        spaceId: String,
        bookId: String,
        format: String,
        binding: String,
        paperWeight: String,
        quantity: Int,
        shippingSpeed: String,
        recipientName: String,
        line1: String,
        city: String,
        postalCode: String,
        country: String,
        editionHash: String? = nil
    ) async throws -> PrintOrderDTO {
        var printSpec: [String: Any] = [
            "format": format,
            "paperWeight": paperWeight,
            "binding": binding,
        ]
        if let editionHash { printSpec["editionHash"] = editionHash }
        let body = try JSONSerialization.data(withJSONObject: [
            "spaceId": spaceId,
            "bookId": bookId,
            "quantity": quantity,
            "format": format,
            "shippingSpeed": shippingSpeed,
            "shippingAddress": [
                "recipientName": recipientName,
                "line1": line1,
                "city": city,
                "postalCode": postalCode,
                "country": country,
            ],
            "printSpec": printSpec,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "orders",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to place print order"])
        }
        struct Envelope: Decodable { let success: Bool; let data: PrintOrderDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func fetchOrderTracking(orderId: String) async throws -> OrderTrackingDTO {
        let (data, httpResponse) = try await performAuthenticatedData(path: "orders/\(orderId)/tracking", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch order tracking"])
        }
        struct Envelope: Decodable { let success: Bool; let data: OrderTrackingDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func reorderPrintOrder(orderId: String, quantity: Int = 1) async throws -> PrintOrderDTO {
        let body = try JSONSerialization.data(withJSONObject: ["quantity": quantity])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "orders/\(orderId)/reorder",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to reorder edition"])
        }
        struct Envelope: Decodable { let success: Bool; let data: PrintOrderDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    // MARK: - Collaboration Governance & Invitations

    public func fetchSpaceMembers(spaceId: String) async throws -> [SpaceMemberDTO] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "collab/spaces/\(spaceId)/members", method: "GET")
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch space members"])
        }
        struct Envelope: Decodable { let success: Bool; let data: [SpaceMemberDTO] }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func sendSpaceInvitation(spaceId: String, inviteeEmail: String, role: String = "contributor") async throws -> SpaceInvitationResponseDTO {
        let body = try JSONSerialization.data(withJSONObject: [
            "inviteeEmail": inviteeEmail,
            "role": role,
        ])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "collab/spaces/\(spaceId)/invitations",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to send invitation"])
        }
        struct Envelope: Decodable { let success: Bool; let data: SpaceInvitationResponseDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func updateSpaceMemberRole(spaceId: String, userId: String, role: String) async throws -> SpaceMemberDTO {
        let body = try JSONSerialization.data(withJSONObject: ["role": role])
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "collab/spaces/\(spaceId)/members/\(userId)",
            method: "PATCH",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to update member role"])
        }
        struct Envelope: Decodable { let success: Bool; let data: SpaceMemberDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }

    public func createShareLink(spaceId: String, passphrase: String? = nil, allowDownloads: Bool = false) async throws -> ShareLinkDTO {
        var dict: [String: Any] = [
            "allowDownloads": allowDownloads,
            "expiresInDays": 30,
        ]
        if let passphrase, !passphrase.isEmpty { dict["passphrase"] = passphrase }
        let body = try JSONSerialization.data(withJSONObject: dict)
        let (data, httpResponse) = try await performAuthenticatedData(
            path: "collab/spaces/\(spaceId)/share-links",
            method: "POST",
            body: body
        )
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Failed to create share link"])
        }
        struct Envelope: Decodable { let success: Bool; let data: ShareLinkDTO }
        return try JSONDecoder().decode(Envelope.self, from: data).data
    }
}
