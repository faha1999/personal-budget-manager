import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppNavLinks } from "@/components/layout/AppNavLinks";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { isUnauthorizedError, requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

async function requireAuth() {
  const session = cookies().get("bm_session")?.value;
  if (!session) redirect("/auth/login?next=/app");

  try {
    await requireUser();
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/auth/login?next=/app");
    throw err;
  }
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="relative min-h-screen bg-app">
      {/* Premium top border glow */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500/60 via-emerald-500/50 to-pink-500/40" />

      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-black/5 bg-white/70 px-3 py-3 backdrop-blur sm:hidden">
          <Link href="/app" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <span className="text-base font-semibold text-slate-900">৳</span>
            </span>
            <span className="text-sm font-semibold text-slate-900">Budget Manager</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" showLabel={false} variant="ghost" />
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm">
                Menu
              </summary>
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/10">
                <nav className="flex flex-col p-2 space-y-1">
                  <AppNavLinks variant="mobile" />
                  <div className="px-2 pb-2 pt-1">
                    <ThemeToggle size="sm" fullWidth variant="secondary" />
                  </div>
                  <form action="/api/auth/logout" method="post" className="p-2">
                    <button className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      Log out
                    </button>
                  </form>
                </nav>
              </div>
            </details>
          </div>
        </header>

        <div className="grid gap-6 py-6 sm:grid-cols-[260px_1fr] sm:py-8">
          {/* Desktop sidebar */}
          <aside className="hidden sm:block">
            <div className="sticky top-6 rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <Link href="/app" className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  <span className="text-lg font-semibold text-slate-900">৳</span>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Budget Manager</p>
                  <p className="text-xs text-slate-600">Private • BDT (৳)</p>
                </div>
              </Link>

              <nav className="mt-5 flex flex-col gap-1">
                <AppNavLinks variant="desktop" />
              </nav>

              <div className="mt-5">
                <ThemeToggle fullWidth />
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-3 ring-1 ring-black/5">
                <p className="text-xs font-semibold text-slate-900">Tip</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Add expenses daily for the cleanest analytics. Your data stays private to your account.
                </p>
              </div>

              <form action="/api/auth/logout" method="post" className="mt-4">
                <button className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                  Log out
                </button>
              </form>
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0">{children}</main>
        </div>

        <footer className="border-t border-black/5 pb-8 pt-5 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Budget Manager</span>
            <a
              href="https://github.com/faha1999"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Build with ♥ by Faha 
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
