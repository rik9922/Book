// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Memoria",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "Memoria",
            targets: ["Memoria"]
        ),
    ],
    targets: [
        .target(
            name: "Memoria",
            path: "Sources/Memoria"
        ),
        .testTarget(
            name: "MemoriaTests",
            dependencies: ["Memoria"],
            path: "Tests/MemoriaTests"
        ),
    ]
)
