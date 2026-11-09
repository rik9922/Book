# Native iOS RealityKit 3D Architecture

## 1. RealityKit & SwiftUI Architecture
- **Target Framework**: SwiftUI + RealityKit (`RealityView`).
- **Scene Hierarchy**:
  - `BookRootEntity`: Master anchor.
  - `FrontCoverEntity`: Rigid board with hinge joint.
  - `SpineEntity`: Curved spline geometry.
  - `BackCoverEntity`: Rigid board with hinge joint.
  - `PageBlockEntity`: Paper block with edge texture.
  - `TurningPageEntity`: Mesh deformation or skeletal bone chain driven by user drag gestures.

## 2. Interaction & Gesture Integration
- **DragGesture**: Real-time page drag tracking in screen space projected onto the 3D book plane.
- **Spatial Audio**: Tactile paper rustle sound effect triggered during page turns using AVFoundation.
- **Haptic Feedback**: `UIImpactFeedbackGenerator(style: .light)` fires as page passes the 90° halfway threshold.

