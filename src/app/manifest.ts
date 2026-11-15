import type { MetadataRoute } from "next";

// PWA: ana ekrana eklenince uygulama gibi (adres çubuğu olmadan) açılır.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Çalışma Planlayıcı",
    short_name: "Planlayıcı",
    description: "Kişisel ders çalışma planlayıcısı",
    lang: "tr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
