# 3D Interactive Digital Experience & Engine

An interactive, heavy 3D WebGL and full-stack web application designed for high-fidelity 3D model visualization, real-time shader dynamics, responsive UI/UX architecture, and enterprise-grade performance.

## 🚀 Architectural Foundations

- **Frontend & Full-Stack Core**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **3D & WebGL Engine**: Three.js, React Three Fiber (R3F), Drei, GLSL custom shaders, Leva
- **Styling, Design Systems & Motion**: Tailwind CSS v4, Framer Motion, Lucide Icons
- **State & Data Validation**: Zustand, Zod
- **Asset Pipeline**: glTF 2.0, Draco / Meshopt compression, PBR materials

## 🛠️ Project Scaffolding

```
├── .agents/skills/        # 3D, UI/UX, and architectural agent skills
├── public/
│   ├── models/            # 3D glTF/GLB models
│   ├── textures/          # Environment HDRs & PBR texture maps
│   └── fonts/             # Typography assets
├── src/
│   ├── app/               # Next.js App Router (pages, layout, globals.css)
│   ├── components/
│   │   ├── 3d/            # 3D Canvas, Shaders, R3F viewports
│   │   └── ui/            # UI components and design system tokens
│   ├── hooks/             # Custom React & 3D interaction hooks
│   ├── lib/               # Utility functions & 3D math
│   ├── store/             # Zustand application state
│   └── types/             # TypeScript interfaces and schemas
└── next.config.ts         # Transpilation & engine configurations
```

## 📦 Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```
