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

public actor MemoriaAPIClient {
    public static let shared = MemoriaAPIClient()

    private static let accessTokenKey = "memoria_access_token"
    private static let refreshTokenKey = "memoria_refresh_token"

    public private(set) var baseURL: URL
    private var authToken: String?
    private var refreshTokenValue: String?

    public init(baseURL: URL? = nil) {
        if let provided = baseURL {
            self.baseURL = provided
        } else {
            self.baseURL = Self.resolveDefaultBaseURL()
        }
        self.authToken = KeychainTokenStore.shared.read(forKey: Self.accessTokenKey)
        self.refreshTokenValue = KeychainTokenStore.shared.read(forKey: Self.refreshTokenKey)
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
        KeychainTokenStore.shared.save(token, forKey: Self.accessTokenKey)
        if let refreshToken {
            self.refreshTokenValue = refreshToken
            KeychainTokenStore.shared.save(refreshToken, forKey: Self.refreshTokenKey)
        }
    }

    public func clearAuthSession() {
        self.authToken = nil
        self.refreshTokenValue = nil
        KeychainTokenStore.shared.delete(forKey: Self.accessTokenKey)
        KeychainTokenStore.shared.delete(forKey: Self.refreshTokenKey)
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

        guard let (data, resp) = try? await URLSession.shared.data(for: req),
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
        var (data, response) = try await URLSession.shared.data(for: req)

        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            if await refreshSessionIfPossible() {
                var retryReq = createRequest(path: path, queryItems: queryItems, method: method)
                retryReq.httpBody = body
                (data, response) = try await URLSession.shared.data(for: retryReq)
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

        let (data, response) = try await URLSession.shared.data(for: request)
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

        let (data, response) = try await URLSession.shared.data(for: request)
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
            _ = try? await URLSession.shared.data(for: request)
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

    public func fetchMemories(spaceId: String) async throws -> [Memory] {
        let (data, httpResponse) = try await performAuthenticatedData(path: "spaces/\(spaceId)/memories", method: "GET")
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

        let (_, putResp) = try await URLSession.shared.data(for: putReq)
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
        let (data, response) = try await URLSession.shared.data(for: request)
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
}
