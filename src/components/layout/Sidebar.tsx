  // TODO: implement navigation links, collapsible behavior, and active state styles.

  "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowUpDown,
  Landmark,
  LineChart,
  Target,
  HandCoins,
  Calculator,
  Settings,
  Flame,
} from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/expenses", label: "Expenses", icon: ArrowUpDown },
  { href: "/app/accounts", label: "Accounts", icon: Landmark },
  { href: "/app/investments", label: "Investments", icon: LineChart },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/loans", label: "Loans", icon: HandCoins },
  { href: "/app/receivables", label: "Receivables", icon: HandCoins },
  { href: "/app/tools/compound-interest", label: "Compound", icon: Calculator },
  { href: "/app/tools/fire", label: "FIRE", icon: Flame },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="card p-4 sticky top-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Budget Manager</div>
          <div className="text-xs subtle">Bangladesh · Personal Finance</div>
        </div>
        <div className="h-9 w-9 rounded-xl bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
          <span className="text-sm font-bold text-[rgb(var(--brand))]">৳</span>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-[rgba(99,102,241,0.14)] text-[rgb(var(--ink))] font-semibold"
                  : "hover:bg-[rgba(15,23,42,0.04)] text-[rgb(var(--muted))] font-medium"
              )}
            >
              <Icon size={18} className={active ? "text-[rgb(var(--brand))]" : ""} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-[rgb(var(--border))] bg-white p-4">
        <div className="text-sm font-semibold">Tip</div>
        <div className="mt-1 text-xs subtle">
          Track daily expenses in under 15 seconds using “Quick Add”.
        </div>
      </div>
    </div>
  );
}
