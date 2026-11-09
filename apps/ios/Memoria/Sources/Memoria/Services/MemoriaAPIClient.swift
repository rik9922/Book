import Foundation

public actor MemoriaAPIClient {
    public static let shared = MemoriaAPIClient()

    public private(set) var baseURL: URL
    private var authToken: String?

    public init(baseURL: URL? = nil) {
        if let provided = baseURL {
            self.baseURL = provided
        } else {
            self.baseURL = Self.resolveDefaultBaseURL()
        }
    }

    public static func resolveDefaultBaseURL() -> URL {
        // 1. Environment Variable Override (Xcode scheme / test runner)
        if let envUrlString = ProcessInfo.processInfo.environment["MEMORIA_API_URL"],
           let envUrl = URL(string: envUrlString) {
            return envUrl
        }

        // 2. Info.plist configuration
        if let plistHost = Bundle.main.infoDictionary?["MemoriaAPIHost"] as? String,
           let plistUrl = URL(string: "http://\(plistHost)/api/v1") {
            return plistUrl
        }

        // 3. Simulator loopback vs Physical device LAN host
        #if targetEnvironment(simulator)
        return URL(string: "http://127.0.0.1:4000/api/v1")!
        #else
        // On physical devices, default to mac.local mDNS or fallback
        return URL(string: "http://mac.local:4000/api/v1") ?? URL(string: "http://127.0.0.1:4000/api/v1")!
        #endif
    }

    public func setBaseURL(_ url: URL) {
        self.baseURL = url
    }

    public func setAuthToken(_ token: String) {
        self.authToken = token
    }

    public func getAuthToken() -> String? {
        return self.authToken
    }

    private func createRequest(path: String, method: String = "GET") -> URLRequest {
        let url = baseURL.appendingPathComponent(path)
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

    public func authenticateSyntheticUser(email: String = "arthur.bennett@synthetic.memoria.internal") async throws -> String {
        let syntheticToken = "synthetic-jwt-\(email)-\(UUID().uuidString.prefix(8))"
        self.authToken = syntheticToken
        return syntheticToken
    }

    public func fetchMemories(spaceId: String) async throws -> [Memory] {
        var request = createRequest(path: "spaces/\(spaceId)/memories")
        request.httpMethod = "GET"

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: "Failed to fetch memories"])
        }

        struct ResponseEnvelope: Decodable {
            let success: Bool
            let data: [Memory]
        }

        let decoded = try JSONDecoder().decode(ResponseEnvelope.self, from: data)
        return decoded.data
    }

    public func createMemory(spaceId: String, title: String, content: String?, format: String = "text", location: String? = nil, tags: [String] = [], mediaIds: [String] = []) async throws -> Memory {
        var request = createRequest(path: "spaces/\(spaceId)/memories", method: "POST")

        let payload: [String: Any] = [
            "title": title,
            "content": content as Any,
            "format": format,
            "location": location as Any,
            "tags": tags,
            "mediaIds": mediaIds,
            "capturedAt": ISO8601DateFormatter().string(from: Date())
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create memory"])
        }

        struct SingleResponseEnvelope: Decodable {
            let success: Bool
            let data: Memory
        }

        let decoded = try JSONDecoder().decode(SingleResponseEnvelope.self, from: data)
        return decoded.data
    }
}
