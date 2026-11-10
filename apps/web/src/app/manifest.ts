import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Memoria",
    short_name: "Memoria",
    description: "A personal and family memory preservation and publishing platform.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#76556F",
    background_color: "#F7F4EE",
    icons: [
      {
        src: "/branding/memoria-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/memoria-app-icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/branding/memoria-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/memoria-app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/branding/memoria-app-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
