"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ClipboardList, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ICON_STYLE } from "~/components/activity-icons";

const tabs: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/activities", label: "Log", Icon: ClipboardList },
  { href: "/goals", label: "Goals", Icon: Target },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t-2 border-red bg-ink pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-2 sm:hidden">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex flex-col items-center gap-0.5 font-condensed text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${
            pathname.startsWith(tab.href) ? "text-cream" : "text-cream/50"
          }`}
        >
          <tab.Icon size={20} strokeWidth={2.5} {...ICON_STYLE} />
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
