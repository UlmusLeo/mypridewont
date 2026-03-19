"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  const login = api.auth.login.useMutation({
    onSuccess: (data) => {
      // Set session cookie client-side (cookies() from next/headers doesn't work in tRPC handlers)
      document.cookie = `mpw_session=${data.token}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
      router.push("/dashboard");
    },
    onError: () => setError(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    login.mutate({ password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink font-body">
      {/* Diagonal stripes overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(196,52,45,0.04) 30px, rgba(196,52,45,0.04) 60px)",
        }}
      />
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E\")",
        }}
      />

      <form onSubmit={handleSubmit} className="relative z-10 w-80 text-center">
        <h1 className="mb-1 font-display text-[3.5rem] leading-none tracking-wider text-cream">
          MY<span className="text-red">PRIDE</span>WONT
        </h1>
        <div className="mb-10" />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mb-4 w-full rounded-sm border-2 border-ink-faint bg-transparent px-4 py-3 text-center text-cream tracking-[0.15em] placeholder:text-ink-faint placeholder:text-sm placeholder:tracking-widest focus:border-red focus:outline-none"
        />

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-sm border-2 border-cream bg-red px-4 py-2.5 font-display text-xl tracking-[0.12em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)]"
        >
          GET IN ME
        </button>

        {error && (
          <p className="mt-4 font-condensed text-xs font-semibold uppercase tracking-wider text-red">
            Wrong password. Try again.
          </p>
        )}
      </form>
    </div>
  );
}
