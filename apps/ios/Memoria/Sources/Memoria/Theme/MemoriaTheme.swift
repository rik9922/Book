import SwiftUI

/// Single Source of Truth for Memoria Design System on iOS
/// Brand Identity: MEMORIA — Living Archive
/// Principle: "The memories are the heroes. The interface should support them, never compete with them."
/// Theme Decision: LIGHT MODE ONLY (Permanent light appearance across all surfaces)
public enum MemoriaTheme {
    // MARK: - 1. Primary Brand Foundation
    public static let ink = Color(hex: 0x20242C)         // Deep Ink (#20242C)
    public static let ivory = Color(hex: 0xF7F4EE)       // Warm Ivory (#F7F4EE)
    public static let plum = Color(hex: 0x76556F)        // Muted Plum (#76556F)
    public static let plumHover = Color(hex: 0x63445C)   // Interactive Plum Hover (#63445C)
    public static let plumLight = Color(hex: 0xF4EEF3)   // Soft Plum Tint (#F4EEF3)
    public static let sageSoft = Color(hex: 0x849483)    // Soft Decorative Sage (#849483)
    public static let sageFunc = Color(hex: 0x5F735E)    // Functional Accessible Sage (#5F735E)
    public static let sageLight = Color(hex: 0xEEF2ED)   // Light Sage Tint (#EEF2ED)

    // MARK: - 2. Surface Hierarchy (Strictly Light Mode)
    public static let canvas = Color(hex: 0xF7F4EE)
    public static let surfacePrimary = Color(hex: 0xFFFFFF)
    public static let surfaceSecondary = Color(hex: 0xF0ECE1)
    public static let surfaceElevated = Color(hex: 0xFFFFFF)
    public static let mediaCanvas = Color(hex: 0x1A1A1E) // Immersive photo viewer only

    // MARK: - 3. Text Hierarchy
    public static let textPrimary = Color(hex: 0x28272A)
    public static let textSecondary = Color(hex: 0x5C5955)
    public static let textTertiary = Color(hex: 0x78736E)
    public static let textOnAction = Color(hex: 0xFFFFFF)

    // MARK: - 4. Borders & Separators
    public static let borderSubtle = Color(hex: 0xE7E2DA)
    public static let borderStrong = Color(hex: 0x8D857A)
    public static let focusRing = Color(hex: 0x76556F)

    // MARK: - 5. Semantic Operational Colours
    public static let success = Color(hex: 0x22593E)
    public static let successBg = Color(hex: 0xE8F3ED)
    public static let successBorder = Color(hex: 0xB6DBC7)

    public static let warning = Color(hex: 0x85530E)
    public static let warningBg = Color(hex: 0xFDF5E6)
    public static let warningBorder = Color(hex: 0xF2D8A7)

    public static let error = Color(hex: 0x992828)
    public static let errorBg = Color(hex: 0xFDE8E8)
    public static let errorBorder = Color(hex: 0xF5B8B8)

    public static let info = Color(hex: 0x234E70)
    public static let infoBg = Color(hex: 0xEBF2F7)
    public static let infoBorder = Color(hex: 0xB3D1E6)

    public static let pending = Color(hex: 0x6B533E)
    public static let pendingBg = Color(hex: 0xF7EFE6)
    public static let pendingBorder = Color(hex: 0xDFD0C0)

    public static let disabled = Color(hex: 0x9E9A95)
    public static let disabledBg = Color(hex: 0xEAE5DE)

    // MARK: - 6. Corner Radii
    public static let radiusSm: CGFloat = 6
    public static let radiusMd: CGFloat = 8
    public static let radiusLg: CGFloat = 12
    public static let radiusXl: CGFloat = 16
    public static let radius2Xl: CGFloat = 20

    // MARK: - 7. Shadows
    public static let shadowSubtle = Color.black.opacity(0.04)
    public static let shadowElevated = Color.black.opacity(0.08)
}

// MARK: - Hex Color Initializer
extension Color {
    public init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 08) & 0xff) / 255,
            blue: Double((hex >> 00) & 0xff) / 255,
            opacity: alpha
        )
    }
}

// MARK: - Reusable View Modifiers
public struct MemoriaCardModifier: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .background(MemoriaTheme.surfacePrimary)
            .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg))
            .overlay(
                RoundedRectangle(cornerRadius: MemoriaTheme.radiusLg)
                    .stroke(MemoriaTheme.borderSubtle, lineWidth: 1)
            )
            .shadow(color: MemoriaTheme.shadowSubtle, radius: 4, x: 0, y: 2)
    }
}

public struct MemoriaPlumButtonModifier: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(MemoriaTheme.textOnAction)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(MemoriaTheme.plum)
            .clipShape(RoundedRectangle(cornerRadius: MemoriaTheme.radiusMd))
    }
}

extension View {
    public func memoriaCard() -> some View {
        modifier(MemoriaCardModifier())
    }

    public func memoriaPlumButton() -> some View {
        modifier(MemoriaPlumButtonModifier())
    }
}

