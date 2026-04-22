import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tazelenme Üniversitesi",
    short_name: "Tazelenme",
    description:
      "Tazelenme Üniversitesi öğrenci ve koordinatör bilgi sistemi.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#00694C",
    orientation: "portrait",
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
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
