import { Nav } from "~/components/nav";
import { BottomNav } from "~/components/bottom-nav";
import { Fab } from "~/components/fab";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="mx-auto max-w-[480px]">
        <Nav />
        {children}
        <div className="h-16 sm:h-0" /> {/* Bottom nav spacer */}
      </div>
      <Fab />
      <BottomNav />
    </div>
  );
}
