"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", icon: "■" },
  { href: "/calendar", label: "Calendar", icon: "□" },
  { href: "/activities", label: "Log", icon: "☰" },
  { href: "/goals", label: "Goals", icon: "▲" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-48 shrink-0 border-r-2 border-red bg-ink sm:block">
      <div className="px-5 py-4">
        <Link
          href="/dashboard"
          className="font-display text-2xl leading-none tracking-wider text-cream"
        >
          MY<span className="text-red">PRIDE</span>WONT
        </Link>
      </div>
      <nav className="mt-4 flex flex-col gap-1 px-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-3 rounded-sm px-3 py-2.5 font-condensed text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
              pathname.startsWith(tab.href)
                ? "bg-cream/10 text-cream"
                : "text-cream/50 hover:bg-cream/5 hover:text-cream/70"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
