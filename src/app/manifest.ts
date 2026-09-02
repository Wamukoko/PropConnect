import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PropConnect",
    short_name: "PropConnect",
    description: "WhatsApp-first real estate lead-to-viewing platform",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    orientation: "portrait-primary",
    background_color: "#101B30",
    theme_color: "#101B30",
    categories: ["business", "productivity", "lifestyle"],
    icons: [
      { src: "/brand/propconnect-icon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/brand/propconnect-icon-64.png", sizes: "64x64", type: "image/png" },
      { src: "/brand/propconnect-icon-180.png", sizes: "180x180", type: "image/png" },
      { src: "/brand/propconnect-icon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/brand/propconnect-icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/propconnect-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/brand/propconnect-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/propconnect-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
