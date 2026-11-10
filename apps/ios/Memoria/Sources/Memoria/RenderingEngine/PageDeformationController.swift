import Foundation
import simd

#if canImport(RealityKit) && os(iOS)
import RealityKit
#endif

public struct PageDeformationParameters: Sendable, Equatable {
    public let pageWidth: Float
    public let pageHeight: Float
    public let subdivisionsX: Int
    public let subdivisionsZ: Int
    public let maxCurlHeight: Float
    public let baseSpineAngleRadians: Float
    public let targetOpenAngleRadians: Float

    public init(
        pageWidth: Float = Book3DDimensions.bookWidth - 0.010,
        pageHeight: Float = Book3DDimensions.bookHeight - 0.012,
        subdivisionsX: Int = 12,
        subdivisionsZ: Int = 4,
        maxCurlHeight: Float = 0.022,
        baseSpineAngleRadians: Float = 0.015,
        targetOpenAngleRadians: Float = 2.72
    ) {
        self.pageWidth = pageWidth
        self.pageHeight = pageHeight
        self.subdivisionsX = max(2, subdivisionsX)
        self.subdivisionsZ = max(1, subdivisionsZ)
        self.maxCurlHeight = maxCurlHeight
        self.baseSpineAngleRadians = baseSpineAngleRadians
        self.targetOpenAngleRadians = targetOpenAngleRadians
    }
}

public struct DeformedPageGeometry: Sendable {
    public let positions: [SIMD3<Float>]
    public let normals: [SIMD3<Float>]
    public let uvsFront: [SIMD2<Float>]
    public let uvsBack: [SIMD2<Float>]
    public let frontIndices: [UInt32]
    public let backIndices: [UInt32]
    public let columns: Int
    public let rows: Int

    public var vertexCountPerSide: Int { positions.count }
    public var triangleCountPerSide: Int { frontIndices.count / 3 }
}

/// Computes physically coherent conical/cylindrical page-turn vertex deformation
/// without simulating hundreds of cloth sheets. Only the single active turning leaf
/// is deformed; stationary pages remain static stacks.
public final class PageDeformationController: @unchecked Sendable {
    public var parameters: PageDeformationParameters

    public init(parameters: PageDeformationParameters = PageDeformationParameters()) {
        self.parameters = parameters
    }

    /// Computes deformed vertices, normals, UVs, and dual-sided triangle indices
    /// for a given normalized turn progress `t in [0, 1]`:
    /// - `t = 0`: sheet rests cleanly on `RightPageStack`
    /// - `t = 1`: sheet settles cleanly onto `LeftPageStack`
    public func evaluateGeometry(
        turnProgress rawProgress: Float,
        curlIntensity: Float = 1.0,
        turnDirection: Float = 1.0
    ) -> DeformedPageGeometry {
        let t = BookAnimationContract.clamp01(rawProgress)
        let clampedCurl = BookAnimationContract.clamp01(curlIntensity)
        let cols = parameters.subdivisionsX
        let rows = parameters.subdivisionsZ
        let strideX = cols + 1
        let strideZ = rows + 1
        let vertexCount = strideX * strideZ

        var positions = [SIMD3<Float>](repeating: .zero, count: vertexCount)
        var normals = [SIMD3<Float>](repeating: SIMD3<Float>(0, 1, 0), count: vertexCount)
        var uvsFront = [SIMD2<Float>](repeating: .zero, count: vertexCount)
        var uvsBack = [SIMD2<Float>](repeating: .zero, count: vertexCount)

        let easedBase = BookAnimationContract.evaluateCubicBezierEaseInOut(t)
        let baseAngle = parameters.baseSpineAngleRadians
            + (parameters.targetOpenAngleRadians - parameters.baseSpineAngleRadians) * easedBase

        // Mid-turn sinusoidal envelope drives natural conical curl and lift above the spine gutter
        let archEnvelope = sin(Float.pi * t) * clampedCurl
        let dirSign: Float = turnDirection >= 0 ? 1.0 : -1.0
        let halfDepth = parameters.pageHeight * 0.5

        for iz in 0...rows {
            let vNorm = Float(iz) / Float(rows) // 0 at -Z (top edge), 1 at +Z (bottom edge)
            let zPos = -halfDepth + vNorm * parameters.pageHeight
            let vCoord = 1.0 - vNorm // UV v=1 at top (-Z), v=0 at bottom (+Z)

            // Conical variation: bottom outer corner leads/lags slightly more than top edge
            let coneFactor = 0.85 + 0.30 * vNorm

            for ix in 0...cols {
                let uNorm = Float(ix) / Float(cols) // 0 at spine, 1 at fore-edge
                let idx = iz * strideX + ix

                // Spine-pinned radial sweep + progressive outer-edge bend lag
                // Positive lag keeps trailing edge gracefully curved behind the spine angle
                let bendLag = -dirSign * archEnvelope * 0.52 * pow(uNorm, 1.35) * coneFactor
                let localAngle = max(
                    parameters.baseSpineAngleRadians * 0.5,
                    min(parameters.targetOpenAngleRadians + 0.08, baseAngle + bendLag)
                )

                let radialDist = uNorm * parameters.pageWidth
                let normalAxis = SIMD3<Float>(-sin(localAngle), cos(localAngle), 0)
                let tangentAxis = SIMD3<Float>(cos(localAngle), sin(localAngle), 0)

                // Parabolic lift normal to the sheet keeps the turning page strictly above both page stacks
                let liftHeight = archEnvelope * parameters.maxCurlHeight * sin(Float.pi * min(1.0, uNorm * 0.92)) * coneFactor
                let spineClearanceY: Float = 0.0005 + archEnvelope * 0.0025 * (1.0 - uNorm * 0.5)

                let point = tangentAxis * radialDist
                    + normalAxis * liftHeight
                    + SIMD3<Float>(0, spineClearanceY, zPos)

                positions[idx] = point
                uvsFront[idx] = SIMD2<Float>(uNorm, vCoord)
                uvsBack[idx] = SIMD2<Float>(1.0 - uNorm, vCoord)
            }
        }

        // Compute smooth vertex normals from finite differences across the deformed grid
        for iz in 0...rows {
            for ix in 0...cols {
                let idx = iz * strideX + ix
                let leftIdx = iz * strideX + max(0, ix - 1)
                let rightIdx = iz * strideX + min(cols, ix + 1)
                let upIdx = max(0, iz - 1) * strideX + ix
                let downIdx = min(rows, iz + 1) * strideX + ix

                let dX = positions[rightIdx] - positions[leftIdx]
                let dZ = positions[downIdx] - positions[upIdx]
                // dZ points +Z, dX points along sheet +u; dZ x dX points along +normal (upward at t=0)
                let rawNormal = simd_cross(dZ, dX)
                let len = simd_length(rawNormal)
                normals[idx] = len > 1e-6 ? (rawNormal / len) : SIMD3<Float>(0, 1, 0)
            }
        }

        // Build front (+normal, CCW looking from +Y at t=0) and back (-normal, CCW looking from -Y)
        var frontIndices: [UInt32] = []
        var backIndices: [UInt32] = []
        frontIndices.reserveCapacity(cols * rows * 6)
        backIndices.reserveCapacity(cols * rows * 6)

        for iz in 0..<rows {
            for ix in 0..<cols {
                let tl = UInt32(iz * strideX + ix)
                let tr = UInt32(iz * strideX + ix + 1)
                let bl = UInt32((iz + 1) * strideX + ix)
                let br = UInt32((iz + 1) * strideX + ix + 1)

                // Front face (+normal)
                frontIndices.append(contentsOf: [tl, bl, br, tl, br, tr])
                // Back face (-normal, reversed winding)
                backIndices.append(contentsOf: [tl, br, bl, tl, tr, br])
            }
        }

        return DeformedPageGeometry(
            positions: positions,
            normals: normals,
            uvsFront: uvsFront,
            uvsBack: uvsBack,
            frontIndices: frontIndices,
            backIndices: backIndices,
            columns: cols,
            rows: rows
        )
    }

    /// Verifies that no vertex in the deformed sheet intersects below the flat page-stack plane (`y >= minSafeY`).
    public func minimumElevationY(for geometry: DeformedPageGeometry) -> Float {
        geometry.positions.map(\.y).min() ?? 0
    }
}

#if canImport(RealityKit) && os(iOS)
@MainActor
public final class RealityKitDeformablePageMesh {
    public let controller: PageDeformationController
    public let entity: ModelEntity
    private var meshResource: MeshResource?
    private var lastAppliedSubdivisions: (x: Int, z: Int)?

    public init(controller: PageDeformationController = PageDeformationController()) {
        self.controller = controller
        self.entity = ModelEntity()
        self.entity.name = Book3DHierarchy.activeTurningPage
    }

    public func updateGeometry(
        turnProgress: Float,
        curlIntensity: Float,
        turnDirection: Float,
        frontMaterial: RealityKit.Material,
        backMaterial: RealityKit.Material
    ) {
        let geom = controller.evaluateGeometry(
            turnProgress: turnProgress,
            curlIntensity: curlIntensity,
            turnDirection: turnDirection
        )

        // Build distinct front (material 0) and back (material 1) vertex parts so each
        // side uploads only N vertices (instead of 2N per part) with outward normals and un-mirrored UVs.
        let backPositions = geom.positions.enumerated().map { idx, pos in
            // Tiny 0.15 mm paper sheet thickness offset along normal to prevent z-fighting
            pos - geom.normals[idx] * 0.00015
        }
        let backNormals = geom.normals.map { -$0 }

        var frontPart = MeshResource.Part(id: "FrontPage", materialIndex: 0)
        frontPart.positions = MeshBuffers.Positions(geom.positions)
        frontPart.normals = MeshBuffers.Normals(geom.normals)
        frontPart.textureCoordinates = MeshBuffers.TextureCoordinates(geom.uvsFront)
        frontPart.triangleIndices = MeshBuffers.TriangleIndices(geom.frontIndices)

        var backPart = MeshResource.Part(id: "BackPage", materialIndex: 1)
        backPart.positions = MeshBuffers.Positions(backPositions)
        backPart.normals = MeshBuffers.Normals(backNormals)
        backPart.textureCoordinates = MeshBuffers.TextureCoordinates(geom.uvsBack)
        backPart.triangleIndices = MeshBuffers.TriangleIndices(geom.backIndices)

        var contents = MeshResource.Contents()
        let model = MeshResource.Model(id: "ActiveTurningPageModel", parts: [frontPart, backPart])
        contents.models = [model]

        let currentSub = (geom.columns, geom.rows)
        if let existing = meshResource,
           let lastSub = lastAppliedSubdivisions,
           lastSub.x == currentSub.0 && lastSub.z == currentSub.1 {
            try? existing.replace(with: contents)
            entity.model?.materials = [frontMaterial, backMaterial]
        } else if let generated = try? MeshResource.generate(from: contents) {
            meshResource = generated
            lastAppliedSubdivisions = currentSub
            entity.model = ModelComponent(mesh: generated, materials: [frontMaterial, backMaterial])
        }
    }
}
#endif
