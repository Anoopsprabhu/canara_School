import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter, Oswald } from "next/font/google";
import { count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { members } from "@/lib/schema";
import { can, ROLE_LABELS } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";
import NavLinks, { NavItem } from "@/components/NavLinks";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald" });

export const metadata: Metadata = {
  title: "Life Membership Portal — Canara High School Old Boys' Association",
  description: "Life member applications and fee receipts for Canara High School Old Boys' Association (R.), Mangaluru",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  let pending = 0;
  if (user && can(user.role, "member:approve")) {
    [{ pending }] = await db.select({ pending: count() }).from(members).where(eq(members.status, "pending"));
  }

  const nav: NavItem[] = user
    ? [
        { href: "/", label: "Dashboard" },
        ...(can(user.role, "member:create") ? [{ href: "/members/new", label: "New Member" }] : []),
        { href: "/members", label: "Members" },
        ...(can(user.role, "member:approve")
          ? [{ href: "/approvals", label: pending ? `Approvals (${pending})` : "Approvals" }]
          : []),
        ...(can(user.role, "reports:view") ? [{ href: "/reports", label: "Reports" }] : []),
        { href: "/forms", label: "Blank Forms" },
        ...(can(user.role, "users:manage") ? [{ href: "/admin/users", label: "User Access" }] : []),
        ...(can(user.role, "settings:manage") ? [{ href: "/admin/settings", label: "Settings" }] : []),
      ]
    : [];

  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {user && (
          <header className="sticky top-0 z-40 bg-brand-900 text-white print:hidden">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex items-center justify-between gap-4 py-3">
                <Link href="/" className="flex min-w-0 items-center gap-3.5">
                  <span className="shrink-0 rounded-md bg-white px-1.5 py-1 shadow-sm">
                    <Image src="/logo.jpg" alt="CHSOBA centenary logo" width={48} height={55} className="h-12 w-auto object-contain" priority unoptimized />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base leading-tight font-semibold tracking-tight">
                      <span className="sm:hidden">Canara Old Boys&apos;</span>
                      <span className="hidden sm:inline">Canara High School Old Boys&apos; Association</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-brand-200">
                      <span className="sm:hidden">Membership Portal</span>
                      <span className="hidden sm:inline">Life Membership Portal · Mangaluru</span>
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/account"
                    title="My account — change password"
                    className="flex items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-1.5 text-sm transition hover:bg-white/10 sm:pr-3"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-xs font-semibold uppercase">
                      {(user.name || user.username).charAt(0)}
                    </span>
                    <span className="hidden leading-tight sm:block">
                      <span className="block font-medium">{user.name || user.username}</span>
                      {user.name !== ROLE_LABELS[user.role] && (
                        <span className="block text-[11px] text-brand-200">{ROLE_LABELS[user.role]}</span>
                      )}
                    </span>
                  </Link>
                  <LogoutButton />
                </div>
              </div>
            </div>
            <div className="border-t border-white/10">
              <div className="mx-auto max-w-6xl px-4">
                <NavLinks items={nav} />
              </div>
            </div>
          </header>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:max-w-none print:p-0">{children}</main>
        {user && (
          <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400 print:hidden">
            <p>
              Canara High School Old Boys&apos; Association (R.) · A.S.R.P. Road, Dongerkery, Mangaluru – 575 003 ·
              canaraoldboys@gmail.com
            </p>
          </footer>
        )}
      </body>
    </html>
  );
}
