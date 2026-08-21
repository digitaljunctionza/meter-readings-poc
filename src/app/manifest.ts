import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meter Readings — Wayne's Fix & Finish",
    short_name: "Meter Readings",
    description: "Electricity & water meter tracking for Wayne's Fix & Finish",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0c1f3d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
