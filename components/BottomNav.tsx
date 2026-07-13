"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconToday, IconFoods, IconStats, IconSettings } from "./icons";

const items = [
  { href: "/", label: "Today", Icon: IconToday },
  { href: "/foods", label: "Foods", Icon: IconFoods },
  { href: "/stats", label: "Stats", Icon: IconStats },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={"nav-item" + (active ? " active" : "")}>
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
