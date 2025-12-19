"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";

export const NAV_LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/expenses", label: "Expenses" },
  { href: "/app/accounts", label: "Accounts" },
  { href: "/app/investments", label: "Investments" },
  { href: "/app/goals", label: "Goals" },
  { href: "/app/loans", label: "Loans" },
  { href: "/app/receivables", label: "Receivables" },
  { href: "/app/tools/sharia-profit", label: "Sharia Profit" },
  { href: "/app/tools/fire", label: "FIRE" },
  { href: "/app/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/app" && pathname.startsWith(href));
}

export function AppNavLinks({ variant }: { variant: "mobile" | "desktop" }) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  return (
    <>
      {NAV_LINKS.map((item) => {
        const active = isActive(pathname, item.href);
        const base =
          variant === "mobile"
            ? "rounded-xl px-3 py-2 text-sm"
            : "rounded-xl px-3 py-2 text-sm";

        const activeClass =
          resolvedTheme === "dark"
            ? "font-semibold border border-white/30 text-white bg-transparent"
            : "text-slate-900 font-semibold bg-slate-100";
        const inactiveClass =
          resolvedTheme === "dark"
            ? "text-slate-300 font-medium hover:bg-white/5 hover:text-white"
            : "text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[base, active ? activeClass : inactiveClass].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
