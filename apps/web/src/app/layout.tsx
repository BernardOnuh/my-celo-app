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
      <head>
        <meta
          name="talentapp:project_verification"
          content="3dbdf542ebf7c2dd14f4d7f6b731355bb5abc728b34cbd80ec8be41203770dba3d1aa381143b3497ad93f336a3ddeaf00f1c24c16251dbc0ef66d629a7217fa9"
        />
      </head>
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