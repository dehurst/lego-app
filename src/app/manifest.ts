import type { MetadataRoute } from "next";

// The web app manifest tells the phone how to "install" Brick Drop:
// its name, icon, colors, and that it should open full-screen (standalone)
// instead of inside a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Brick Drop",
    short_name: "Brick Drop",
    description: "New LEGO set alerts for you and your friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#182138",
    theme_color: "#182138",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
