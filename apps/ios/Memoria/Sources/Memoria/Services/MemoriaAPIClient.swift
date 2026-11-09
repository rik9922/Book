import Foundation

public actor MemoriaAPIClient {
    public static let shared = MemoriaAPIClient()

    private let baseURL: URL
    private var authToken: String?

    public init(baseURL: URL = URL(string: "http://127.0.0.1:4000/api/v1")!) {
        self.baseURL = baseURL
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
        // Return synthetic session token for local/testing environment
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

        struct ResponseEnvelope: Codable {
            let success: Bool
            let data: [Memory]
        }

        let envelope = try JSONDecoder().decode(ResponseEnvelope.self, from: data)
        return envelope.data
    }

    public func createMemory(
        spaceId: String,
        title: String,
        content: String,
        format: MemoryFormat = .photo,
        capturedAt: String = ISO8601DateFormatter().string(from: Date()),
        location: String? = nil,
        tags: [String] = [],
        mediaIds: [String] = []
    ) async throws -> Memory {
        var request = createRequest(path: "spaces/\(spaceId)/memories", method: "POST")

        let payload: [String: Any] = [
            "spaceId": spaceId,
            "title": title,
            "content": content,
            "format": format.rawValue,
            "capturedAt": capturedAt,
            "location": location as Any,
            "tags": tags,
            "mediaIds": mediaIds,
            "associatedProfileIds": []
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload.compactMapValues { $0 })

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "MemoriaAPIClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: "Failed to create memory"])
        }

        struct CreateResponseEnvelope: Codable {
            let success: Bool
            let data: Memory
        }

        let envelope = try JSONDecoder().decode(CreateResponseEnvelope.self, from: data)
        return envelope.data
    }
}

