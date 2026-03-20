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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-48 shrink-0 border-r-2 border-red bg-ink sm:block">
      <div className="px-5 py-4">
        <Link href="/dashboard" className="font-display text-2xl leading-none tracking-wider text-cream">
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
            <tab.Icon size={16} strokeWidth={2.5} {...ICON_STYLE} />
            {tab.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
