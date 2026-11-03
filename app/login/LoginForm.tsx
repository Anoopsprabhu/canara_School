"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      return;
    }
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  }

  return (
    <div className="relative -mx-4 -my-8 flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[42vh] bg-brand-900" />
      <div className="relative w-full max-w-100">
        <div className="card overflow-hidden shadow-xl shadow-slate-900/10">
          <div className="px-8 pt-8 pb-9 sm:px-10">
            <div className="text-center">
              <Image
                src="/logo.jpg"
                alt="Canara High School Old Boys' Association centenary logo"
                width={150}
                height={170}
                priority
                unoptimized
                className="mx-auto h-32 w-auto object-contain"
              />
              <h1 className="mt-4 text-lg leading-snug font-semibold text-slate-900">
                Canara High School Old Boys&apos; Association (R.)
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">Life Membership Portal</p>
            </div>

            {error && <div className="alert-error mt-5">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="label">Username</span>
                <input
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input h-11"
                />
              </label>
              <label className="block">
                <span className="label">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input h-11"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-primary h-11 w-full">
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          A.S.R.P. Road, Dongerkery, Mangaluru – 575 003
          <br />
          canaraoldboys@gmail.com
        </p>
      </div>
    </div>
  );
}

