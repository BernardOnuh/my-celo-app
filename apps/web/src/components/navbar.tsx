"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/predict", label: "Predict & Earn" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg mr-6">
          <span className="text-primary">●</span>
          my-celo-app
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Wallet address badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs font-mono text-muted-foreground bg-muted/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span id="wallet-display">Not connected</span>
        </div>
      </div>
    </nav>
  );
}
