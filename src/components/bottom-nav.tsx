"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", icon: "\u25A0" },
  { href: "/calendar", label: "Calendar", icon: "\u25A1" },
  { href: "/activities", label: "Log", icon: "\u2630" },
  { href: "/goals", label: "Goals", icon: "\u25B2" },
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
          <span className="text-xl">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
