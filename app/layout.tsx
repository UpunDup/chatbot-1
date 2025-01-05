import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className={inter.variable}>
      <body className="bg-gray-50 font-sans antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
