"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { UserName } from "~/lib/constants";
import { USERS, USER_TEXT_CLASS } from "~/lib/constants";

export function Nav() {
  const [currentUser, setCurrentUser] = useState<UserName>("Jake");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mpw_user") as UserName | null;
    if (stored && USERS.includes(stored)) setCurrentUser(stored);
  }, []);

  const switchUser = (name: UserName) => {
    setCurrentUser(name);
    localStorage.setItem("mpw_user", name);
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between bg-ink px-5 py-2.5">
      <Link href="/dashboard" className="font-display text-2xl leading-none tracking-wider text-cream sm:invisible">
        MY<span className="text-red">PRIDE</span>WONT
      </Link>
      <div className="flex items-center gap-4">
        {/* User picker */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-sm border-[1.5px] border-cream px-2.5 py-1 font-condensed text-xs font-bold uppercase tracking-[0.1em] text-cream"
          >
            {currentUser}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 rounded-sm border-2 border-cream bg-ink shadow-card">
              {USERS.map((name) => (
                <button
                  key={name}
                  onClick={() => switchUser(name)}
                  className={`block w-full px-4 py-2 text-left font-condensed text-sm font-bold uppercase tracking-wider ${
                    name === currentUser ? USER_TEXT_CLASS[name] : "text-cream"
                  } hover:bg-ink-light`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
