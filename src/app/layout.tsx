import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QC IFP Hisense 75WM61FE", template: "%s | QC IFP" },
  description: "Aplikasi inspeksi Quality Control Interactive Flat Panel Hisense 75WM61FE",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
