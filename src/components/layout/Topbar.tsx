  // TODO: add breadcrumbs, user menu, and quick actions.

  "use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

function titleFromPath(path: string) {
  if (path === "/app") return "Dashboard";
  if (path.startsWith("/app/expenses/new")) return "Quick Add";
  if (path.startsWith("/app/expenses")) return "Expenses";
  if (path.startsWith("/app/accounts")) return "Accounts";
  if (path.startsWith("/app/investments")) return "Investments";
  if (path.startsWith("/app/goals")) return "Goals";
  if (path.startsWith("/app/loans")) return "Loans";
  if (path.startsWith("/app/receivables")) return "Receivables";
  if (path.startsWith("/app/tools/sharia-profit")) return "Sharia Profit Sharing";
  if (path.startsWith("/app/tools/fire")) return "FIRE Calculator";
  if (path.startsWith("/app/settings")) return "Settings";
  return "Budget Manager";
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();

  const title = React.useMemo(() => titleFromPath(pathname), [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  return (
    <div className="card px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm subtle truncate">
          {search.get("start") || search.get("end")
            ? `Period: ${search.get("start") || "…"} → ${search.get("end") || "…"}`
            : "Clean, private, and personal finance tracking."}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle size="sm" showLabel={false} variant="ghost" />
        <Button
          variant="secondary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={() => router.push("/app/expenses/new")}
        >
          Quick Add
        </Button>

        <Button variant="ghost" size="md" leftIcon={<LogOut size={16} />} onClick={logout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
