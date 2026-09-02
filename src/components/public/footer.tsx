import type { PublicBranding } from "@/lib/public/branding";

export function PublicFooter({ branding }: { branding: PublicBranding }) {
  return (
    <footer
      className="border-t text-white mt-12"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm opacity-90">
        <p>{branding.displayName}</p>
        {branding.phone && <p className="mt-1">{branding.phone}</p>}
        {branding.email && <p className="mt-1">{branding.email}</p>}
        {branding.showPoweredBy && (
          <p className="mt-3 text-xs opacity-70">
            Powered by{" "}
            <span className="font-medium">Qabila Realtors</span>
          </p>
        )}
      </div>
    </footer>
  );
}
