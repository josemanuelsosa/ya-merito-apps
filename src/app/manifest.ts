import type { MetadataRoute } from "next";

/** Se instala como app desde el navegador (cajeros): abre directo en Sellar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ya Merito",
    short_name: "Ya Merito",
    description: "Sella las tarjetas de tus clientes desde el celular.",
    start_url: "/panel/sellar",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "es-MX",
    icons: [
      { src: "/brand/ya-merito-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/ya-merito-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/ya-merito-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Sellar", short_name: "Sellar", url: "/panel/sellar" },
      { name: "Clientes", short_name: "Clientes", url: "/panel/clientes" },
    ],
  };
}
