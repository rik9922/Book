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
/// without simulating hundreds of cloth sheets. Caches static topology buffers
/// (UVs, front/back indices) and reuses scratch position/normal arrays per tick.
public final class PageDeformationController: @unchecked Sendable {
    public var parameters: PageDeformationParameters {
        didSet {
            if oldValue.subdivisionsX != parameters.subdivisionsX || oldValue.subdivisionsZ != parameters.subdivisionsZ {
                rebuildStaticTopologyCache()
            }
        }
    }

    private var cachedTopologyKey: (cols: Int, rows: Int) = (-1, -1)
    private var cachedUvsFront: [SIMD2<Float>] = []
    private var cachedUvsBack: [SIMD2<Float>] = []
    private var cachedFrontIndices: [UInt32] = []
    private var cachedBackIndices: [UInt32] = []
    private var scratchPositions: [SIMD3<Float>] = []
    private var scratchNormals: [SIMD3<Float>] = []

    public init(parameters: PageDeformationParameters = PageDeformationParameters()) {
        self.parameters = parameters
        rebuildStaticTopologyCache()
    }

    private func rebuildStaticTopologyCache() {
        let cols = parameters.subdivisionsX
        let rows = parameters.subdivisionsZ
        guard cachedTopologyKey.cols != cols || cachedTopologyKey.rows != rows else { return }

        let strideX = cols + 1
        let strideZ = rows + 1
        let vertexCount = strideX * strideZ

        var uvsFront = [SIMD2<Float>](repeating: .zero, count: vertexCount)
        var uvsBack = [SIMD2<Float>](repeating: .zero, count: vertexCount)

        for iz in 0...rows {
            let vNorm = Float(iz) / Float(rows)
            let vCoord = 1.0 - vNorm
            for ix in 0...cols {
                let uNorm = Float(ix) / Float(cols)
                let idx = iz * strideX + ix
                uvsFront[idx] = SIMD2<Float>(uNorm, vCoord)
                uvsBack[idx] = SIMD2<Float>(1.0 - uNorm, vCoord)
            }
        }

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

                frontIndices.append(contentsOf: [tl, bl, br, tl, br, tr])
                backIndices.append(contentsOf: [tl, br, bl, tl, tr, br])
            }
        }

        cachedTopologyKey = (cols, rows)
        cachedUvsFront = uvsFront
        cachedUvsBack = uvsBack
        cachedFrontIndices = frontIndices
        cachedBackIndices = backIndices
        scratchPositions = [SIMD3<Float>](repeating: .zero, count: vertexCount)
        scratchNormals = [SIMD3<Float>](repeating: SIMD3<Float>(0, 1, 0), count: vertexCount)
    }

    /// Computes deformed vertices, normals, UVs, and dual-sided triangle indices
    /// for a given normalized turn progress `t in [0, 1]`.
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
        rebuildStaticTopologyCache()

        let easedBase = BookAnimationContract.evaluateCubicBezierEaseInOut(t)
        let baseAngle = parameters.baseSpineAngleRadians
            + (parameters.targetOpenAngleRadians - parameters.baseSpineAngleRadians) * easedBase

        let archEnvelope = sin(Float.pi * t) * clampedCurl
        let dirSign: Float = turnDirection >= 0 ? 1.0 : -1.0
        let halfDepth = parameters.pageHeight * 0.5

        for iz in 0...rows {
            let vNorm = Float(iz) / Float(rows)
            let zPos = -halfDepth + vNorm * parameters.pageHeight
            let coneFactor = 0.85 + 0.30 * vNorm

            for ix in 0...cols {
                let uNorm = Float(ix) / Float(cols)
                let idx = iz * strideX + ix

                let bendLag = -dirSign * archEnvelope * 0.52 * pow(uNorm, 1.35) * coneFactor
                let localAngle = max(
                    parameters.baseSpineAngleRadians * 0.5,
                    min(parameters.targetOpenAngleRadians + 0.08, baseAngle + bendLag)
                )

                let radialDist = uNorm * parameters.pageWidth
                let normalAxis = SIMD3<Float>(-sin(localAngle), cos(localAngle), 0)
                let tangentAxis = SIMD3<Float>(cos(localAngle), sin(localAngle), 0)

                let liftHeight = archEnvelope * parameters.maxCurlHeight * sin(Float.pi * min(1.0, uNorm * 0.92)) * coneFactor
                let spineClearanceY: Float = 0.0005 + archEnvelope * 0.0025 * (1.0 - uNorm * 0.5)

                scratchPositions[idx] = tangentAxis * radialDist
                    + normalAxis * liftHeight
                    + SIMD3<Float>(0, spineClearanceY, zPos)
            }
        }

        for iz in 0...rows {
            for ix in 0...cols {
                let idx = iz * strideX + ix
                let leftIdx = iz * strideX + max(0, ix - 1)
                let rightIdx = iz * strideX + min(cols, ix + 1)
                let upIdx = max(0, iz - 1) * strideX + ix
                let downIdx = min(rows, iz + 1) * strideX + ix

                let dX = scratchPositions[rightIdx] - scratchPositions[leftIdx]
                let dZ = scratchPositions[downIdx] - scratchPositions[upIdx]
                let rawNormal = simd_cross(dZ, dX)
                let len = simd_length(rawNormal)
                scratchNormals[idx] = len > 1e-6 ? (rawNormal / len) : SIMD3<Float>(0, 1, 0)
            }
        }

        return DeformedPageGeometry(
            positions: scratchPositions,
            normals: scratchNormals,
            uvsFront: cachedUvsFront,
            uvsBack: cachedUvsBack,
            frontIndices: cachedFrontIndices,
            backIndices: cachedBackIndices,
            columns: cols,
            rows: rows
        )
    }

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
    private var backPositionsScratch: [SIMD3<Float>] = []
    private var backNormalsScratch: [SIMD3<Float>] = []

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

        let count = geom.positions.count
        if backPositionsScratch.count != count {
            backPositionsScratch = [SIMD3<Float>](repeating: .zero, count: count)
            backNormalsScratch = [SIMD3<Float>](repeating: .zero, count: count)
        }
        for i in 0..<count {
            let n = geom.normals[i]
            backPositionsScratch[i] = geom.positions[i] - n * 0.00015
            backNormalsScratch[i] = -n
        }

        var frontPart = MeshResource.Part(id: "FrontPage", materialIndex: 0)
        frontPart.positions = MeshBuffers.Positions(geom.positions)
        frontPart.normals = MeshBuffers.Normals(geom.normals)
        frontPart.textureCoordinates = MeshBuffers.TextureCoordinates(geom.uvsFront)
        frontPart.triangleIndices = MeshBuffers.TriangleIndices(geom.frontIndices)

        var backPart = MeshResource.Part(id: "BackPage", materialIndex: 1)
        backPart.positions = MeshBuffers.Positions(backPositionsScratch)
        backPart.normals = MeshBuffers.Normals(backNormalsScratch)
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
