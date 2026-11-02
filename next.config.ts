import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp (imágenes) y passkit-generator (firma de pases) se cargan tal cual en el servidor
  serverExternalPackages: ["sharp", "passkit-generator"],
  experimental: {
    // Subida de logos (máx. 3 MB + margen del formulario)
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
        // El panel no debe mostrarse dentro de otros sitios
        source: "/panel/:path*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
