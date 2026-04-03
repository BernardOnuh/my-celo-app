import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { WalletProvider } from "@/components/wallet-provider";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'my-celo-app',
  description: 'A new Celo blockchain project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="relative flex min-h-screen flex-col">
            <WalletProvider>
              <main className="flex-1">
                {children}
              </main>
            </WalletProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}