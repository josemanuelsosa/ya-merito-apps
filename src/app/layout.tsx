import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Toaster } from "@/ui/toast";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Ya Merito · Tarjeta de sellos en el celular", template: "%s · Ya Merito" },
  description:
    "La tarjeta de sellos de tu negocio en Apple Wallet y Google Wallet. Tus clientes la sacan con un QR, tú sellas desde el celular y ellos regresan.",
  applicationName: "Ya Merito",
  appleWebApp: { capable: true, title: "Ya Merito", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
