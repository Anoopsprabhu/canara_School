"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export default function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // On a phone the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  // Longest matching href wins, so /members/new highlights "New Member"
  // rather than "Members".
  const best = items
    .filter((i) => pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav ref={navRef} className="-mx-2 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
      {items.map((item) => {
        const active = item.href === (best?.href ?? "/__none__");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-white text-brand-900 shadow-sm" : "text-brand-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
