# Web 3D Rendering & WebGL Optimization

## 1. Stack Architecture
- **Engine**: Three.js (`0.187.0`), React Three Fiber (`9.8.2`), `@react-three/drei` (`10.7.9`).
- **Post-processing**: Subtle contact shadows, screen-space ambient occlusion (SSAO), and tone mapping for heirloom paper warmth.
- **Controls**: Smooth orbital damping, responsive constraints limiting viewing angles to realistic reading perspectives.

## 2. Dynamic Page Curl Vertex Shader
Pages curl along a moving conical deformation axis using custom GLSL shaders:
- Dynamic front/back texture coordinate interpolation.
- Backside material rendering (subtle translucent light bleed).
- Natural easing with inertia simulation on touch and mouse release.

## 3. VRAM Lifecycle Management
- Target: Under 120 MB total VRAM consumption across desktop and mobile browsers.
- Only $N-1, N, N+1$ spreads maintain high-resolution (2048px) WebGL textures.
- Automated cleanup via `useEffect` dispose triggers when unmounting 3D views.
