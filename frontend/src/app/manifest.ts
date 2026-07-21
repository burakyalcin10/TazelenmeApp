import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tazelenme Üniversitesi — Akdeniz Üniversitesi",
    short_name: "Tazelenme",
    description:
      "Akdeniz Üniversitesi Tazelenme Üniversitesi öğrenci ve koordinatör bilgi sistemi.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FC",
    theme_color: "#1D366A",
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
