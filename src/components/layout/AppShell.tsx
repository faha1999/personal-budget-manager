  // TODO: compose responsive layout with sidebar/topbar and content area.

  "use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 py-5">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <Sidebar />
          </aside>

          {/* Main */}
          <main className="min-w-0">
            <Topbar />

            <div className="mt-4 pb-24 lg:pb-6">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
