import Link from "next/link";
import type { PublicBranding } from "@/lib/public/branding";

export function PublicHeader({ branding }: { branding: PublicBranding }) {
  return (
    <header
      className="text-white"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/listings" className="font-bold text-lg">
          {branding.displayName}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/listings" className="hover:opacity-80">
            Listings
          </Link>
          {branding.website && (
            <a href={branding.website} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
              Website
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
