  // TODO: implement bottom navigation for mobile with icons and active states.

  "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowUpDown,
  Landmark,
  Target,
  Settings,
} from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const nav = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/expenses", label: "Expenses", icon: ArrowUpDown },
  { href: "/app/accounts", label: "Accounts", icon: Landmark },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgb(var(--border))] bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-4">
        <nav className="flex items-center justify-between py-2">
          {nav.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition",
                  active ? "text-[rgb(var(--brand))]" : "text-[rgb(var(--muted))]"
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
