import Foundation
import Combine

@MainActor
public final class BookFallbackController: ObservableObject {
    @Published public private(set) var isFallbackActive: Bool = false
    @Published public private(set) var userFacingMessage: String?
    @Published public private(set) var internalDiagnosticReason: String?
    @Published public private(set) var retryAttempts: Int = 0

    public let maxRetryAttempts: Int

    public init(maxRetryAttempts: Int = 2) {
        self.maxRetryAttempts = max(0, maxRetryAttempts)
    }

    public func activateFallback(
        reason: RenderingTransitionReason,
        internalDetail: String
    ) {
        isFallbackActive = true
        internalDiagnosticReason = internalDetail
        userFacingMessage = Self.calmUserMessage(for: reason)
    }

    public func recordLoadFailure(detail: String) -> Bool {
        retryAttempts += 1
        if retryAttempts >= maxRetryAttempts {
            activateFallback(reason: .repeatedAssetFailures, internalDetail: detail)
            return true
        }
        return false
    }

    public func clearFallbackIfRecovered() {
        isFallbackActive = false
        userFacingMessage = nil
        internalDiagnosticReason = nil
        retryAttempts = 0
    }

    public static func calmUserMessage(for reason: RenderingTransitionReason) -> String {
        switch reason {
        case .thermalEscalation:
            return "Showing the accessible book view while your iPhone cools down. All your pages and customization remain preserved."
        case .memoryPressureCritical, .memoryPressureWarning:
            return "Showing the accessible book view to keep Memoria smooth and responsive."
        case .initialCapabilityAssessment:
            return "Interactive 3D is unavailable on this device configuration. Enjoy the full accessible heirloom book reader."
        case .sceneLoadFailure, .repeatedAssetFailures:
            return "The 3D book preview is temporarily unavailable. Your memories and book pages are ready in accessible reading mode."
        default:
            return "Showing the accessible heirloom book reader with full customization and page navigation."
        }
    }
}
