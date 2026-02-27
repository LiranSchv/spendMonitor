import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marketing Spend Monitor",
  description: "Monitor and forecast marketing spend across channels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <span className="font-bold text-lg text-blue-600">SpendMonitor</span>
                <div className="flex gap-6">
                  <Link href="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/forecast" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                    Forecast
                  </Link>
                  <Link href="/compare" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                    Compare
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
